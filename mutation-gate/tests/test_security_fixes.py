"""Security-fix regressions MG-01..MG-05 (v0.5 MVP hardening)."""

from __future__ import annotations

import os
import sys
import tempfile
import threading
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mutation_gate import Proposal, sha256_hex
from test_mutation_gate import Harness


class SecurityFixMG01(unittest.TestCase):
    """MG-01: symlink / reparse-point path escape protection."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.h = Harness(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def _can_symlink(self) -> bool:
        probe = os.path.join(self._tmp.name, "probe_link")
        try:
            os.symlink(os.path.join(self._tmp.name, "probe_dir"), probe)
            os.remove(probe)
            return True
        except (OSError, NotImplementedError):
            return False

    def test_file_symlink_outside_root_rejected(self):
        if not self._can_symlink():
            self.skipTest("symlink creation unavailable on this host")
        outside = os.path.join(self._tmp.name, "outside")
        os.makedirs(outside, exist_ok=True)
        outside_file = os.path.join(outside, "evil.md")
        with open(outside_file, "wb") as fh:
            fh.write(b"outside content\n")
        root = self.h.executor.vault_root
        os.makedirs(os.path.join(root, "CASES"), exist_ok=True)
        os.symlink(outside_file, os.path.join(root, "CASES", "A.md"))

        proposal = Proposal(
            "p-esc1", "agent-x", "CASES/A.md", "APPEND_EXISTING_NOTE",
            b"\nX\n", sha256_hex(b"outside content\n"), "",
        )
        proposal = Proposal(
            proposal.proposal_id, proposal.actor, proposal.target,
            proposal.operation, proposal.payload, proposal.base_sha256,
            proposal.compute_digest(),
        )
        permit = self.h.make_permit(proposal)
        result = self.h.executor.execute(proposal, permit)
        self.assertEqual(result.status, "REJECTED")
        self.assertIn("symlink/reparse point", result.reason)
        # the OUTSIDE file was never touched
        with open(outside_file, "rb") as fh:
            self.assertEqual(fh.read(), b"outside content\n")

    def test_parent_directory_symlink_escape_rejected(self):
        if not self._can_symlink():
            self.skipTest("symlink creation unavailable on this host")
        outside_dir = os.path.join(self._tmp.name, "outside_dir")
        os.makedirs(os.path.join(outside_dir, "CASES"), exist_ok=True)
        with open(os.path.join(outside_dir, "CASES", "A.md"), "wb") as fh:
            fh.write(b"---\ntype: case\n---\n\noriginal body\n")
        root = self.h.executor.vault_root
        os.symlink(outside_dir, os.path.join(root, "linked_cases"))

        with open(os.path.join(outside_dir, "CASES", "A.md"), "rb") as fh:
            base = fh.read()
        proposal = Proposal(
            "p-esc2", "agent-x", "linked_cases/CASES/A.md", "APPEND_EXISTING_NOTE",
            b"\nX\n", sha256_hex(base), "",
        )
        proposal = Proposal(
            proposal.proposal_id, proposal.actor, proposal.target,
            proposal.operation, proposal.payload, proposal.base_sha256,
            proposal.compute_digest(),
        )
        permit = self.h.make_permit(proposal)
        result = self.h.executor.execute(proposal, permit)
        self.assertEqual(result.status, "REJECTED")
        self.assertIn("symlink/reparse point", result.reason)
        # outside tree untouched
        with open(os.path.join(outside_dir, "CASES", "A.md"), "rb") as fh:
            self.assertEqual(fh.read(), base)


class SecurityFixMG02(unittest.TestCase):
    """MG-02: concurrent duplicate permit — one append maximum."""

    def test_two_threads_same_permit_only_one_append(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = Harness(tmp)
            base = b"---\ntype: case\n---\n\noriginal body\n"
            payload = b"\nCONCURRENT APPEND\n"
            proposal = h.make_proposal(payload=payload, base_bytes=base)
            permit = h.make_permit(proposal)
            results = []
            errors = []

            def run():
                try:
                    results.append(h.executor.execute(proposal, permit))
                except Exception as exc:  # pragma: no cover
                    errors.append(exc)

            t1 = threading.Thread(target=run)
            t2 = threading.Thread(target=run)
            t1.start()
            t2.start()
            t1.join()
            t2.join()
            self.assertEqual(errors, [])
            statuses = sorted(r.status for r in results)
            self.assertEqual(statuses, ["APPLIED", "REJECTED"])
            reasons = " | ".join(r.reason or "" for r in results)
            self.assertIn("duplicate permit execution", reasons)
            # exactly ONE append: file == base + payload (not twice)
            self.assertEqual(h.read_note("CASES/A.md"), base + payload)
            self.assertEqual(len(h.audit.records()), 2)


class SecurityFixMG03(unittest.TestCase):
    """MG-03: approved payload bytes are an immutable snapshot."""

    def test_mutating_original_buffer_after_approval_does_not_change_execution(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = Harness(tmp)
            base = b"---\ntype: case\n---\n\noriginal body\n"
            h.write_note("CASES/A.md", base)
            mutable = bytearray(b"\nAPPROVED PAYLOAD\n")
            proposal = Proposal(
                "p-003", "agent-x", "CASES/A.md", "APPEND_EXISTING_NOTE",
                mutable, sha256_hex(base), "",
            )
            proposal = Proposal(
                proposal.proposal_id, proposal.actor, proposal.target,
                proposal.operation, proposal.payload, proposal.base_sha256,
                proposal.compute_digest(),
            )
            permit = h.make_permit(proposal)
            # caller mutates its buffer AFTER approval
            mutable += b"TAMPERED"
            self.assertIsInstance(proposal.payload, bytes)  # immutable snapshot
            result = h.executor.execute(proposal, permit)
            self.assertEqual(result.status, "APPLIED")
            # executed bytes == approved snapshot, not the mutated buffer
            self.assertEqual(h.read_note("CASES/A.md"), base + b"\nAPPROVED PAYLOAD\n")


class SecurityFixMG04(unittest.TestCase):
    """MG-04: post-write failure is EXECUTION_UNCERTAIN, not a plain
    rejection; the permit is then blocked from unsafe retry."""

    def test_post_write_failure_is_uncertain_and_blocks_retry(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = Harness(tmp)
            base = b"---\ntype: case\n---\n\noriginal body\n"
            proposal = h.make_proposal(payload=b"\nPAYLOAD\n", base_bytes=base)
            permit = h.make_permit(proposal)
            with mock.patch(
                "mutation_gate.executor.os.fsync",
                side_effect=OSError("disk transient"),
            ):
                result = h.executor.execute(proposal, permit)
            self.assertEqual(result.status, "EXECUTION_UNCERTAIN")
            self.assertIn("io error", result.reason)
            record = h.audit.records()[-1]
            self.assertTrue(str(record["result"]).startswith("EXECUTION_UNCERTAIN"))
            # retry the same permit after the transient failure → blocked
            retry = h.executor.execute(proposal, permit)
            self.assertEqual(retry.status, "REJECTED")
            self.assertIn("duplicate permit execution", retry.reason)
            # file content is exactly one append (fsync failed AFTER the
            # write), and audit kept evidence for both runs
            self.assertEqual(h.read_note("CASES/A.md"), base + b"\nPAYLOAD\n")
            self.assertEqual(len(h.audit.records()), 2)
            self.assertTrue(h.audit.verify_chain())


class SecurityFixMG05(unittest.TestCase):
    """MG-05: empty payload rejected; whitespace preserved exactly."""

    def test_empty_payload_rejected_before_execution(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = Harness(tmp)
            base = b"---\ntype: case\n---\n\noriginal body\n"
            proposal = h.make_proposal(payload=b"", base_bytes=base)
            permit = h.make_permit(proposal)
            result = h.executor.execute(proposal, permit)
            self.assertEqual(result.status, "REJECTED")
            self.assertIn("empty mutation payload", result.reason)
            self.assertEqual(h.read_note("CASES/A.md"), base)  # unchanged

    def test_whitespace_only_payload_is_preserved_exactly(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = Harness(tmp)
            base = b"---\ntype: case\n---\n\noriginal body\n"
            ws = b" \n\t\n"
            proposal = h.make_proposal(payload=ws, base_bytes=base)
            permit = h.make_permit(proposal)
            result = h.executor.execute(proposal, permit)
            self.assertEqual(result.status, "APPLIED")
            self.assertEqual(h.read_note("CASES/A.md"), base + ws)  # no trim


if __name__ == "__main__":
    unittest.main()

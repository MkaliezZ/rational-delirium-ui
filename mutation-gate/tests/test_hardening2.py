"""Security-hardening-2 regressions: MG-01 (parent replacement race),
MG-02 (cross-executor shared permit lock), MG-06 (audit executor
identity)."""

from __future__ import annotations

import os
import sys
import tempfile
import threading
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mutation_gate import AuditLog, Executor, sha256_hex
from test_mutation_gate import Harness


class Hardening2Base(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.h = Harness(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def _proposal_for(self, content: bytes, payload: bytes = b"\nX\n"):
        from mutation_gate import Proposal

        path = os.path.join(self.h.executor.vault_root, "CASES", "A.md")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(content)
        raw = Proposal(
            "p-h2", "agent-x", "CASES/A.md", "APPEND_EXISTING_NOTE",
            payload, sha256_hex(content), "",
        )
        return Proposal(
            raw.proposal_id, raw.actor, raw.target, raw.operation,
            raw.payload, raw.base_sha256, raw.compute_digest(),
        )


class MG01ParentReplacementRace(Hardening2Base):
    """MG-01: swap the validated parent directory for a symlink AT THE
    MOMENT OF OPEN (between chain validation and the open call). The
    identity sandwich must reject, and the outside file must remain
    unchanged."""

    def _can_symlink(self) -> bool:
        probe = os.path.join(self._tmp.name, "probe")
        try:
            os.symlink(self._tmp.name, probe)
            os.remove(probe)
            return True
        except (OSError, NotImplementedError):
            return False

    def test_parent_replaced_by_symlink_during_open_rejected(self):
        if not self._can_symlink():
            self.skipTest("symlink creation unavailable on this host")
        outside_dir = os.path.join(self._tmp.name, "outside")
        os.makedirs(os.path.join(outside_dir, "CASES"), exist_ok=True)
        outside_file = os.path.join(outside_dir, "CASES", "A.md")
        outside_content = b"OUTSIDE CONTENT\n"
        with open(outside_file, "wb") as fh:
            fh.write(outside_content)

        base = b"---\ntype: case\n---\n\noriginal body\n"
        proposal = self._proposal_for(base)
        permit = self.h.make_permit(proposal)

        root = self.h.executor.vault_root
        cases_dir = os.path.join(root, "CASES")
        real_open = os.open

        def swap_then_open(path, flags, *args, **kwargs):
            # attacker races: validated CASES is swapped for a symlink
            # to the outside tree just before the file is opened
            if os.fspath(path).endswith("A.md"):
                os.rename(cases_dir, cases_dir + ".stolen")
                os.symlink(os.path.join(outside_dir, "CASES"), cases_dir)
            return real_open(path, flags, *args, **kwargs)

        with mock.patch("mutation_gate.executor.os.open", side_effect=swap_then_open):
            result = self.h.executor.execute(proposal, permit)

        self.assertEqual(result.status, "REJECTED")
        reasons = " | ".join(r["result"] for r in self.h.audit.records())
        self.assertTrue(
            "symlink/reparse point" in result.reason
            or "identity changed" in result.reason
            or "bind mismatch" in result.reason,
            msg=f"unexpected reason: {result.reason}; audit: {reasons}",
        )
        # the OUTSIDE file is unchanged; nothing was appended anywhere
        with open(outside_file, "rb") as fh:
            self.assertEqual(fh.read(), outside_content)
        with open(os.path.join(cases_dir + ".stolen", "A.md"), "rb") as fh:
            self.assertEqual(fh.read(), base)

    def test_symlink_escape_still_rejected(self):
        """Static symlink target (carried over contract from round 1)."""
        if not self._can_symlink():
            self.skipTest("symlink creation unavailable on this host")
        outside = os.path.join(self._tmp.name, "outside2.md")
        with open(outside, "wb") as fh:
            fh.write(b"outside\n")
        root = self.h.executor.vault_root
        os.makedirs(os.path.join(root, "CASES"), exist_ok=True)
        os.symlink(outside, os.path.join(root, "CASES", "A.md"))
        proposal = self._proposal_for(b"outside\n")
        permit = self.h.make_permit(proposal)
        result = self.h.executor.execute(proposal, permit)
        self.assertEqual(result.status, "REJECTED")
        self.assertIn("symlink/reparse point", result.reason)
        with open(outside, "rb") as fh:
            self.assertEqual(fh.read(), b"outside\n")


class MG02CrossExecutorLock(Hardening2Base):
    """MG-02: two Executor instances sharing mutation state must not
    both admit the same permit."""

    def test_two_executors_same_permit_exactly_one_mutation(self):
        base = b"---\ntype: case\n---\n\noriginal body\n"
        payload = b"\nCROSS-EXECUTOR APPEND\n"
        proposal = self.h.make_proposal(payload=payload, base_bytes=base)
        permit = self.h.make_permit(proposal)

        executor_b = Executor(
            executor_id=self.h.executor.executor_id,
            vault_root=self.h.executor.vault_root,
            audit_log=self.h.audit,
            approver=self.h.approver,
        )
        self.assertIsNot(executor_b, self.h.executor)  # distinct instances

        results = []
        errors = []

        def run(ex):
            try:
                results.append(ex.execute(proposal, permit))
            except Exception as exc:  # pragma: no cover
                errors.append(exc)

        t1 = threading.Thread(target=run, args=(self.h.executor,))
        t2 = threading.Thread(target=run, args=(executor_b,))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertEqual(errors, [])
        statuses = sorted(r.status for r in results)
        self.assertEqual(statuses, ["APPLIED", "REJECTED"])
        self.assertIn("duplicate permit execution", " | ".join(r.reason or "" for r in results))
        # exactly ONE append across both executors
        self.assertEqual(self.h.read_note("CASES/A.md"), base + payload)
        self.assertEqual(len(self.h.audit.records()), 2)


class MG06AuditExecutorIdentity(Hardening2Base):
    """MG-06: rejection audit must record the ACTUAL processing
    executor, with the requested executor stored separately."""

    def test_wrong_executor_rejection_audit_records_actual_executor(self):
        base = b"---\ntype: case\n---\n\noriginal body\n"
        proposal = self.h.make_proposal(base_bytes=base)
        # permit selects executor-B; executor-A processes it
        permit = self.h.make_permit(proposal, selected_executor_id="executor-B")
        result = self.h.executor.execute(proposal, permit)  # executor-A
        self.assertEqual(result.status, "REJECTED")
        self.assertIn("executor mismatch", result.reason)
        record = self.h.audit.records()[-1]
        self.assertEqual(record["executor"], "executor-1")       # actual
        self.assertEqual(record["requested_executor"], "executor-B")  # separate
        # applied records keep the actual executor too
        p2 = self.h.make_proposal(base_bytes=base)
        permit2 = self.h.make_permit(p2)
        applied = self.h.executor.execute(p2, permit2)
        self.assertEqual(applied.status, "APPLIED")
        self.assertEqual(self.h.audit.records()[-1]["executor"], "executor-1")
        self.assertEqual(self.h.audit.records()[-1]["requested_executor"], "executor-1")


if __name__ == "__main__":
    unittest.main()

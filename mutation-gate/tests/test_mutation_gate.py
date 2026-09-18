"""Isolated Mutation Gate MVP tests: 3 PASS cases + 5 reject cases."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mutation_gate import (
    AuditLog,
    Executor,
    MockSigner,
    Permit,
    Proposal,
    VerifyingParty,
    utc_now_iso,
)


class Harness:
    def __init__(self, root: str):
        self.root = root
        self.signer = MockSigner("approver-alpha", b"unit-test-secret")
        self.approver = VerifyingParty(self.signer)
        self.audit = AuditLog(os.path.join(root, "state", "audit.jsonl"))
        self.executor = Executor(
            executor_id="executor-1",
            vault_root=os.path.join(root, "vault"),
            audit_log=self.audit,
            approver=self.approver,
        )
        os.makedirs(self.executor.vault_root, exist_ok=True)

    def write_note(self, rel: str, content: bytes) -> None:
        path = os.path.join(self.executor.vault_root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(content)

    def read_note(self, rel: str) -> bytes:
        with open(os.path.join(self.executor.vault_root, rel), "rb") as fh:
            return fh.read()

    def make_proposal(
        self,
        target: str = "CASES/A.md",
        payload: bytes = b"\nappended line\n",
        base_bytes: bytes = b"---\ntype: case\n---\n\noriginal body\n",
        actor: str = "agent-x",
        operation: str = "APPEND_EXISTING_NOTE",
    ) -> Proposal:
        from mutation_gate import sha256_hex

        self.write_note(target, base_bytes)
        proposal = Proposal(
            proposal_id="p-001",
            actor=actor,
            target=target,
            operation=operation,
            payload=payload,
            base_sha256=sha256_hex(base_bytes),
        )
        return Proposal(
            proposal.proposal_id,
            proposal.actor,
            proposal.target,
            proposal.operation,
            proposal.payload,
            proposal.base_sha256,
            proposal.compute_digest(),
        )

    def make_permit(self, proposal: Proposal, **overrides) -> Permit:
        from mutation_gate import sha256_hex

        base = Permit(
            permit_id="permit-001",
            proposal_digest=proposal.proposal_digest,
            target=proposal.target,
            base_sha256=proposal.base_sha256,
            selected_executor_id="executor-1",
            approval_identity=self.signer.identity,
            timestamp=utc_now_iso(),
        )
        signed = Permit(
            base.permit_id, base.proposal_digest, base.target, base.base_sha256,
            base.selected_executor_id, base.approval_identity, base.timestamp,
        )
        signature = self.signer.sign(signed.signed_content())
        fields = dict(
            permit_id=base.permit_id,
            proposal_digest=base.proposal_digest,
            target=base.target,
            base_sha256=base.base_sha256,
            selected_executor_id=base.selected_executor_id,
            approval_identity=base.approval_identity,
            timestamp=base.timestamp,
            approval_signature=signature,
        )
        fields.update(overrides)
        # re-sign only if the signer-relevant content is intact and no
        # explicit approval_signature override was supplied
        if "approval_signature" not in overrides:
            resigned = Permit(
                fields["permit_id"], fields["proposal_digest"], fields["target"],
                fields["base_sha256"], fields["selected_executor_id"],
                fields["approval_identity"], fields["timestamp"],
            )
            fields["approval_signature"] = self.signer.sign(resigned.signed_content())
        return Permit(**fields)


class PassCases(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.h = Harness(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_1_valid_proposal_approval_append_succeeds(self):
        base = b"---\ntype: case\n---\n\noriginal body\n"
        payload = b"\nHUMAN-APPROVED APPEND\n"
        proposal = self.h.make_proposal(payload=payload, base_bytes=base)
        permit = self.h.make_permit(proposal)
        result = self.h.executor.execute(proposal, permit)
        self.assertEqual(result.status, "APPLIED")
        # exact byte semantics: final == B + S
        self.assertEqual(self.h.read_note("CASES/A.md"), base + payload)

    def test_2_audit_generated_correctly(self):
        proposal = self.h.make_proposal()
        permit = self.h.make_permit(proposal)
        self.h.executor.execute(proposal, permit)
        records = self.h.audit.records()
        self.assertEqual(len(records), 1)
        r = records[0]
        for field in (
            "permit_id", "proposal_id", "proposal_digest", "target", "executor",
            "before_sha256", "after_sha256", "result", "timestamp",
        ):
            self.assertIn(field, r)
        self.assertEqual(r["result"], "APPLIED")
        self.assertEqual(r["executor"], "executor-1")
        self.assertEqual(r["proposal_digest"], proposal.proposal_digest)
        self.assertTrue(self.h.audit.verify_chain())

    def test_3_before_after_hash_correct(self):
        from mutation_gate import sha256_hex

        base = b"original bytes\n"
        payload = b"appended"
        proposal = self.h.make_proposal(payload=payload, base_bytes=base)
        permit = self.h.make_permit(proposal)
        result = self.h.executor.execute(proposal, permit)
        self.assertEqual(result.before_sha256, sha256_hex(base))
        self.assertEqual(result.after_sha256, sha256_hex(base + payload))
        self.assertEqual(
            result.after_sha256, sha256_hex(self.h.read_note("CASES/A.md"))
        )


class RejectCases(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.h = Harness(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def _applied_setup(self):
        proposal = self.h.make_proposal()
        permit = self.h.make_permit(proposal)
        return proposal, permit

    def test_4_invalid_approval(self):
        proposal = self.h.make_proposal()
        permit = self.h.make_permit(proposal, approval_signature="deadbeef")
        result = self.h.executor.execute(proposal, permit)
        self.assertEqual(result.status, "REJECTED")
        self.assertIn("invalid approval signature", result.reason)
        self.assertEqual(self.h.read_note("CASES/A.md"), b"---\ntype: case\n---\n\noriginal body\n")

    def test_5_modified_payload_after_approval(self):
        proposal = self.h.make_proposal()
        permit = self.h.make_permit(proposal)
        tampered = Proposal(
            proposal.proposal_id, proposal.actor, proposal.target,
            proposal.operation, b"\nEVIL APPEND\n", proposal.base_sha256,
            proposal.proposal_digest,  # digest NOT recomputed
        )
        result = self.h.executor.execute(tampered, permit)
        self.assertEqual(result.status, "REJECTED")
        self.assertIn("digest mismatch", result.reason)
        self.assertEqual(self.h.read_note("CASES/A.md"), b"---\ntype: case\n---\n\noriginal body\n")

    def test_6_stale_base_hash(self):
        proposal = self.h.make_proposal()
        permit = self.h.make_permit(proposal)
        # the note changes after the proposal was prepared
        self.h.write_note("CASES/A.md", b"---\ntype: case\n---\n\nCHANGED body\n")
        result = self.h.executor.execute(proposal, permit)
        self.assertEqual(result.status, "REJECTED")
        self.assertIn("stale base hash", result.reason)
        self.assertEqual(
            self.h.read_note("CASES/A.md"), b"---\ntype: case\n---\n\nCHANGED body\n"
        )

    def test_7_duplicate_execution(self):
        proposal, permit = self._applied_setup()
        first = self.h.executor.execute(proposal, permit)
        self.assertEqual(first.status, "APPLIED")
        second = self.h.executor.execute(proposal, permit)
        self.assertEqual(second.status, "REJECTED")
        self.assertIn("duplicate permit execution", second.reason)
        # file still equals base + payload exactly once
        base = b"---\ntype: case\n---\n\noriginal body\n"
        self.assertEqual(self.h.read_note("CASES/A.md"), base + proposal.payload)

    def test_8_wrong_executor(self):
        proposal = self.h.make_proposal()
        permit = self.h.make_permit(proposal, selected_executor_id="executor-2")
        result = self.h.executor.execute(proposal, permit)
        self.assertEqual(result.status, "REJECTED")
        self.assertIn("executor mismatch", result.reason)
        self.assertEqual(self.h.read_note("CASES/A.md"), b"---\ntype: case\n---\n\noriginal body\n")


class ModelEdgeCases(unittest.TestCase):
    """A few extra pure-validation edges (beyond the required eight)."""

    def _proposal(self, **kw):
        base = dict(
            proposal_id="p", actor="a", target="CASES/A.md",
            operation="APPEND_EXISTING_NOTE", payload=b"x",
            base_sha256="0" * 64,
        )
        base.update(kw)
        raw = Proposal(
            base["proposal_id"], base["actor"], base["target"],
            base["operation"], base["payload"], base["base_sha256"], "",
        )
        digest = kw.get("proposal_digest", raw.compute_digest())
        return Proposal(
            base["proposal_id"], base["actor"], base["target"],
            base["operation"], base["payload"], base["base_sha256"], digest,
        )

    def test_missing_field(self):
        from mutation_gate import validate_proposal, Rejection

        with self.assertRaises(Rejection) as ctx:
            validate_proposal(self._proposal(actor=""))
        self.assertIn("missing field", str(ctx.exception))

    def test_invalid_operation(self):
        from mutation_gate import validate_proposal, Rejection

        with self.assertRaises(Rejection) as ctx:
            validate_proposal(self._proposal(operation="DELETE_NOTE"))
        self.assertIn("invalid operation", str(ctx.exception))

    def test_invalid_target_traversal(self):
        from mutation_gate import validate_proposal, Rejection

        for bad in ("../escape.md", "/abs.md", "C:\\x.md", "CASES/../evil.md", "note.txt"):
            with self.assertRaises(Rejection, msg=bad):
                validate_proposal(self._proposal(target=bad))


if __name__ == "__main__":
    unittest.main()

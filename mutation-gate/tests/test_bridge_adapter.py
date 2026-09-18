"""v0.5.1 Bridge Adapter MVP — isolated tests (6 required flows)."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mutation_gate import (
    AuditLog, Executor, MockSigner, Permit, Proposal,
    VerifyingParty, sha256_hex, utc_now_iso,
)
from bridge_adapter import (
    AdapterContext, BridgeDecision, BridgeMutationAdapter,
    LeaseRegistryValidator, scan_sync_hazard,
)

BASE = b"---\ntype: case\n---\n\noriginal body\n"
PAYLOAD = b"\nHUMAN-APPROVED APPEND\n"
WRITER = "win-zcode-glm"
EXECUTOR_ID = "executor-1"


class AdapterHarness:
    def __init__(self, root: str, with_lease: bool = True):
        self.root = root
        self.vault = os.path.join(root, "vault")
        os.makedirs(os.path.join(self.vault, "CASES"), exist_ok=True)
        with open(os.path.join(self.vault, "CASES", "A.md"), "wb") as fh:
            fh.write(BASE)

        self.signer = MockSigner("approver-alpha", b"unit-test-secret")
        self.approver = VerifyingParty(self.signer)
        self.audit = AuditLog(os.path.join(root, "state", "audit.jsonl"))
        self.executor = Executor(EXECUTOR_ID, self.vault, self.audit, self.approver)
        self.adapter = BridgeMutationAdapter(self.executor, self.approver)

        self.registry_path = os.path.join(root, "state", "lease_registry.json")
        os.makedirs(os.path.dirname(self.registry_path), exist_ok=True)
        self.write_registry(with_lease)

    def write_registry(self, with_lease: bool) -> None:
        leases = []
        if with_lease:
            leases.append(
                {"note": "CASES/A", "writer": WRITER, "active": True, "expires": None}
            )
        with open(self.registry_path, "w", encoding="utf-8") as fh:
            json.dump({"leases": leases}, fh)

    def bridge(self) -> LeaseRegistryValidator:
        return LeaseRegistryValidator(
            self.registry_path, allowed_writers=[WRITER, "mac-codex-astra"]
        )

    def context(self, bridge=None, writer=WRITER) -> AdapterContext:
        return AdapterContext(
            executor_id=EXECUTOR_ID,
            writer_identity=writer,
            bridge=bridge if bridge is not None else self.bridge(),
            sync_hazard_root=self.vault,
        )

    def proposal(self, payload: bytes = PAYLOAD, operation: str = "APPEND_EXISTING_NOTE",
                 base: bytes = BASE) -> Proposal:
        raw = Proposal(
            "p-adp", "agent-x", "CASES/A.md", operation, payload,
            sha256_hex(base), "",
        )
        return Proposal(
            raw.proposal_id, raw.actor, raw.target, raw.operation,
            raw.payload, raw.base_sha256, raw.compute_digest(),
        )

    def permit(self, proposal: Proposal, **overrides) -> Permit:
        unsigned = Permit(
            "permit-adp", proposal.proposal_digest, proposal.target,
            proposal.base_sha256, EXECUTOR_ID, self.signer.identity,
            utc_now_iso(),
        )
        signature = self.signer.sign(unsigned.signed_content())
        fields = dict(
            permit_id=unsigned.permit_id, proposal_digest=unsigned.proposal_digest,
            target=unsigned.target, base_sha256=unsigned.base_sha256,
            selected_executor_id=unsigned.selected_executor_id,
            approval_identity=unsigned.approval_identity,
            timestamp=unsigned.timestamp, approval_signature=signature,
        )
        fields.update(overrides)
        if "approval_signature" not in overrides:
            resigned = Permit(
                fields["permit_id"], fields["proposal_digest"], fields["target"],
                fields["base_sha256"], fields["selected_executor_id"],
                fields["approval_identity"], fields["timestamp"],
            )
            fields["approval_signature"] = self.signer.sign(resigned.signed_content())
        return Permit(**fields)

    def note_bytes(self) -> bytes:
        with open(os.path.join(self.vault, "CASES", "A.md"), "rb") as fh:
            return fh.read()

    def applied_records(self) -> list:
        return [
            r for r in self.audit.records()
            if str(r.get("result", "")).startswith("APPLIED")
        ]


class Test1ValidFlow(unittest.TestCase):
    def test_permit_bridge_pass_gate_append_audit(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = AdapterHarness(tmp, with_lease=True)
            proposal = h.proposal()
            permit = h.permit(proposal)
            result = h.adapter.execute(proposal, permit, h.context())
            self.assertEqual(result.status, "APPLIED")
            self.assertEqual(h.note_bytes(), BASE + PAYLOAD)
            # audit exists (gate-owned) and identity preserved
            self.assertEqual(len(h.applied_records()), 1)
            record = h.applied_records()[0]
            self.assertEqual(record["executor"], EXECUTOR_ID)      # actual
            self.assertEqual(record["requested_executor"], EXECUTOR_ID)
            self.assertEqual(result.actual_executor, EXECUTOR_ID)  # from context
            self.assertEqual(result.approval_identity, "approver-alpha")


class Test2NoActiveLease(unittest.TestCase):
    def test_no_lease_rejected_gate_not_called(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = AdapterHarness(tmp, with_lease=False)
            proposal = h.proposal()
            permit = h.permit(proposal)
            gate_calls = []
            real_execute = h.executor.execute

            def spy(prop, perm):
                gate_calls.append(perm.permit_id)
                return real_execute(prop, perm)

            with mock.patch.object(h.executor, "execute", side_effect=spy):
                result = h.adapter.execute(proposal, permit, h.context())
            self.assertTrue(result.status.startswith("REJECTED:NO_ACTIVE_LEASE"))
            self.assertEqual(gate_calls, [])          # gate NOT invoked
            self.assertEqual(h.note_bytes(), BASE)    # file untouched
            self.assertEqual(h.audit.records(), [])   # no audit either


class Test3InvalidPermit(unittest.TestCase):
    def test_bad_signature_rejected_before_any_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = AdapterHarness(tmp, with_lease=True)
            proposal = h.proposal()
            permit = h.permit(proposal, approval_signature="deadbeef")
            result = h.adapter.execute(proposal, permit, h.context())
            self.assertTrue(result.status.startswith("REJECTED"))
            self.assertIn("invalid approval signature", result.status)
            self.assertEqual(h.note_bytes(), BASE)      # no mutation
            self.assertEqual(h.applied_records(), [])   # nothing applied


class Test4BaseHashMismatch(unittest.TestCase):
    def test_stale_base_hash_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = AdapterHarness(tmp, with_lease=True)
            proposal = h.proposal()
            permit = h.permit(proposal)
            # the note drifts after the proposal was prepared
            with open(os.path.join(h.vault, "CASES", "A.md"), "wb") as fh:
                fh.write(b"---\ntype: case\n---\n\nCHANGED\n")
            result = h.adapter.execute(proposal, permit, h.context())
            self.assertTrue(result.status.startswith("REJECTED:stale base hash"))
            self.assertEqual(
                h.note_bytes(), b"---\ntype: case\n---\n\nCHANGED\n"
            )


class Test5UnsupportedOperation(unittest.TestCase):
    def test_delete_note_rejected_before_bridge(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = AdapterHarness(tmp, with_lease=True)
            proposal = h.proposal(operation="DELETE_NOTE")
            permit = h.permit(proposal)
            bridge_calls = []

            def bridge_spy(target, writer):
                bridge_calls.append(target)
                return BridgeDecision(True)

            result = h.adapter.execute(proposal, permit, h.context(bridge=type(
                "B", (), {"check_write": staticmethod(bridge_spy)}
            )()))
            self.assertEqual(result.status, "REJECTED:UNSUPPORTED_OPERATION")
            self.assertEqual(bridge_calls, [])      # bridge NOT called
            self.assertEqual(h.note_bytes(), BASE)  # untouched
            self.assertEqual(h.audit.records(), [])


class Test6ExecutionUncertain(unittest.TestCase):
    def test_uncertain_preserved_never_downgraded_and_retry_blocked(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = AdapterHarness(tmp, with_lease=True)
            proposal = h.proposal()
            permit = h.permit(proposal)
            with mock.patch(
                "mutation_gate.executor.os.fsync",
                side_effect=OSError("disk transient"),
            ):
                result = h.adapter.execute(proposal, permit, h.context())
            self.assertTrue(result.status.startswith("EXECUTION_UNCERTAIN"))
            self.assertNotIn("REJECTED", result.status)  # never converted
            # retry is blocked (uncertain permits never run again)
            retry = h.adapter.execute(proposal, permit, h.context())
            self.assertTrue(retry.status.startswith("REJECTED:duplicate"))
            self.assertEqual(h.note_bytes(), BASE + PAYLOAD)  # exactly once


class ExtraIdentityAndSafety(unittest.TestCase):
    def test_actual_executor_comes_from_context_not_proposal(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = AdapterHarness(tmp, with_lease=True)
            proposal = h.proposal()
            # permit names executor-2 but CONTEXT runs executor-1
            permit = h.permit(proposal, selected_executor_id="executor-2")
            context = h.context(writer=WRITER)
            result = h.adapter.execute(proposal, permit, context)
            self.assertTrue(result.status.startswith("REJECTED:executor mismatch"))
            self.assertEqual(result.actual_executor, EXECUTOR_ID)     # context
            self.assertEqual(result.requested_executor, "executor-2") # preserved
            self.assertEqual(h.note_bytes(), BASE)

    def test_sync_hazard_rejected_before_gate(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = AdapterHarness(tmp, with_lease=True)
            conflict = os.path.join(h.vault, "CASES", "A.sync-conflict20260918.md")
            with open(conflict, "wb") as fh:
                fh.write(b"conflicting copy")
            proposal = h.proposal()
            permit = h.permit(proposal)
            result = h.adapter.execute(proposal, permit, h.context())
            self.assertEqual(result.status, "REJECTED:SYNC_HAZARD")
            self.assertEqual(h.note_bytes(), BASE)
            self.assertEqual(h.audit.records(), [])

    def test_writer_not_allowed_and_outside_root(self):
        with tempfile.TemporaryDirectory() as tmp:
            h = AdapterHarness(tmp, with_lease=True)
            proposal = h.proposal()
            permit = h.permit(proposal)
            # unknown writer identity
            result = h.adapter.execute(proposal, permit, h.context(writer="rogue"))
            self.assertEqual(result.status, "REJECTED:WRITER_NOT_ALLOWED")
            # target outside allowed write roots
            raw = Proposal(
                "p-x", "agent-x", "Templates/T.md", "APPEND_EXISTING_NOTE",
                b"x", sha256_hex(b""), "",
            )
            outside = Proposal(
                raw.proposal_id, raw.actor, raw.target, raw.operation,
                raw.payload, raw.base_sha256, raw.compute_digest(),
            )
            permit2 = h.permit(outside)
            result2 = h.adapter.execute(outside, permit2, h.context())
            self.assertEqual(result2.status, "REJECTED:OUTSIDE_WRITE_ROOTS")


if __name__ == "__main__":
    unittest.main()

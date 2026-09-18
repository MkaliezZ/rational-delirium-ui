"""Executor: admission + ONE exact APPEND_EXISTING_NOTE + audit.

Flow: proposal validation → approval verification → executor
admission (this executor is the one the permit selected) → duplicate
permit check (an APPLIED permit never executes again) → current file
hash check (stale base) → append EXACT bytes → readback verification
(B + S byte-for-byte) → audit record (APPLIED or REJECTED:reason).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from .audit import AuditLog
from .model import Proposal, Permit, sha256_hex
from .signer import VerifyingParty
from .validation import Rejection, validate_permit, validate_proposal


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class ExecutionResult:
    status: str  # "APPLIED" | "REJECTED"
    reason: Optional[str]
    before_sha256: str
    after_sha256: str
    audit_record: dict


class Executor:
    def __init__(
        self,
        executor_id: str,
        vault_root: str,
        audit_log: AuditLog,
        approver: VerifyingParty,
    ) -> None:
        self.executor_id = executor_id
        self.vault_root = os.path.abspath(vault_root)
        self.audit = audit_log
        self.approver = approver

    def _abs(self, target: str) -> str:
        return os.path.abspath(os.path.join(self.vault_root, target))

    def execute(self, proposal: Proposal, permit: Permit) -> ExecutionResult:
        before = ""
        after = ""
        try:
            # 1. proposal validation
            validate_proposal(proposal)
            # 2. approval verification (signature + all bindings)
            validate_permit(permit, proposal, self.approver)
            # 3. executor admission
            if permit.selected_executor_id != self.executor_id:
                raise Rejection(
                    f"executor mismatch: permit selects {permit.selected_executor_id!r}, "
                    f"this executor is {self.executor_id!r}"
                )
            # 4. duplicate permit execution — one permit applies ONCE
            if permit.permit_id in self.audit.executed_permit_ids():
                raise Rejection(f"duplicate permit execution: {permit.permit_id}")

            path = self._abs(proposal.target)
            if not os.path.isfile(path):
                raise Rejection(f"target missing: {proposal.target}")
            with open(path, "rb") as fh:
                current = fh.read()
            before = sha256_hex(current)
            # 5. stale base hash check
            if before != proposal.base_sha256:
                raise Rejection(
                    f"stale base hash: file is {before}, proposal bound {proposal.base_sha256}"
                )

            expected_after = sha256_hex(current + proposal.payload)
            # 6. append EXACT bytes — no rewrite, no normalization
            with open(path, "ab") as fh:
                fh.write(proposal.payload)
                fh.flush()
                os.fsync(fh.fileno())

            # 7. readback verification
            with open(path, "rb") as fh:
                readback = fh.read()
            after = sha256_hex(readback)
            if readback != current + proposal.payload:
                raise Rejection("readback mismatch: file does not equal base + payload")
            if after != expected_after:
                raise Rejection("readback hash mismatch")

            record = self.audit.append(
                {
                    "permit_id": permit.permit_id,
                    "proposal_id": proposal.proposal_id,
                    "proposal_digest": proposal.proposal_digest,
                    "target": proposal.target,
                    "executor": self.executor_id,
                    "before_sha256": before,
                    "after_sha256": after,
                    "result": "APPLIED",
                },
                timestamp=utc_now_iso(),
            )
            return ExecutionResult("APPLIED", None, before, after, record)

        except Rejection as rejection:
            record = self.audit.append(
                {
                    "permit_id": permit.permit_id,
                    "proposal_id": proposal.proposal_id,
                    "proposal_digest": proposal.proposal_digest,
                    "target": proposal.target,
                    "executor": self.executor_id,
                    "before_sha256": before,
                    "after_sha256": after,
                    "result": f"REJECTED:{rejection.reason}",
                },
                timestamp=utc_now_iso(),
            )
            return ExecutionResult("REJECTED", rejection.reason, before, after, record)

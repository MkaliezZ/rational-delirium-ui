"""Cross-process MG-02 regression worker (not discovered by unittest).

Usage: python proc_worker.py <tmp_root>
Deterministically rebuilds the SAME proposal + permit in this fresh
process and executes it once against the shared state/vault, printing
the execution status to stdout.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mutation_gate import (
    AuditLog, Executor, MockSigner, Permit, Proposal,
    VerifyingParty, sha256_hex, utc_now_iso,
)

SECRET = b"unit-test-secret"
BASE = b"---\ntype: case\n---\n\noriginal body\n"
PAYLOAD = b"\nCROSS-PROCESS APPEND\n"


def main(tmp_root: str) -> int:
    vault = os.path.join(tmp_root, "vault")
    note = os.path.join(vault, "CASES", "A.md")
    os.makedirs(os.path.dirname(note), exist_ok=True)
    if not os.path.exists(note):
        with open(note, "wb") as fh:
            fh.write(BASE)

    signer = MockSigner("approver-alpha", SECRET)
    approver = VerifyingParty(signer)
    audit = AuditLog(os.path.join(tmp_root, "state", "audit.jsonl"))
    executor = Executor("executor-1", vault, audit, approver)

    raw = Proposal(
        "p-xproc", "agent-x", "CASES/A.md", "APPEND_EXISTING_NOTE",
        PAYLOAD, sha256_hex(BASE), "",
    )
    proposal = Proposal(
        raw.proposal_id, raw.actor, raw.target, raw.operation,
        raw.payload, raw.base_sha256, raw.compute_digest(),
    )
    unsigned = Permit(
        "permit-xproc", proposal.proposal_digest, proposal.target,
        proposal.base_sha256, "executor-1", signer.identity, utc_now_iso(),
    )
    permit = Permit(
        unsigned.permit_id, unsigned.proposal_digest, unsigned.target,
        unsigned.base_sha256, unsigned.selected_executor_id,
        unsigned.approval_identity, unsigned.timestamp,
        signer.sign(unsigned.signed_content()),
    )

    result = executor.execute(proposal, permit)
    print(result.status)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1]))

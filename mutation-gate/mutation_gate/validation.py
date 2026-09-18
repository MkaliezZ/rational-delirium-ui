"""Proposal and approval validation.

Everything here is pure: given a Proposal / Permit (+ the trusted
signer for permits) decide accept/reject with a precise reason.
"""

from __future__ import annotations


from typing import Optional

from .model import (
    Proposal,
    Permit,
    REQUIRED_PERMIT_FIELDS,
    REQUIRED_PROPOSAL_FIELDS,
    SUPPORTED_OPERATIONS,
)
from .signer import VerifyingParty


class Rejection(Exception):
    """Deterministic refusal with a machine-readable reason."""

    def __init__(self, reason: str) -> None:
        super().__init__(f"REJECTED: {reason}")
        self.reason = reason


def _missing(fields: tuple, present) -> Optional[str]:
    for name in fields:
        value = getattr(present, name, None)
        if value is None or (isinstance(value, str) and value == ""):
            return name
    return None


def _valid_target(target: str) -> bool:
    """Vault-relative note path: no absolute, no traversal, .md only."""
    if not isinstance(target, str) or not target:
        return False
    if target.startswith(("/", "\\")) or ":" in target:
        return False
    parts = target.replace("\\", "/").split("/")
    if any(part in ("", ".", "..") for part in parts):
        return False
    return target.endswith(".md")


def validate_proposal(proposal: Proposal) -> None:
    """Reject: missing fields, invalid operation, changed digest,
    invalid target."""
    missing = _missing(REQUIRED_PROPOSAL_FIELDS, proposal)
    if missing is not None:
        raise Rejection(f"proposal missing field: {missing}")
    if proposal.operation not in SUPPORTED_OPERATIONS:
        raise Rejection(f"invalid operation: {proposal.operation}")
    if not _valid_target(proposal.target):
        raise Rejection(f"invalid target: {proposal.target!r}")
    expected = proposal.compute_digest()
    if proposal.proposal_digest != expected:
        raise Rejection("proposal digest mismatch (changed content)")


def validate_permit(
    permit: Permit,
    proposal: Proposal,
    approver: VerifyingParty,
) -> None:
    """Reject: proposal mismatch, target mismatch, hash mismatch,
    executor mismatch, invalid approval signature, missing fields."""
    missing = _missing(REQUIRED_PERMIT_FIELDS, permit)
    if missing is not None:
        raise Rejection(f"permit missing field: {missing}")
    if permit.proposal_digest != proposal.proposal_digest:
        raise Rejection("permit proposal_digest mismatch")
    if permit.target != proposal.target:
        raise Rejection("permit target mismatch")
    if permit.base_sha256 != proposal.base_sha256:
        raise Rejection("permit base_sha256 mismatch")
    if not approver.verify(permit.signed_content(), permit.approval_signature):
        raise Rejection("invalid approval signature")
    if permit.approval_identity != approver.identity:
        raise Rejection("approval identity mismatch")

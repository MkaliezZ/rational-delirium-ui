"""Rational Delirium Mutation Gate MVP (v0.5).

Human-approved, once-only, byte-exact APPEND_EXISTING_NOTE with
audit evidence. Standalone component: no Obsidian plugin, Bridge or
production Vault integration.
"""

from .model import Proposal, Permit, canonical_json, sha256_hex
from .signer import MockSigner, VerifyingParty
from .validation import Rejection, validate_permit, validate_proposal
from .executor import Executor, ExecutionResult, utc_now_iso
from .audit import AuditLog

__all__ = [
    "Proposal", "Permit", "canonical_json", "sha256_hex",
    "MockSigner", "VerifyingParty",
    "Rejection", "validate_proposal", "validate_permit",
    "Executor", "ExecutionResult", "utc_now_iso", "AuditLog",
]

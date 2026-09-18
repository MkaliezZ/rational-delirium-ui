"""Mutation Gate MVP — data model.

A Proposal is a prepared Agent Proposal for ONE exact operation
(APPEND_EXISTING_NOTE) against ONE target note whose current bytes
hash to base_sha256. proposal_digest is the canonical SHA-256 of the
proposal content and binds every later approval to the exact bytes.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Dict

SUPPORTED_OPERATIONS = ("APPEND_EXISTING_NOTE",)

REQUIRED_PROPOSAL_FIELDS = (
    "proposal_id",
    "actor",
    "target",
    "operation",
    "payload",
    "base_sha256",
    "proposal_digest",
)

REQUIRED_PERMIT_FIELDS = (
    "permit_id",
    "proposal_digest",
    "target",
    "base_sha256",
    "selected_executor_id",
    "approval_identity",
    "timestamp",
    "approval_signature",
)


def canonical_json(obj: Dict[str, Any]) -> bytes:
    """Deterministic encoding: sorted keys, tight separators, UTF-8."""
    return json.dumps(
        obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class Proposal:
    proposal_id: str
    actor: str
    target: str
    operation: str
    payload: bytes
    base_sha256: str
    proposal_digest: str = field(default="")

    def __post_init__(self) -> None:
        # MG-03: snapshot the payload into immutable bytes at the
        # trust boundary. A caller-owned mutable buffer (bytearray /
        # memoryview) can never change under the approved digest or
        # between approval validation and execution.
        if isinstance(self.payload, bytes):
            return
        if not isinstance(self.payload, (bytearray, memoryview)):
            raise TypeError("payload must be bytes-like")
        object.__setattr__(self, "payload", bytes(self.payload))

    def content_for_digest(self) -> Dict[str, Any]:
        """Digest covers every semantic field except the digest itself;
        the payload participates as base64 so bytes are unambiguous."""
        import base64

        return {
            "proposal_id": self.proposal_id,
            "actor": self.actor,
            "target": self.target,
            "operation": self.operation,
            "payload_base64": base64.b64encode(self.payload).decode("ascii"),
            "base_sha256": self.base_sha256,
        }

    def compute_digest(self) -> str:
        return sha256_hex(canonical_json(self.content_for_digest()))


@dataclass(frozen=True)
class Permit:
    permit_id: str
    proposal_digest: str
    target: str
    base_sha256: str
    selected_executor_id: str
    approval_identity: str
    timestamp: str
    approval_signature: str = field(default="")

    def signed_content(self) -> bytes:
        """The exact bytes an approval signature must cover."""
        return canonical_json(
            {
                "permit_id": self.permit_id,
                "proposal_digest": self.proposal_digest,
                "target": self.target,
                "base_sha256": self.base_sha256,
                "selected_executor_id": self.selected_executor_id,
                "approval_identity": self.approval_identity,
                "timestamp": self.timestamp,
            }
        )

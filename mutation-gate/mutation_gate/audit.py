"""Append-only audit log.

Each record is canonical JSON on one line with its own
record_sha256 (digest over the record content without the digest
field), making any later in-place edit detectable. The log is only
ever appended to; no truncation or rewrite APIs exist.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List

from .model import canonical_json, sha256_hex

REQUIRED_AUDIT_FIELDS = (
    "permit_id",
    "proposal_id",
    "proposal_digest",
    "target",
    "executor",
    "before_sha256",
    "after_sha256",
    "result",
    "timestamp",
)


class AuditLog:
    def __init__(self, path: str) -> None:
        self._path = path
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

    def append(self, record: Dict[str, Any], timestamp: str) -> Dict[str, Any]:
        body = dict(record)
        body["timestamp"] = timestamp
        missing = [f for f in REQUIRED_AUDIT_FIELDS if f not in body]
        if missing:
            raise ValueError(f"audit record missing fields: {missing}")
        body["record_sha256"] = sha256_hex(canonical_json(body))
        with open(self._path, "ab") as fh:
            fh.write(canonical_json(body) + b"\n")
        return body

    def records(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self._path):
            return []
        out: List[Dict[str, Any]] = []
        with open(self._path, "rb") as fh:
            for line in fh.read().splitlines():
                if not line.strip():
                    continue
                out.append(json.loads(line.decode("utf-8")))
        return out

    def verify_chain(self) -> bool:
        """Every record's own digest must match its content."""
        for record in self.records():
            body = {k: v for k, v in record.items() if k != "record_sha256"}
            if record["record_sha256"] != sha256_hex(canonical_json(body)):
                return False
        return True

    def executed_permit_ids(self) -> set:
        return {
            r["permit_id"] for r in self.records() if r.get("result") == "APPLIED"
        }

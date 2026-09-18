"""Signer abstraction for approval identity.

MVP ships a deterministic local mock signer (HMAC-SHA256 over a
local secret). The interface is deliberately shaped so a future
Ed25519 implementation drops in without touching validation or the
executor: sign(bytes) -> str, verify(bytes, signature) -> bool.
No key management, distribution or rotation is attempted.
"""

from __future__ import annotations

import hashlib
import hmac
from typing import Protocol


class Signer(Protocol):
    identity: str

    def sign(self, data: bytes) -> str: ...

    def verify(self, data: bytes, signature: str) -> bool: ...


class MockSigner:
    """Local deterministic signer (HMAC-SHA256). MVP-only."""

    def __init__(self, identity: str, secret: bytes) -> None:
        if not secret:
            raise ValueError("signer secret must not be empty")
        self.identity = identity
        self._secret = secret

    def sign(self, data: bytes) -> str:
        return hmac.new(self._secret, data, hashlib.sha256).hexdigest()

    def verify(self, data: bytes, signature: str) -> bool:
        if not isinstance(signature, str) or not signature:
            return False
        expected = self.sign(data)
        return hmac.compare_digest(expected, signature)


class VerifyingParty:
    """A verifier that knows the approver's identity but holds no
    signing key material beyond what MockSigner needs. Kept separate
    so a real asymmetric signer can verify without signing."""

    def __init__(self, signer: Signer) -> None:
        self._signer = signer

    @property
    def identity(self) -> str:
        return self._signer.identity

    def verify(self, data: bytes, signature: str) -> bool:
        return self._signer.verify(data, signature)

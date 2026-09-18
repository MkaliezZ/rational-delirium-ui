"""v0.5.1 Bridge Adapter MVP — composes frozen Bridge safety with the
frozen Mutation Gate (v0.5.0). DESIGN: docs/RD_V0_5_1_BRIDGE_ADAPTER_DESIGN.md

Responsibilities (adapter ONLY orchestrates — it owns NO policy):

  1. operation whitelist: APPEND_EXISTING_NOTE only, everything else
     is REJECTED:UNSUPPORTED_OPERATION before any Bridge call;
  2. Bridge validation (lease / writer identity / write roots / sync
     hazard) via a BridgeCheckPort — failure ⇒ REJECTED:<reason>,
     Mutation Gate is NOT invoked; no takeover, no force ownership;
  3. Mutation Gate execution — the gate stays the owner of permit
     validation, payload integrity, exactly-once and audit. The
     adapter duplicates NONE of those checks;
  4. result mapping: APPLIED / REJECTED:<reason> /
     EXECUTION_UNCERTAIN:<reason> — uncertain is NEVER downgraded.

Identity rules: `actual_executor` comes from the execution CONTEXT
(never trusted from proposal fields); `requested_executor` and
`approval_identity` are preserved from the permit.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import List, Optional, Protocol

from mutation_gate import (
    ExecutionResult,
    Executor,
    Permit,
    Proposal,
    VerifyingParty,
)

SUPPORTED_OPERATION = "APPEND_EXISTING_NOTE"

DEFAULT_WRITE_ROOTS = ("CASES", "EVIDENCE", "HYPOTHESES", "LOOPS", "ARCHIVE")


# ----------------------------------------------------------------------
# Bridge check port — the integration point to the real Bridge.
# Production wiring implements this against the Bridge's lease state
# (no takeover, no ownership changes — read-only queries).
# ----------------------------------------------------------------------
@dataclass(frozen=True)
class BridgeDecision:
    ok: bool
    reason: Optional[str] = None


class BridgeCheckPort(Protocol):
    def check_write(self, target: str, writer_identity: str) -> BridgeDecision: ...


class LeaseRegistryValidator:
    """MVP Bridge check against a documented lease registry JSON plus
    on-disk sync-hazard scan. Read-only; never mutates Bridge state.

    Registry format (exported/provided by the Bridge side):
    {"leases": [{"note": "CASES/A.md", "writer": "win-zcode-glm",
                 "active": true, "expires": null | ISO-8601}]}

    Checks, in order: write-root containment → allowed writer →
    active lease for (note, writer) → sync-conflict hazard on the
    target's directory."""

    def __init__(
        self,
        registry_path: str,
        allowed_writers: List[str],
        allowed_write_roots: List[str] = list(DEFAULT_WRITE_ROOTS),
    ) -> None:
        self._registry_path = registry_path
        self._writers = set(allowed_writers)
        self._roots = tuple(allowed_write_roots)

    def _load_leases(self) -> list:
        try:
            with open(self._registry_path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            return []
        return data.get("leases", []) if isinstance(data, dict) else []

    def check_write(self, target: str, writer_identity: str) -> BridgeDecision:
        if os.path.isabs(target) or ":" in target or "\\" in target:
            return BridgeDecision(False, "INVALID_TARGET")
        root = target.split("/", 1)[0]
        if root not in self._roots:
            return BridgeDecision(False, "OUTSIDE_WRITE_ROOTS")
        if writer_identity not in self._writers:
            return BridgeDecision(False, "WRITER_NOT_ALLOWED")
        note = target[:-3] if target.endswith(".md") else target
        has_lease = any(
            lease.get("note") == note
            and lease.get("writer") == writer_identity
            and lease.get("active") is True
            for lease in self._load_leases()
        )
        if not has_lease:
            # NO automatic takeover; NO force ownership — human action
            # required, same permit may rerun afterwards.
            return BridgeDecision(False, "NO_ACTIVE_LEASE")
        return BridgeDecision(True)


def scan_sync_hazard(vault_root: str, target: str) -> bool:
    """True if any .sync-conflict* file sits next to the target
    (Syncthing is not a distributed lock — policy line)."""
    directory = os.path.dirname(os.path.join(vault_root, *target.split("/")))
    if not os.path.isdir(directory):
        return False
    return any(".sync-conflict" in name for name in os.listdir(directory))


# ----------------------------------------------------------------------
# Adapter
# ----------------------------------------------------------------------
@dataclass(frozen=True)
class AdapterContext:
    """Execution context — actual executor identity comes ONLY from
    here, never from proposal fields."""

    executor_id: str
    writer_identity: str  # platform-detected Bridge writer identity
    bridge: BridgeCheckPort
    sync_hazard_root: Optional[str] = None  # vault root for conflict scan


@dataclass(frozen=True)
class AdapterResult:
    status: str  # APPLIED | REJECTED:<reason> | EXECUTION_UNCERTAIN:<reason>
    reason: Optional[str]
    requested_executor: str
    actual_executor: str
    approval_identity: str
    gate_result: Optional[ExecutionResult]


class BridgeMutationAdapter:
    def __init__(
        self,
        executor: Executor,
        approver: VerifyingParty,
    ) -> None:
        self._executor = executor
        self._approver = approver

    def execute(
        self, proposal: Proposal, permit: Permit, context: AdapterContext
    ) -> AdapterResult:
        identity = dict(
            requested_executor=permit.selected_executor_id,
            actual_executor=context.executor_id,  # context-owned
            approval_identity=permit.approval_identity,
        )

        # 1. operation whitelist — before ANY Bridge call
        if proposal.operation != SUPPORTED_OPERATION:
            return AdapterResult(
                status="REJECTED:UNSUPPORTED_OPERATION",
                reason=f"operation {proposal.operation} is not supported",
                gate_result=None,
                **identity,
            )

        # 2. Bridge validation — failure never reaches the gate
        bridge = context.bridge.check_write(proposal.target, context.writer_identity)
        if not bridge.ok:
            return AdapterResult(
                status=f"REJECTED:{bridge.reason or 'BRIDGE_REJECTED'}",
                reason=bridge.reason,
                gate_result=None,
                **identity,
            )

        # sync hazard is a Bridge-domain safety observation
        if context.sync_hazard_root and scan_sync_hazard(
            context.sync_hazard_root, proposal.target
        ):
            return AdapterResult(
                status="REJECTED:SYNC_HAZARD",
                reason="sync conflict present next to target",
                gate_result=None,
                **identity,
            )

        # 3. Mutation Gate — owner of permit validation, payload
        #    integrity, exactly-once, audit. No checks duplicated here.
        gate_result = self._executor.execute(proposal, permit)

        # 4. Result mapping — uncertain is NEVER converted
        if gate_result.status == "APPLIED":
            status = "APPLIED"
        elif gate_result.status == "EXECUTION_UNCERTAIN":
            status = f"EXECUTION_UNCERTAIN:{gate_result.reason}"
        else:
            status = f"REJECTED:{gate_result.reason}"

        return AdapterResult(
            status=status,
            reason=gate_result.reason,
            gate_result=gate_result,
            **identity,
        )

"""v0.5.1 Bridge Adapter MVP — composes Bridge safety with the
frozen Mutation Gate. APPEND_EXISTING_NOTE only."""

from .adapter import (
    AdapterContext,
    AdapterResult,
    BridgeDecision,
    BridgeCheckPort,
    BridgeMutationAdapter,
    LeaseRegistryValidator,
    scan_sync_hazard,
    SUPPORTED_OPERATION,
)

__all__ = [
    "AdapterContext", "AdapterResult", "BridgeDecision", "BridgeCheckPort",
    "BridgeMutationAdapter", "LeaseRegistryValidator", "scan_sync_hazard",
    "SUPPORTED_OPERATION",
]

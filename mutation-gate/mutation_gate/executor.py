"""Executor: admission + ONE exact APPEND_EXISTING_NOTE + audit.

Security-hardened flow (MG-01..05):

  proposal validation (MG-05: empty payload rejected)
  → approval verification
  → executor admission (selected executor match)
  → per-permit LOCKED admission (MG-02: duplicate check and mutation
    admission are atomic against concurrent callers)
  → blocked-permit check (an APPLIED **or EXECUTION_UNCERTAIN** permit
    never runs again — uncertain outcomes also block unsafe retry)
  → MG-01 path safety: containment under the mutation root, no
    symlink/reparse component anywhere from root to file, and the
    check+write operate on ONE opened file descriptor so there is no
    check-then-use race on the path
  → stale base hash check on the SAME fd
  → append EXACT bytes (O_APPEND) + fsync + readback verification
  → audit record (APPLIED / REJECTED:reason / EXECUTION_UNCERTAIN)

MG-04: once the write has begun, any failure is recorded as
EXECUTION_UNCERTAIN — the file may have changed, evidence is kept,
and the permit is blocked from automatic retry.
"""

from __future__ import annotations

import os
import stat as stat_module
import threading
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
    status: str  # "APPLIED" | "REJECTED" | "EXECUTION_UNCERTAIN"
    reason: Optional[str]
    before_sha256: str
    after_sha256: str
    audit_record: dict


def _is_link_or_reparse(st: os.stat_result) -> bool:
    """True for symlinks and Windows reparse points (junctions etc.)."""
    if stat_module.S_ISLNK(st.st_mode):
        return True
    attrs = getattr(st, "st_file_attributes", None)
    reparse = getattr(stat_module, "FILE_ATTRIBUTE_REPARSE_POINT", None)
    if attrs is not None and reparse is not None:
        return bool(attrs & reparse)
    return False


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
        # MG-02: local per-permit admission locks.
        self._permit_locks: "dict[str, threading.Lock]" = {}
        self._registry_lock = threading.Lock()

    def _lock_for(self, permit_id: str) -> threading.Lock:
        with self._registry_lock:
            return self._permit_locks.setdefault(permit_id, threading.Lock())

    # ------------------------------------------------------------------
    # MG-01: safe target resolution — returns an OPEN fd bound to the
    # validated file, so validation and writing cannot diverge.
    # ------------------------------------------------------------------
    def _safe_open_target(self, target: str) -> int:
        root = self.vault_root
        if os.path.isabs(target) or ":" in target:
            raise Rejection(f"invalid target: {target!r}")
        parts = target.replace("\\", "/").split("/")
        if any(p in ("", ".", "..") for p in parts):
            raise Rejection(f"invalid target: {target!r}")

        current = root
        for component in parts[:-1]:
            current = os.path.join(current, component)
            try:
                st = os.lstat(current)
            except OSError as exc:
                raise Rejection(f"target parent missing: {component}") from exc
            if _is_link_or_reparse(st):
                raise Rejection(f"path escape: {component} is a symlink/reparse point")
            if not stat_module.S_ISDIR(st.st_mode):
                raise Rejection(f"target parent not a directory: {component}")

        file_path = os.path.join(current, parts[-1])
        try:
            lst = os.lstat(file_path)
        except OSError as exc:
            raise Rejection(f"target missing: {target}") from exc
        if _is_link_or_reparse(lst):
            raise Rejection(f"path escape: target is a symlink/reparse point")
        if not stat_module.S_ISREG(lst.st_mode):
            raise Rejection(f"target not a regular file: {target}")

        flags = os.O_RDWR | os.O_APPEND
        if hasattr(os, "O_BINARY"):
            flags |= os.O_BINARY
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        fd = os.open(file_path, flags)
        try:
            fst = os.fstat(fd)
            # Bind the fd to the exact path identity we validated:
            # if the path now resolves elsewhere, refuse.
            lst2 = os.lstat(file_path)
            if _is_link_or_reparse(lst2):
                raise Rejection("path escape: target became a symlink at open time")
            if lst2.st_ino and fst.st_ino and lst2.st_ino != fst.st_ino:
                raise Rejection("path escape: opened file differs from validated target")
            if lst2.st_dev and fst.st_dev and lst2.st_dev != fst.st_dev:
                raise Rejection("path escape: opened device differs from validated target")
        except BaseException:
            os.close(fd)
            raise
        return fd

    @staticmethod
    def _read_all(fd: int) -> bytes:
        os.lseek(fd, 0, os.SEEK_SET)
        chunks = []
        while True:
            chunk = os.read(fd, 65536)
            if not chunk:
                break
            chunks.append(chunk)
        return b"".join(chunks)

    # ------------------------------------------------------------------
    def execute(self, proposal: Proposal, permit: Permit) -> ExecutionResult:
        with self._lock_for(permit.permit_id):
            return self._execute_locked(proposal, permit)

    def _execute_locked(self, proposal: Proposal, permit: Permit) -> ExecutionResult:
        before = ""
        after = ""
        write_started = False
        fd: Optional[int] = None
        try:
            validate_proposal(proposal)
            validate_permit(permit, proposal, self.approver)
            if permit.selected_executor_id != self.executor_id:
                raise Rejection(
                    f"executor mismatch: permit selects {permit.selected_executor_id!r}, "
                    f"this executor is {self.executor_id!r}"
                )
            # MG-02/MG-04: atomic admission — an APPLIED or UNCERTAIN
            # permit never enters the append stage again.
            blocked = permit.permit_id in self.audit.blocked_permit_ids()
            if blocked:
                raise Rejection(f"duplicate permit execution: {permit.permit_id}")

            fd = self._safe_open_target(proposal.target)
            current = self._read_all(fd)
            before = sha256_hex(current)
            if before != proposal.base_sha256:
                raise Rejection(
                    f"stale base hash: file is {before}, proposal bound {proposal.base_sha256}"
                )

            expected_after = sha256_hex(current + proposal.payload)
            # MG-04 boundary: everything past this point may have
            # mutated the file; failures become EXECUTION_UNCERTAIN.
            write_started = True
            os.write(fd, proposal.payload)
            os.fsync(fd)

            readback = self._read_all(fd)
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
            status = "EXECUTION_UNCERTAIN" if write_started else "REJECTED"
            record = self.audit.append(
                self._record(proposal, permit, before, after, status, rejection.reason),
                timestamp=utc_now_iso(),
            )
            return ExecutionResult(status, rejection.reason, before, after, record)
        except OSError as exc:
            status = "EXECUTION_UNCERTAIN" if write_started else "REJECTED"
            reason = f"io error: {exc}"
            record = self.audit.append(
                self._record(proposal, permit, before, after, status, reason),
                timestamp=utc_now_iso(),
            )
            return ExecutionResult(status, reason, before, after, record)
        finally:
            if fd is not None:
                os.close(fd)

    @staticmethod
    def _record(
        proposal: Proposal,
        permit: Permit,
        before: str,
        after: str,
        status: str,
        reason: Optional[str],
    ) -> dict:
        return {
            "permit_id": permit.permit_id,
            "proposal_id": proposal.proposal_id,
            "proposal_digest": proposal.proposal_digest,
            "target": proposal.target,
            "executor": permit.selected_executor_id or "unknown",
            "before_sha256": before,
            "after_sha256": after,
            "result": f"{status}:{reason}" if reason else status,
        }

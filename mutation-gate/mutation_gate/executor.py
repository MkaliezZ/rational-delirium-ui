"""Executor: admission + ONE exact APPEND_EXISTING_NOTE + audit.

Security-hardened flow (MG-01..06):

  proposal validation (MG-05: empty payload rejected)
  → approval verification
  → executor admission (selected executor match)
  → SHARED per-permit admission lock (MG-02: the lock is keyed by the
    shared mutation state (audit path) + permit_id, so multiple
    Executor instances over the same state cannot both admit) and it
    covers duplicate check, admission, write and result persistence
  → blocked-permit check (APPLIED **or EXECUTION_UNCERTAIN** never
    runs again)
  → MG-01 secure target resolution: an identity chain is validated
    from the trusted mutation root down to the file (every component
    lstat-checked: no symlink / Windows reparse point, directories
    only), the file is opened ONCE (O_RDWR|O_APPEND), and the whole
    chain plus the opened descriptor are re-verified AFTER the open
    ("identity sandwich"), which rejects observable parent/file
    replacement races around the open.

  DOCUMENTED TRUST BOUNDARY (MG-01): this stdlib implementation does
  NOT claim absolute TOCTOU elimination against a hostile concurrent
  filesystem actor. Explicit assumption: the mutation root and its
  ancestors are NOT concurrently renamed/replaced by an external
  actor during execution. Within that boundary, the preserved
  symlink/reparse checks + identity sandwich + safe-failure behavior
  reject the realistic replacement races. This Python build has no
  dir_fd support (verified: os.supports_dir_fd is empty), so
  handle-based binding is approximated by file-ID identity; a full
  kernel-level path-resolution layer is out of MVP scope.
  → stale base hash check on the SAME fd
  → append EXACT bytes (O_APPEND) + fsync + readback verification
  → audit record (APPLIED / REJECTED:reason / EXECUTION_UNCERTAIN)

MG-04: once the write has begun, any failure is recorded as
EXECUTION_UNCERTAIN — the file may have changed, evidence is kept,
and the permit is blocked from automatic retry.

MG-06: the audit's `executor` field is ALWAYS the actual processing
executor (self.executor_id); the permit's requested executor is
stored separately as `requested_executor`.
"""

from __future__ import annotations

import hashlib
import os
import stat as stat_module
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

# --- cross-process advisory lock primitives -----------------------
try:
    import msvcrt

    def _lock_fd(fd: int) -> None:
        # Blocking acquire: CRT LK_LOCK gives up after ~10s, so loop
        # LK_NBLCK ourselves for indefinite (MVP) blocking.
        while True:
            try:
                os.lseek(fd, 0, os.SEEK_SET)
                msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
                return
            except OSError:
                time.sleep(0.01)

    def _unlock_fd(fd: int) -> None:
        try:
            os.lseek(fd, 0, os.SEEK_SET)
            msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
        except OSError:
            pass

except ImportError:  # POSIX
    import fcntl

    def _lock_fd(fd: int) -> None:
        fcntl.flock(fd, fcntl.LOCK_EX)

    def _unlock_fd(fd: int) -> None:
        fcntl.flock(fd, fcntl.LOCK_UN)

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


def _identity(st: os.stat_result) -> Tuple[object, object]:
    return (st.st_dev, st.st_ino)


# ----------------------------------------------------------------------
# MG-02: cross-process permit admission locks. Identity = shared
# mutation state (audit log location) + permit_id. Two layers:
#   1. an in-process shared threading lock (fast path, also makes
#      same-process multi-Executor races impossible);
#   2. an OS-level advisory FILE lock (msvcrt/fcntl) in a lock
#      directory beside the audit log — this serializes DIFFERENT
#      PROCESSES over the same state+permit.
# The lock covers duplicate check, admission, mutation execution and
# audit persistence (the whole _execute_locked critical section).
# ----------------------------------------------------------------------
_SHARED_PERMIT_LOCKS: "Dict[Tuple[str, str], threading.Lock]" = {}
_SHARED_LOCKS_GUARD = threading.Lock()


def shared_permit_lock(state_key: str, permit_id: str) -> threading.Lock:
    key = (os.path.abspath(state_key), permit_id)
    with _SHARED_LOCKS_GUARD:
        return _SHARED_PERMIT_LOCKS.setdefault(key, threading.Lock())


class CrossProcessPermitLock:
    """Advisory exclusive lock file keyed by state location + permit
    id. Held across the entire execution critical section. Lock files
    persist (deleting lock files reintroduces races); they are empty
    and never contain secrets."""

    def __init__(self, state_path: str, permit_id: str) -> None:
        lock_dir = os.path.join(
            os.path.dirname(os.path.abspath(state_path)), "permit-locks"
        )
        os.makedirs(lock_dir, exist_ok=True)
        key = hashlib.sha256(
            (os.path.abspath(state_path) + chr(0) + permit_id).encode("utf-8")
        ).hexdigest()[:40]
        self._path = os.path.join(lock_dir, key + ".lock")
        self._fd: Optional[int] = None

    def __enter__(self) -> "CrossProcessPermitLock":
        flags = os.O_RDWR | os.O_CREAT
        if hasattr(os, "O_BINARY"):
            flags |= os.O_BINARY
        self._fd = os.open(self._path, flags, 0o600)
        _lock_fd(self._fd)
        return self

    def __exit__(self, *exc) -> None:
        if self._fd is not None:
            _unlock_fd(self._fd)
            os.close(self._fd)
            self._fd = None


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
        state_path = getattr(self.audit, "state_path", None)
        if not isinstance(state_path, str) or not state_path:
            raise TypeError("audit log must expose a stable state_path")
        self._state_key = state_path  # shared-mutation-state identity

    # ------------------------------------------------------------------
    # MG-01: secure resolution returning ONE open fd proven to be the
    # validated target (identity sandwich around the open).
    # ------------------------------------------------------------------
    def _validate_chain(self, parts) -> list:
        """lstat every component from the trusted root; returns the
        validated identity chain [root, dir..., file]."""
        chain = []
        current = self.vault_root
        st = os.lstat(current)
        if _is_link_or_reparse(st) or not stat_module.S_ISDIR(st.st_mode):
            raise Rejection("invalid mutation root")
        chain.append(_identity(st))
        for component in parts[:-1]:
            current = os.path.join(current, component)
            st = os.lstat(current)
            if _is_link_or_reparse(st):
                raise Rejection(f"path escape: {component} is a symlink/reparse point")
            if not stat_module.S_ISDIR(st.st_mode):
                raise Rejection(f"target parent not a directory: {component}")
            chain.append(_identity(st))
        file_path = os.path.join(current, parts[-1])
        st = os.lstat(file_path)
        if _is_link_or_reparse(st):
            raise Rejection("path escape: target is a symlink/reparse point")
        if not stat_module.S_ISREG(st.st_mode):
            raise Rejection(f"target not a regular file")
        chain.append(_identity(st))
        return chain

    def _revalidate_chain(self, parts, chain) -> str:
        """Post-open half of the sandwich: the path must still resolve
        through IDENTICAL components; returns the final file path."""
        current = self.vault_root
        for idx, component in enumerate(parts[:-1]):
            current = os.path.join(current, component)
            st = os.lstat(current)
            if _is_link_or_reparse(st):
                raise Rejection(f"path escape: {component} became a symlink/reparse point")
            if _identity(st) != chain[idx + 1]:
                raise Rejection(f"path identity changed during open: {component}")
        file_path = os.path.join(current, parts[-1])
        st = os.lstat(file_path)
        if _is_link_or_reparse(st):
            raise Rejection("path escape: target became a symlink at open time")
        if _identity(st) != chain[-1]:
            raise Rejection("path identity changed during open: target")
        return file_path

    def _safe_open_target(self, target: str) -> int:
        if os.path.isabs(target) or ":" in target or "\\" in target:
            raise Rejection(f"invalid target: {target!r}")
        parts = target.split("/")
        if any(p in ("", ".", "..") for p in parts):
            raise Rejection(f"invalid target: {target!r}")

        chain = self._validate_chain(parts)

        file_path = os.path.join(self.vault_root, *parts)
        flags = os.O_RDWR | os.O_APPEND
        if hasattr(os, "O_BINARY"):
            flags |= os.O_BINARY
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        fd = os.open(file_path, flags)
        try:
            fst = os.fstat(fd)
            if fst.st_ino and chain[-1][1] and fst.st_ino != chain[-1][1]:
                raise Rejection("open/bind mismatch: descriptor is not the validated file")
            # post-open sandwich: every ancestor identity must be unchanged
            final_path = self._revalidate_chain(parts, chain)
            lst = os.lstat(final_path)
            if lst.st_ino and fst.st_ino and lst.st_ino != fst.st_ino:
                raise Rejection("open/bind mismatch: path resolved elsewhere")
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
        # MG-02: same mutation state + permit serializes across ALL
        # Executor instances AND across processes (advisory file
        # lock); covers duplicate check, admission, mutation
        # execution and audit persistence.
        with shared_permit_lock(self._state_key, permit.permit_id):
            with CrossProcessPermitLock(self._state_key, permit.permit_id):
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
                    "requested_executor": permit.selected_executor_id or None,
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

    def _record(
        self,
        proposal: Proposal,
        permit: Permit,
        before: str,
        after: str,
        status: str,
        reason: Optional[str],
    ) -> dict:
        # MG-06: `executor` is ALWAYS the actual processing executor;
        # the permit's requested executor is kept separately.
        return {
            "permit_id": permit.permit_id,
            "proposal_id": proposal.proposal_id,
            "proposal_digest": proposal.proposal_digest,
            "target": proposal.target,
            "executor": self.executor_id,
            "requested_executor": permit.selected_executor_id or None,
            "before_sha256": before,
            "after_sha256": after,
            "result": f"{status}:{reason}" if reason else status,
        }

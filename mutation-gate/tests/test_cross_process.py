"""MG-02: cross-PROCESS permit locking regressions.

1. same audit state, same permit, two processes → one mutation;
2. same audit state referenced via DIFFERENT PATH ALIASES
   (case variant / 8.3 short name / symlink / POSIX alias as
   available) → lock identity must converge → still one mutation.
"""

from __future__ import annotations

import ctypes
import os
import subprocess
import sys
import tempfile
import unittest

WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "proc_worker.py")
BASE = b"---\ntype: case\n---\n\noriginal body\n"
PAYLOAD = b"\nCROSS-PROCESS APPEND\n"


def _run_pair(tmp: str, audit_paths) -> tuple:
    vault = os.path.join(tmp, "vault")
    procs = [
        subprocess.Popen(
            [sys.executable, WORKER, vault, audit_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        for audit_path in audit_paths
    ]
    outputs = []
    for p in procs:
        out, err = p.communicate(timeout=60)
        assert p.returncode == 0, err
        outputs.append(out.strip().splitlines()[-1])
    return tuple(sorted(outputs))


def _assert_single_mutation(tmp: str, outputs: tuple) -> None:
    assert list(outputs) == ["APPLIED", "REJECTED"], outputs
    note = os.path.join(tmp, "vault", "CASES", "A.md")
    with open(note, "rb") as fh:
        assert fh.read() == BASE + PAYLOAD  # exactly ONE append
    audit_path = os.path.join(tmp, "state", "audit.jsonl")
    with open(audit_path, "rb") as fh:
        records = [
            line.decode("utf-8")
            for line in fh.read().splitlines()
            if line.strip()
        ]
    assert len(records) == 2
    results = sorted(r.split('"result":"')[1].split('"')[0] for r in records)
    assert results[0].startswith("APPLIED")
    assert results[1].startswith("REJECTED")
    # audit chain integrity from the canonical path
    from mutation_gate import AuditLog

    log = AuditLog(audit_path)
    assert log.verify_chain()


class CrossProcessPermitLockTest(unittest.TestCase):
    def test_two_processes_same_permit_exactly_one_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            outputs = _run_pair(
                tmp, [os.path.join(tmp, "state", "audit.jsonl")] * 2
            )
            _assert_single_mutation(tmp, outputs)

    def test_path_aliases_converge_to_one_lock(self):
        with tempfile.TemporaryDirectory() as tmp:
            real = os.path.join(tmp, "state", "audit.jsonl")
            os.makedirs(os.path.dirname(real), exist_ok=True)
            open(real, "wb").close()

            aliases = [real]
            # alias: case variant (Windows filesystems are case-insensitive)
            case_alias = real.replace(
                os.sep + "state" + os.sep, os.sep + "STATE" + os.sep
            )
            if case_alias != real:
                aliases.append(case_alias)
            # alias: 8.3 short path (Windows)
            try:
                buf = ctypes.create_unicode_buffer(260)
                n = ctypes.windll.kernel32.GetShortPathNameW(real, buf, 260)
                if n and buf.value and buf.value != real:
                    aliases.append(buf.value)
            except (AttributeError, OSError):
                pass
            # alias: symlink to the state FILE (POSIX + privileged Windows)
            link = os.path.join(tmp, "state_alias.jsonl")
            try:
                os.symlink(real, link)
                aliases.append(link)
            except (OSError, NotImplementedError):
                pass
            # alias: POSIX /tmp vs /private/tmp style (macOS)
            if sys.platform == "darwin":
                replaced = tmp.replace("/private/tmp", "/tmp", 1)
                if replaced != tmp:
                    aliases.append(
                        os.path.join(replaced, "state", "audit.jsonl")
                    )

            usable = [a for a in aliases if os.path.exists(a)]
            # canonical identity must already converge for every alias
            from mutation_gate.executor import canonical_state_identity

            identities = {canonical_state_identity(a) for a in usable}
            self.assertEqual(
                len(identities), 1,
                msg=f"aliases did not converge: {usable} -> {identities}",
            )
            self.assertGreaterEqual(len(usable), 2, msg=f"no alias available: {usable}")

            # two processes: real path + a DIFFERENT alias
            second = next(a for a in usable if a != real)
            outputs = _run_pair(tmp, [real, second])
            _assert_single_mutation(tmp, outputs)


if __name__ == "__main__":
    unittest.main()

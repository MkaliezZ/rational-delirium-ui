"""MG-02 final: cross-PROCESS permit locking regression."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest

WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "proc_worker.py")


class CrossProcessPermitLockTest(unittest.TestCase):
    def test_two_processes_same_permit_exactly_one_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            # two SEPARATE OS processes, same shared audit state + permit
            procs = [
                subprocess.Popen(
                    [sys.executable, WORKER, tmp],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )
                for _ in range(2)
            ]
            outputs = []
            for p in procs:
                out, err = p.communicate(timeout=60)
                self.assertEqual(p.returncode, 0, msg=err)
                outputs.append(out.strip().splitlines()[-1])
            self.assertEqual(sorted(outputs), ["APPLIED", "REJECTED"])

            note = os.path.join(tmp, "vault", "CASES", "A.md")
            with open(note, "rb") as fh:
                content = fh.read()
            base = b"---\ntype: case\n---\n\noriginal body\n"
            payload = b"\nCROSS-PROCESS APPEND\n"
            self.assertEqual(content, base + payload)  # exactly ONE append

            audit_path = os.path.join(tmp, "state", "audit.jsonl")
            with open(audit_path, "rb") as fh:
                records = [
                    line.decode("utf-8")
                    for line in fh.read().splitlines()
                    if line.strip()
                ]
            self.assertEqual(len(records), 2)
            results = sorted(r.split('"result":"')[1].split('"')[0] for r in records)
            self.assertTrue(results[0].startswith("APPLIED"))
            self.assertTrue(results[1].startswith("REJECTED"))


if __name__ == "__main__":
    unittest.main()

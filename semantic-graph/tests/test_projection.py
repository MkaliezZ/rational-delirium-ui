"""RD v1.2.1 — Semantic Graph Projection MVP tests.

Covers the eight required test cases plus boundary proofs:
9. dangling edge -> unresolved, never silent, never auto-created
10. similar text/content yields zero inferred edges
11. duplicate object_id excluded, no silent choice

Run: python -m unittest discover -s semantic-graph/tests -v
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import projector  # noqa: E402


def ko_md(
    object_id="ko-20260921-0001",
    kind="observation",
    status="candidate",
    title="A fictional observation",
    predecessor=None,
    successor=None,
    relations=None,
    evidence_entries=True,
    extra_frontmatter="",
    body="",
):
    rel = relations or {}
    rel_lines = []
    for name in projector.RELATIONS:
        targets = rel.get(name, [])
        if targets:
            rel_lines.append(f"{name}:")
            for t in targets:
                rel_lines.append(f'  - "{t}"')
        else:
            rel_lines.append(f"{name}: []")
    evidence = ""
    if evidence_entries:
        evidence = (
            "evidence_reference:\n"
            '  - claim: "source says X"\n'
            '    source: "log line 41"\n'
            "    kind: source-statement\n"
            "source_reference: []\n"
            "provenance:\n"
            '  observation: "what was observed"\n'
            '  evidence: "where it came from"\n'
            '  inference: "what was derived"\n'
            '  conclusion: "current understanding"\n'
        )
    fm = "\n".join(
        [
            "---",
            f'object_id: "{object_id}"',
            f"kind: {kind}",
            f"title: \"{title}\"",
            f"status: {status}",
            'created_at: "2026-09-21T00:00Z"',
            'updated_at: "2026-09-21T00:00Z"',
            "promotion_record: null",
            'workspace_context: "FICT-TEST"',
            "created_from:",
            '  - "workflow/research-r1.md"',
            'creator_role: "research"',
            evidence,
            extra_frontmatter,
            f"predecessor: {json.dumps(predecessor)}",
            f"successor: {json.dumps(successor)}",
            *rel_lines,
            "---",
            "",
        ]
    )
    return fm + body


def write(tmp, name, content):
    p = Path(tmp) / name
    p.write_text(content, encoding="utf-8", newline="\n")
    return str(p)


class SemanticGraphProjectionTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = self._tmp.name
        self.addCleanup(self._tmp.cleanup)

    def project(self, *names):
        return projector.project([str(Path(self.tmp) / n) for n in names])

    # 1. Valid KO becomes node
    def test_valid_ko_becomes_node(self):
        write(self.tmp, "ko-a.md", ko_md(object_id="ko-20260921-0001", kind="observation", status="active"))
        art = self.project("ko-a.md")
        self.assertEqual(
            art["nodes"],
            [{
                "object_id": "ko-20260921-0001",
                "kind": "observation",
                "status": "active",
                "title": "A fictional observation",
                "predecessor": None,
                "successor": None,
            }],
        )
        self.assertEqual(art["edges"], [])
        self.assertEqual(art["unresolved"], [])

    # 2. Invalid markdown excluded
    def test_invalid_markdown_excluded(self):
        write(self.tmp, "plain.md", "# Just a note\n\nNo frontmatter at all.\n")
        write(self.tmp, "no-id.md", ko_md()[10:])  # frontmatter missing object_id line
        write(self.tmp, "bad-kind.md", ko_md(kind="evidence"))  # evidence is NOT a kind
        write(self.tmp, "bad-status.md", ko_md(status="approved"))
        write(self.tmp, "empty-title.md", ko_md(title=""))
        write(self.tmp, "bad-id.md", ko_md(object_id="note-a"))
        write(self.tmp, "artifact.md", "---\nhandoff_type: research\nunknowns: []\n---\n# Workflow artifact\n")
        art = self.project("plain.md", "no-id.md", "bad-kind.md", "bad-status.md",
                           "empty-title.md", "bad-id.md", "artifact.md")
        self.assertEqual(art["nodes"], [])
        self.assertEqual(art["edges"], [])

    # 3. Declared relation becomes edge
    def test_declared_relation_becomes_edge(self):
        write(self.tmp, "a.md", ko_md(object_id="ko-20260921-0001"))
        write(self.tmp, "b.md", ko_md(object_id="ko-20260921-0002",
                                      relations={"supports": ["ko-20260921-0001"]}))
        art = self.project("a.md", "b.md")
        self.assertEqual(art["edges"], [{
            "source": "ko-20260921-0002",
            "target": "ko-20260921-0001",
            "relation": "supports",
        }])

    # 4. Markdown link does not become edge
    def test_markdown_link_does_not_become_edge(self):
        body = (
            "## Observation\n\nSee [[ko-20260921-0009]] and "
            "[[Concept]] and [a link](ko-20260921-0009.md) and "
            "[[folder/ko-20260921-0009|alias]].\n\n"
            "Filename mention: ko-20260921-0009.md lives in EVIDENCE/.\n"
        )
        write(self.tmp, "a.md", ko_md(object_id="ko-20260921-0001", body=body))
        art = self.project("a.md")
        self.assertEqual(art["nodes"][0]["object_id"], "ko-20260921-0001")
        self.assertEqual(art["edges"], [])
        self.assertEqual(art["unresolved"], [])

    # 5. Evidence reference does not become node
    def test_evidence_reference_not_node(self):
        write(self.tmp, "a.md", ko_md(object_id="ko-20260921-0001",
                                      extra_frontmatter='evidence_note: "EV-77"',
                                      evidence_entries=True))
        art = self.project("a.md")
        self.assertEqual(len(art["nodes"]), 1)  # only the KO itself
        self.assertEqual(art["nodes"][0]["object_id"], "ko-20260921-0001")
        blob = json.dumps(art)
        self.assertNotIn("EV-77", blob)          # evidence data never enters the graph
        self.assertNotIn("claim", blob)
        self.assertNotIn("provenance", blob)

    # 6. Contradiction preserved (represented only, never resolved)
    def test_contradiction_preserved(self):
        write(self.tmp, "a.md", ko_md(object_id="ko-20260921-0001", status="active"))
        write(self.tmp, "b.md", ko_md(object_id="ko-20260921-0002", status="active",
                                      relations={"contradicts": ["ko-20260921-0001"]}))
        art = self.project("a.md", "b.md")
        self.assertEqual(art["edges"], [{
            "source": "ko-20260921-0002",
            "target": "ko-20260921-0001",
            "relation": "contradicts",
        }])
        # Both sides remain nodes at their own statuses; nothing ranked/scored
        statuses = {n["object_id"]: n["status"] for n in art["nodes"]}
        self.assertEqual(statuses, {"ko-20260921-0001": "active", "ko-20260921-0002": "active"})
        # No resolution machinery anywhere in the artifact: banned KEY
        # names must not appear ("unresolved" is the dangling-edge
        # report, a different, required concept).
        def all_keys(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    yield k
                    yield from all_keys(v)
            elif isinstance(obj, list):
                for v in obj:
                    yield from all_keys(v)
        keys = set(all_keys(art))
        for banned in ("score", "confidence", "winner", "rank", "resolved"):
            self.assertNotIn(banned, keys)

    # 7. Revision lineage preserved (historical objects remain)
    def test_revision_lineage_preserved(self):
        write(self.tmp, "r1.md", ko_md(object_id="ko-20260921-0001", kind="observation",
                                       status="superseded", successor="ko-20260921-0002"))
        write(self.tmp, "r2.md", ko_md(object_id="ko-20260921-0002", kind="observation",
                                       status="active", predecessor="ko-20260921-0001",
                                       relations={"revises": ["ko-20260921-0001"]}))
        art = self.project("r1.md", "r2.md")
        ids = [n["object_id"] for n in art["nodes"]]
        self.assertEqual(ids, ["ko-20260921-0001", "ko-20260921-0002"])  # history stays
        r2 = art["nodes"][1]
        self.assertEqual(r2["predecessor"], "ko-20260921-0001")
        self.assertEqual(art["nodes"][0]["successor"], "ko-20260921-0002")
        self.assertIn({"source": "ko-20260921-0002", "target": "ko-20260921-0001",
                       "relation": "revises"}, art["edges"])

    # 8. Graph regenerated twice produces identical output
    def test_regenerate_identical(self):
        write(self.tmp, "a.md", ko_md(object_id="ko-20260921-0001"))
        write(self.tmp, "b.md", ko_md(object_id="ko-20260921-0002",
                                      relations={"contradicts": ["ko-20260921-0001"],
                                                 "depends_on": ["ko-20260921-0001"]}))
        first = json.dumps(projector.project([str(Path(self.tmp) / "a.md"),
                                              str(Path(self.tmp) / "b.md")]), sort_keys=False)
        second = json.dumps(projector.project([str(Path(self.tmp) / "b.md"),
                                               str(Path(self.tmp) / "a.md")]), sort_keys=False)
        self.assertEqual(first, second)  # identical bytes regardless of input order
        art = json.loads(first)
        self.assertNotIn("generated_at", art)  # no timestamps in derived state

    # 9. Dangling edge target -> unresolved (never silent, never auto-created)
    def test_dangling_edge_unresolved(self):
        write(self.tmp, "a.md", ko_md(object_id="ko-20260921-0001",
                                      relations={"supports": ["ko-20260921-9999"]}))
        art = self.project("a.md")
        self.assertEqual(art["edges"], [])
        self.assertEqual(art["unresolved"], [{
            "source": "ko-20260921-0001",
            "target": "ko-20260921-9999",
            "relation": "supports",
        }])
        self.assertEqual([n["object_id"] for n in art["nodes"]], ["ko-20260921-0001"])

    # 10. No inference: near-identical content produces zero edges
    def test_no_inferred_edges_from_similarity(self):
        same_body = ("## Observation\n\nThe fictional FR-12 rack reported 42.1 s and "
                     "11.3 s for the DS-88 index rebuild.\n")
        write(self.tmp, "a.md", ko_md(object_id="ko-20260921-0001", title="DS-88 rebuild timing", body=same_body))
        write(self.tmp, "b.md", ko_md(object_id="ko-20260921-0002", title="DS-88 rebuild timing (copy)", body=same_body))
        art = self.project("a.md", "b.md")
        self.assertEqual(len(art["nodes"]), 2)
        self.assertEqual(art["edges"], [])

    # 11. Duplicate object_id -> excluded, no silent choice, diagnosed
    def test_duplicate_object_id_excluded(self):
        write(self.tmp, "a1.md", ko_md(object_id="ko-20260921-0001", title="First claim"))
        write(self.tmp, "a2.md", ko_md(object_id="ko-20260921-0001", title="Second claim",
                                       relations={"supports": ["ko-20260921-0002"]}))
        write(self.tmp, "b.md", ko_md(object_id="ko-20260921-0002"))
        art = self.project("a1.md", "a2.md", "b.md")
        self.assertEqual([n["object_id"] for n in art["nodes"]], ["ko-20260921-0002"])
        self.assertEqual(art["edges"], [])
        self.assertEqual(art["unresolved"], [])  # ambiguous source excluded with its edges
        # SGP-02: deterministic duplicate_identity diagnostic; no winner
        self.assertEqual(len(art["diagnostics"]), 1)
        diag = art["diagnostics"][0]
        self.assertEqual(diag["type"], "duplicate_identity")
        self.assertEqual(diag["object_id"], "ko-20260921-0001")
        self.assertEqual(sorted(diag["paths"]), sorted([
            str(Path(self.tmp) / "a1.md"), str(Path(self.tmp) / "a2.md")]))
        self.assertNotIn("winner", diag)
        self.assertNotIn("selected", diag)

    # SGP-02 test 1: duplicate id with NO incoming edges still diagnosed
    def test_duplicate_diagnostic_without_incoming_edges(self):
        write(self.tmp, "a1.md", ko_md(object_id="ko-20260921-0001"))
        write(self.tmp, "a2.md", ko_md(object_id="ko-20260921-0001"))
        write(self.tmp, "b.md", ko_md(object_id="ko-20260921-0002",
                                      relations={"supports": ["ko-20260921-0003"]}))
        art = self.project("a1.md", "a2.md", "b.md")
        self.assertEqual([n["object_id"] for n in art["nodes"]], ["ko-20260921-0002"])
        self.assertEqual(art["diagnostics"], [{
            "type": "duplicate_identity",
            "object_id": "ko-20260921-0001",
            "paths": sorted([str(Path(self.tmp) / "a1.md"), str(Path(self.tmp) / "a2.md")]),
        }])

    # SGP-02 test 2: duplicate never selects a winner (deterministic re-run,
    # same exclusion regardless of input order)
    def test_duplicate_never_selects_winner(self):
        write(self.tmp, "a1.md", ko_md(object_id="ko-20260921-0001", title="First claim"))
        write(self.tmp, "a2.md", ko_md(object_id="ko-20260921-0001", title="Second claim"))
        first = self.project("a1.md", "a2.md")
        second = self.project("a2.md", "a1.md")
        self.assertEqual(first, second)  # order-independent, deterministic
        self.assertEqual(first["nodes"], [])  # neither copy survives
        self.assertEqual(len(first["diagnostics"][0]["paths"]), 2)

    # SGP-01 test 3: documented contract distinguishes projection
    # eligibility from Knowledge Object validity
    def test_projection_contract_documents_eligibility_vs_validity(self):
        source = (Path(__file__).resolve().parents[1] / "projector.py").read_text(encoding="utf-8")
        flat = " ".join(source.split())  # docstrings wrap lines; compare on normalized text
        self.assertIn("Projection eligibility is NOT Knowledge Object validity", flat)
        self.assertIn("NOT a full Knowledge Object validator", flat)
        self.assertIn("Knowledge Management", flat)  # where full validation belongs
        self.assertIn("declared a valid Knowledge Object", flat)  # no validity declaration
        report = (Path(__file__).resolve().parents[2] / "docs" /
                  "RD_V1_2_1_IMPLEMENTATION_REPORT.md").read_text(encoding="utf-8")
        flat = " ".join(report.split())
        self.assertIn("projection eligibility", flat.lower())
        self.assertIn("NOT a full Knowledge Object validator", flat)


if __name__ == "__main__":
    unittest.main()

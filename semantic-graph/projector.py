"""RD v1.2.1 — Semantic Graph Projection MVP (standalone, stdlib only).

Projects Markdown files carrying the RD v1.1.0 Knowledge Object
frontmatter into a derived semantic-graph artifact (JSON):
nodes (object_id, kind, status, title, predecessor, successor) and
edges ({source, target, relation} from declared relations only).

Boundaries, by construction:

- Reads ONLY the YAML frontmatter block; the note body is never
  scanned. Wikilinks, markdown links, filenames, folder structure,
  and text similarity therefore CANNOT produce nodes or edges.
- Only declared frontmatter relations become edges (supports,
  contradicts, derived_from, depends_on, revises, supersedes).
  No inference of any kind.
- Only valid Knowledge Objects become nodes. **Projection
  eligibility is NOT Knowledge Object validity**: the projector
  checks exactly the fields the graph needs (object_id format,
  kind enum, status enum, non-empty title) and nothing more. It is
  NOT a full Knowledge Object validator — full schema and lifecycle
  validation (all v1.1.0 required fields, provenance completeness,
  evidence_reference discipline, promotion records, status
  transition legality) belongs to the Knowledge Management
  validation workflow (Skill instructions §6/§11). A file that
  becomes a node here is NOT thereby declared a valid Knowledge
  Object, and incomplete provenance or evidence never blocks
  projection — the projector reads neither.
- contradicts is represented, never resolved: the artifact schema
  has no rank, score, confidence, or winner fields, so none can be
  produced.
- Provenance layers (Observation / Evidence / Inference /
  Conclusion) are not read at all. They stay authoritative in the
  source files — never merged, never upgraded, not duplicated into
  derived state.
- Duplicate object_id across files is ambiguous node identity:
  all copies are excluded rather than silently choosing one, and a
  deterministic diagnostic is emitted (type duplicate_identity,
  with every declaring path) — no resolution, no merge, no winner
  selection, no object mutation.
  Edges to non-existent ids are reported under "unresolved",
  never dropped silently, never auto-created (v1.2.0 §12 G).
- Output is derived state: deterministic (no timestamps, stable
  ordering), rebuildable from frontmatter alone; deleting it loses
  nothing. The artifact grants no authority to anything.

Usage:
    python semantic-graph/projector.py <file-or-dir>... [-o out.json]

With -o omitted, the JSON artifact is written to stdout.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Optional

SCHEMA_TAG = "rd-semantic-graph-projection/1"

KINDS = frozenset(
    {"observation", "fact", "concept", "hypothesis", "decision", "reference", "process"}
)
STATUSES = frozenset({"candidate", "reviewed", "active", "superseded", "archived"})
RELATIONS = ("supports", "contradicts", "derived_from", "depends_on", "revises", "supersedes")
NEEDED_SCALARS = frozenset({"object_id", "kind", "title", "status", "predecessor", "successor"})

_OBJECT_ID_RE = re.compile(r"^ko-\d{8}-\d+$")
_TOP_KEY_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*):(.*)$")
_LIST_ITEM_RE = re.compile(r"^\s+-\s+(.*)$")


def _normalize(text: str) -> str:
    if text.startswith("\ufeff"):
        text = text[1:]
    return text.replace("\r\n", "\n").replace("\r", "\n")


def extract_frontmatter(text: str) -> Optional[str]:
    """Return the frontmatter block between the opening `---` and the
    next `---` line, or None when the file has none. The body is
    discarded here and never examined again."""
    text = _normalize(text)
    if not text.startswith("---\n"):
        return None
    lines = text.split("\n")
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return "\n".join(lines[1:i])
    return None


def _scalar(raw: str) -> Optional[str]:
    """Parse a YAML-subset scalar: quoted string, plain string with an
    optional trailing comment, or null. Returns None for null/empty."""
    v = raw.strip()
    if not v:
        return None
    if v[0] in ('"', "'"):
        q = v[0]
        end = v.find(q, 1)
        if end == -1:
            return None  # unterminated quote — malformed
        inner = v[1:end]
        return inner if inner else None
    if " #" in v:
        v = v.split(" #", 1)[0].rstrip()
    if v in ("null", "~"):
        return None
    return v


def parse_ko(frontmatter: str) -> Optional[dict]:
    """Parse a frontmatter block into node data + declared relations.
    Returns None when the file is not a valid Knowledge Object for
    projection purposes (node-relevant fields only; not a full
    schema validation)."""
    scalars: dict[str, Optional[str]] = {}
    relations: dict[str, list[str]] = {r: [] for r in RELATIONS}
    lines = frontmatter.split("\n")
    i, n = 0, len(lines)
    while i < n:
        m = _TOP_KEY_RE.match(lines[i])
        if m:
            key, rest = m.group(1), m.group(2)
            if key in NEEDED_SCALARS:
                scalars[key] = _scalar(rest)
                i += 1
                continue
            if key in relations:
                rest = rest.strip()
                if rest == "[]":
                    i += 1
                    continue
                if rest:
                    return None  # relations are block lists in this subset
                i += 1
                while i < n:
                    lm = _LIST_ITEM_RE.match(lines[i])
                    if not lm:
                        break
                    val = _scalar(lm.group(1))
                    if val is None:
                        return None  # malformed relation entry
                    relations[key].append(val)
                    i += 1
                continue
        i += 1

    object_id = scalars.get("object_id")
    kind = scalars.get("kind")
    status = scalars.get("status")
    title = scalars.get("title")
    if not object_id or not _OBJECT_ID_RE.match(object_id):
        return None
    if kind not in KINDS:
        return None
    if status not in STATUSES:
        return None
    if not title:
        return None
    return {
        "object_id": object_id,
        "kind": kind,
        "status": status,
        "title": title,
        "predecessor": scalars.get("predecessor"),
        "successor": scalars.get("successor"),
        "relations": relations,
    }


def _collect_markdown(inputs: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in inputs:
        p = Path(raw)
        if p.is_dir():
            files.extend(sorted(q for q in p.rglob("*.md") if q.is_file()))
        elif p.is_file():
            files.append(p)
    return files


def project(inputs: list[str]) -> dict:
    """Project Markdown inputs into the semantic-graph artifact.
    Pure function of file contents; deterministic."""
    parsed: list[dict] = []
    declared_paths: dict[str, list[str]] = {}
    for path in _collect_markdown(inputs):
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue  # unreadable/non-UTF-8 files are not KOs; excluded
        fm = extract_frontmatter(text)
        if fm is None:
            continue
        ko = parse_ko(fm)
        if ko is not None:
            parsed.append(ko)
            declared_paths.setdefault(ko["object_id"], []).append(str(path))

    # Ambiguous node identity: an object_id declared by more than one
    # file is excluded entirely rather than silently chosen, and is
    # REPORTED as a deterministic diagnostic (never resolved).
    id_counts: dict[str, int] = {}
    for ko in parsed:
        id_counts[ko["object_id"]] = id_counts.get(ko["object_id"], 0) + 1
    unique = [ko for ko in parsed if id_counts[ko["object_id"]] == 1]
    node_ids = {ko["object_id"] for ko in unique}

    diagnostics = [
        {
            "type": "duplicate_identity",
            "object_id": object_id,
            "paths": sorted(declared_paths[object_id]),
        }
        for object_id in sorted(id_counts)
        if id_counts[object_id] > 1
    ]

    nodes = [
        {
            "object_id": ko["object_id"],
            "kind": ko["kind"],
            "status": ko["status"],
            "title": ko["title"],
            "predecessor": ko["predecessor"],
            "successor": ko["successor"],
        }
        for ko in sorted(unique, key=lambda k: k["object_id"])
    ]

    edges: list[dict] = []
    unresolved: list[dict] = []
    for ko in sorted(unique, key=lambda k: k["object_id"]):
        for relation in RELATIONS:
            for target in ko["relations"][relation]:
                edge = {"source": ko["object_id"], "target": target, "relation": relation}
                if target in node_ids:
                    edges.append(edge)
                else:
                    unresolved.append(edge)

    def _dedupe_sorted(items: list[dict]) -> list[dict]:
        seen = set()
        out = []
        for e in sorted(items, key=lambda e: (e["source"], e["relation"], e["target"])):
            key = (e["source"], e["relation"], e["target"])
            if key not in seen:
                seen.add(key)
                out.append(e)
        return out

    return {
        "schema": SCHEMA_TAG,
        "nodes": nodes,
        "edges": _dedupe_sorted(edges),
        "unresolved": _dedupe_sorted(unresolved),
        "diagnostics": diagnostics,
    }


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Project RD v1.1.0 Knowledge Object Markdown files "
        "into a derived semantic-graph JSON artifact."
    )
    parser.add_argument("inputs", nargs="+", help="Markdown files and/or directories")
    parser.add_argument("-o", "--output", help="output JSON path (default: stdout)")
    args = parser.parse_args(argv)

    artifact = project(args.inputs)
    text = json.dumps(artifact, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8", newline="\n")
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

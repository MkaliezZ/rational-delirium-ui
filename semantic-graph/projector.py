"""RD v1.2.1 — Semantic Graph Projection MVP (standalone KO compatibility exporter; PyYAML).

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

import yaml
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


class StrictLoader(yaml.SafeLoader):
    """Safe YAML with duplicate keys, aliases, anchors and merge keys refused."""


# YAML 1.2 core behavior for ordinary strings such as yes/no and dates.
StrictLoader.yaml_implicit_resolvers = {
    key: [(tag, pattern) for tag, pattern in entries
          if tag not in {"tag:yaml.org,2002:bool", "tag:yaml.org,2002:timestamp"}]
    for key, entries in yaml.SafeLoader.yaml_implicit_resolvers.items()
}
StrictLoader.add_implicit_resolver("tag:yaml.org,2002:bool",
    re.compile(r"^(?:true|True|TRUE|false|False|FALSE)$"), list("tTfF"))


def _mapping(loader, node):
    result = {}
    for key_node, value_node in node.value:
        if key_node.tag == "tag:yaml.org,2002:merge":
            raise ValueError("YAML merge keys are not supported")
        key = loader.construct_object(key_node)
        if not isinstance(key, str) or key in result:
            raise ValueError("non-string or duplicate YAML key")
        result[key] = loader.construct_object(value_node)
    return result


StrictLoader.add_constructor("tag:yaml.org,2002:map", _mapping)


def parse_fields(frontmatter: str) -> dict:
    for event in yaml.parse(frontmatter):
        if isinstance(event, yaml.events.AliasEvent) or getattr(event, "anchor", None):
            raise ValueError("YAML aliases and anchors are not supported")
    fields = yaml.load(frontmatter, Loader=StrictLoader)
    if not isinstance(fields, dict):
        raise ValueError("frontmatter must be a mapping")
    return fields


def parse_ko(frontmatter: str) -> Optional[dict]:
    """Full safe YAML parsing; this compatibility exporter remains KO-only.
    Use npm run project-graph for the unified legacy + KO runtime projection."""
    try:
        fields = parse_fields(frontmatter)
    except (yaml.YAMLError, ValueError, TypeError):
        return None
    object_id = fields.get("object_id")
    kind, status, title = (fields.get(key) for key in ("kind", "status", "title"))
    if not isinstance(object_id, str) or not _OBJECT_ID_RE.fullmatch(object_id):
        return None
    if not isinstance(kind, str) or kind not in KINDS:
        return None
    if not isinstance(status, str) or status not in STATUSES:
        return None
    if not isinstance(title, str) or not title.strip():
        return None
    if "id" in fields and fields["id"] != object_id:
        return None
    relations = {}
    for relation in RELATIONS:
        value = fields.get(relation)
        if value is None:
            items = []
        elif isinstance(value, str):
            items = [value]
        elif isinstance(value, list):
            items = value
        else:
            return None
        if any(not isinstance(item, str) or not item.strip() for item in items):
            return None
        relations[relation] = [item.strip() for item in items]
    return {"object_id": object_id, "kind": kind, "status": status, "title": title,
            "predecessor": fields.get("predecessor") if isinstance(fields.get("predecessor"), str) else None,
            "successor": fields.get("successor") if isinstance(fields.get("successor"), str) else None,
            "relations": relations}


def _collect_markdown(inputs: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in inputs:
        p = Path(raw)
        if p.is_dir():
            files.extend(sorted(q for q in p.rglob("*.md") if q.is_file()))
        elif p.is_file():
            files.append(p)
    return sorted({p.resolve() for p in files})


def project(inputs: list[str]) -> dict:
    """Project Markdown inputs into the semantic-graph artifact.
    Pure function of file contents; deterministic."""
    parsed: list[dict] = []
    invalid_diagnostics: list[dict] = []
    declared_paths: dict[str, list[str]] = {}
    for path in _collect_markdown(inputs):
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            invalid_diagnostics.append({"type": "source_unreadable", "object_id": "", "paths": [str(path)]})
            continue
        fm = extract_frontmatter(text)
        if fm is None:
            continue
        ko = parse_ko(fm)
        if ko is None and re.search(r"^object_id\s*:", fm, re.MULTILINE):
            invalid_diagnostics.append({"type": "invalid_knowledge_object", "object_id": "", "paths": [str(path)]})
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

    diagnostics.extend(invalid_diagnostics)
    diagnostics.sort(key=lambda d: (d["type"], d["object_id"], d["paths"]))

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

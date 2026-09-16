# Rational Delirium UI

An Obsidian plugin that turns a Markdown vault into a read-only
**investigation workspace** for the Rational Delirium ontology:
CASE / EVIDENCE / HYPOTHESIS / LOOP objects connected by declared
semantic relations.

This repository contains the plugin/UI implementation only — not any
personal vault content.

## What it adds

- **RD Context** — a side pane projecting the active RD object: its
  identity, incoming/outgoing semantic relations, unresolved
  endpoints and ordinary `[[wikilinks]]`, with safe native navigation
  (headings, block references, aliases) and FOLLOW/PIN modes.
- **RD Investigation** (v0.4.2) — a read-only dashboard over the same
  live index: knowledge-state counts (object types plus
  BROKEN / AMBIGUOUS / CONTRADICTION relation states), current CASE
  list, an Attention section listing logical relations that need
  investigation, and a Recent view over current file metadata.

## Architecture

- Markdown stays the source of truth; the native Obsidian editor is
  never replaced or written to. The plugin is strictly read-only:
  no `Vault.create/modify/delete/rename`, no `saveData`, no
  `localStorage`, no network, no Node APIs in the bundle.
- One shared incremental index (`RDIndex`) with a pure projection
  layer feeding both views; the dashboard never rescans the vault
  and never builds a second index or watcher.
- Relation identity is conservative: unresolved targets keep their
  raw label, distinct missing endpoints stay distinct, no IDs are
  ever guessed from filenames, and BROKEN/AMBIGUOUS targets refuse
  deterministic navigation instead of creating files.
- Session state is memory-only.

## Development

```text
npm ci
npm run typecheck
npm test
npm run build
npm run check-artifacts
```

- Node.js ≥ 24 is used for development tooling; the plugin bundle
  itself targets the Obsidian (browser) platform with `obsidian` as
  an external.
- `dist/` is tracked intentionally: the distributable artifacts are
  the release identity for this plugin.

## Status

Early-stage personal research tooling, under active development.
v0.4.1 is the first production-frozen release (Context view); v0.4.2
adds the Investigation Dashboard and is not yet independently
reviewed or runtime-gated.

This is not a general-purpose knowledge system, not an AI agent, and
not a Dataview replacement; the governed write path (a separate
bridge component not part of this repository) remains the only way
notes get mutated.

# v1.11.0 · Scoped Agent intake and dossier workspace

One local operator entry now collects an explicit material scope, calls an existing Agent, extracts important four-role knowledge, reviews relationships, checks/writes Markdown and optionally serves the workspace. [Complete workflow](../../agent-intake.md).

GitHub's ordinary Release/Latest designation is distribution metadata. The product remains aimed at single-user local text knowledge and existing Agent users; it does not establish general-user maturity or long-term reliability.

## Delivered

- `intake --root --manifest`, optional installed DSH or trusted ESM Agent adapter, and `--serve`.
- Explicit local paths/patterns and public GitHub documents, exact commit/blob provenance, published prereleases and requested historical refs.
- Visible-message conversation extraction with speaker/time information, selected export branches and exclusion of hidden reasoning/tool/system streams.
- Immutable source Markdown, citation gates, bounded extraction/relation repair, a second relation review, candidate gaps, source/target version pins and journaled additive writes.
- Incremental source reuse and unchanged-run detection; edited knowledge and existing candidates remain intact. Explicit awaiting-agent, partial and failed states.
- Shared left four-role directory, central reading desk and desktop property/relation/source inspector, plus a scope-file configuration entry.
- Expired browser sessions recover after a same-workspace restart without discarding drafts. Changed workspace/mode identities block replay; unauthenticated API calls remain denied.
- English and Chinese workflows, standalone and optional Obsidian packages, explicit inventories and release checksums.

## Validation

- **726 Vitest checks across 68 files + 62 Python checks = 788**.
- Typecheck, plugin/standalone builds, artifact checks, isolated-runtime intake with a synthetic adapter, answer rejection/fallback checks, Python suites and synthetic retrieval/role evaluation.
- Real local DSH intake: **4 source snapshots → 16 knowledge units, 50 exact citations, 15 formal complement relationships, 3 candidates**, four journal transactions and a structurally valid result.
- Current-runtime rereading: all 50 citations and 15 formal edges match; all 3 candidates fail formal-relation validation and retain concrete gaps.
- Browser: desktop dossier/relations/source navigation, scope JSON download/history refs, mobile directory/no horizontal overflow, restart with a dirty draft retained, subsequent source navigation and console errors.
- Existing personal knowledge retains the same revision: **264 files, 134 objects, 168 formal relationships and 4 candidates**. Real intake evaluation used an isolated destination.

Two earlier integration probes were preserved privately: one exposed an omitted optional gap field in a declared draft, another exposed inconsistent full-line/subsentence citation handling during writes. A final clean intake completed after those fixes. Later hardening covers concurrent existing-target edits, manifest limits/BOM and origin rendering; final engineering validation includes those changes. Private source text, absolute paths, model configuration and keys are excluded from this repository/release.

The new intake sample is documentary. All 15 formal edges are supplements; two support claims and one complement remain candidates. Four units overlap CASE/EVIDENCE, all 16 have EVIDENCE, and none were forced into HYPOTHESIS/LOOP. This does not establish automatic contradiction accuracy, general classification quality or factual truth. The earlier 14-question answer evaluation is historical v1.10.0 evidence: [source/version coverage](source-coverage.md).

## Scope

Node 24+, local single-user text, supported visible-message JSON/JSONL exports and public GitHub document snapshots. PDF/Office/OCR, attachment rendering, arbitrary chat databases, private GitHub API ingestion, synchronization and built-in model chat are not provided. External models process supplied material according to their configuration. Common credential redaction is best effort, not a complete privacy detector.

Release history is capped at 500 entries, explicit historical refs at eight; collection and model context have declared bounds. A complete pipeline is not exhaustive discovery. Full recovery needs original material, workspace and external-key backups; Markdown export is not a full disaster-recovery image. OS isolation, long-term trials, clean-machine installation and real Obsidian-host acceptance remain separate work.

[Intake contract](../../agent-intake.md) · [Design QA](../../../design-qa.md)

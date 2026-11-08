# v1.10.0 · Independent knowledge workspace — engineering preview

[English README](../../../README.md) · [中文说明](../../../README_zh-CN.md)

This is the current release summary, dated 2026-11-08. The earlier [2026-11-07 readiness record](readiness.md) and other versioned reports retain their original scope and counts.

## Delivered scope

- A local Markdown knowledge workspace, independent of Obsidian, with CASE / EVIDENCE / HYPOTHESIS / LOOP roles, case browsing and directed relation views.
- Material capture, paragraph-rule suggestions, reviewed adoption, exact source anchors, candidate relationships and versioned revisions.
- CLI, Node SDK and read-only-by-default MCP. Host-checked Agent answers include citation/relation validation, current/historical source coverage, repair and explicit uncertainty.
- Portable Markdown knowledge packages and relationship exports. The optional Obsidian plugin is a separate entry point.

## Verification

- TypeScript checks, both builds, 704 Vitest checks, 62 Python checks, isolated runtime artifacts and fixed synthetic evals pass.
- Windows and Ubuntu CI pass at source commit `e758740`; subsequent release-packaging changes receive their own CI run.
- The [real DSH re-evaluation](source-coverage.md) ran the existing 14 personal-material questions against 260 frozen Markdown sources: 77 exact citations and 23 formal relationships align; two current-state answers retain coverage uncertainty. This is not a new blind corpus or a semantic truth certificate.
- The release-package checker verifies archive checksums, every manifest file, the optional plugin ZIP, isolated Node execution, HTTP assets and read-only delivery checks after extraction.

## Downloads and requirements

- `rational-delirium-1.10.0-standalone.zip`: runtime, Windows launcher, English/Chinese README, quick start, documentation, licenses, validation record and source/file manifest.
- `rational-delirium-1.10.0-obsidian-plugin.zip`: optional plugin files from the same build.
- `SHA256SUMS.txt`: SHA-256 checksums for both archives.

The independent runtime needs Node 24+, installed separately. Runtime npm installation, Python, a database, Obsidian and a bundled model are not required. The optional DSH adapter needs the user's own installed/configured DSH. External model processing follows the selected client's configuration.

## Boundaries

Engineering preview for local text knowledge. Classification is rule-based unless a human or external Agent supplies semantic analysis. PDF/OCR, attachment previews, cloud sync, built-in model chat, new-user usability and prolonged real-world reliability are not established by this release.

Knowledge ZIPs exclude attachments, approval keys and complete transaction history. Preserve the workspace and external keys for full backups. The service boundary does not isolate Agents with unrestricted filesystem access.

## Reproduce a package

```sh
npm ci
python -m pip install -r semantic-graph/requirements.txt
npm run validate > validation.log
npm run package:agent -- --output ../new-release-output --validation-log ./validation.log
node scripts/check-release-package.mjs ../new-release-output/rational-delirium-1.10.0-standalone.zip ../new-release-output/rational-delirium-1.10.0-obsidian-plugin.zip
```

Use a new output directory and commit source changes first. Packaging includes tracked documentation and the explicit runtime inventory; it excludes untracked working files. It records generated validation artifacts separately, removes the checkout path from the log, and refuses obvious private paths or key material in that log. Review the complete deliverables before uploading.

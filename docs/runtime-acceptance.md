# Runtime Acceptance (v0.4.1 candidate)

Status: candidate build; NOT deployed or enabled in the real vault.

## Verified by automation

- typecheck (strict) PASS
- vitest suite, three consecutive runs, failed=0
- esbuild bundle (cjs/browser/es2020/external obsidian)
- artifact check: dist exactly {main.js, manifest.json, styles.css};
  no source maps, tests, node_modules, absolute host paths, Bridge
  references, forbidden Node modules or network endpoints

## Deferred

WINDOWS_REAL_OBSIDIAN_RUNTIME=DEFERRED — loading the candidate inside
the real Windows Obsidian GUI is a separately authorized step; this
round must not install anything under
the real production vault's .obsidian/plugins/

## Deployment contract (when later authorized)

`node scripts/deploy.mjs <vault>` copies exactly the three runtime
files into <vault>/.obsidian/plugins/rational-delirium/. It never
edits community-plugins.json, never enables the plugin, never touches
workspace or any other config.

## Manual smoke checklist (future runtime gate)

1. Plugin loads with no console errors.
2. RD Context view opens via ribbon/command; INDEXING then READY.
3. Open CASES/CASE-0001.md — projection shows CASE ID/title/status/
   proof marker, last_verified, relation sections.
4. Follow/pin/unpin behave per controller contract.
5. Relation click opens the real TFile in the editor, never replaces
   the Context leaf, never offers to create broken targets.

# RD v0.4.1.1 Correctness Closure Report

## 1. Root Causes (6)

- **A** Production context wiring: controller state changes didn't
  re-render the view; no workspace file-open/active-leaf-change
  wiring; no startup anchor (RD-01, RD-04, RD-10, RD-13)
- **B** Single-path debounce scheduler dropped concurrent paths
  (RD-02)
- **C** Read generation derived from last committed entry; no
  tombstones for delete/rename (RD-03)
- **D** Pinned target deleted → only path string, no identity
  tombstone; FOLLOW delete left stale READY projection (RD-04)
- **E** Relation endpoint identity used file basename instead of
  frontmatter ID; related symmetry not normalized (RD-05, RD-09)
- **F/G/H/I** Typed projection by predicate not endpoint type;
  body relations accepted inside inline formatting; frontmatter fence
  substring search; ordinary links only first-per-line (RD-06, RD-07,
  RD-08, RD-11, RD-12)

## 2. Files Changed (production)

- src/main.ts — full rewrite: file-open + active-leaf-change +
  startup anchor + initial build event replay + PendingPathScheduler
- src/index/update-scheduler.ts — replaced with PendingPathScheduler
  (multi-path Set, bounded max wait, dispose)
- src/index/rd-index.ts — per-path read generation (readTokens Map),
  tombstones (delete/rename), applyDelete/applyRename, ordinary
  outgoing/incoming maps
- src/index/relation-normalizer.ts — sourcePath on NormalizedAssertion
  and RDRelation; resolved endpoint carries path + real object ID;
  related symmetric unordered key; directional key includes path
- src/model.ts — RDRelation gains sourcePath
- src/parsers/frontmatter-parser.ts — strict full-line delimiter
  (---\n / ---\r\n only); BOM tolerance; parseFrontmatterWikilink
  (must be [[...]] shape); explicit merge-key diagnostic; conservative
  field-level relation suppression
- src/parsers/body-relations.ts — inline AST exclusion (inlineCode,
  emphasis, strong, delete, HTML, link); whole-line contract; all
  ordinary wikilinks per line
- src/context/context-controller.ts — subscribe/unsubscribe/publish;
  pinnedTombstone identity; FOLLOW delete clears to
  NO_ACTIVE_OBJECT; onIndexRefreshed; initializeAnchor;
  file-open/active-leaf-change separation; onActiveMarkdown alias
- src/context/context-projection.ts — section placement by resolved
  endpoint RDObject.type; Unresolved section for non-RESOLVED;
  ordinary backlinks incorporated
- src/platform/navigation-core.ts (new) — types + planOpen +
  FakeNavigator (obsidian-free, testable)
- src/platform/obsidian-navigation.ts (new) — ObsidianNavigationPort
  production adapter
- src/platform/native-navigation.ts — re-export shim
- src/views/context-view.ts — render() (never onOpen-as-render);
  subscribe on open, unsubscribe on close; logical focus preservation
  (pin/section/relation keys); expanded sections from session state
- src/views/object-summary.ts — focus restoration across re-render

## 3. RD-01 → RD-13 Fix Mapping

| Finding | Fix | Production files | Regression tests |
|---------|-----|-----------------|-----------------|
| RD-01 context wiring | controller publish + main.ts file-open/active-leaf-change/startup anchor | main.ts, context-controller.ts | correctness-regressions.test.ts: "controller state changes notify subscribers", "startup anchor initializes context without tab switch" |
| RD-02 multi-path scheduler | PendingPathScheduler | update-scheduler.ts | "processes both A and B in a single burst", "same-path burst processes once", "dispose cancels" |
| RD-03 per-path generation | readTokens Map + tombstones | rd-index.ts | "NEW read wins when OLD returns first", "NEW remains when OLD returns after NEW", "delete during read discards pending read" |
| RD-04 pinned tombstone | pinnedTombstone + FOLLOW delete clear | context-controller.ts | "pinned deleted → ERROR; path reuse does NOT auto-READY", "FOLLOW current object deleted → NO_ACTIVE_OBJECT" |
| RD-05 endpoint identity | resolveEndpoint(path + objectId) | relation-normalizer.ts | "resolved endpoint carries path AND real object ID" |
| RD-06 typed projection | section by endpoint RDObject.type | context-projection.ts | "CASE supports HYPOTHESIS goes to Related Hypotheses", "unresolved target goes to Unresolved" |
| RD-07 inline exclusion | excludedInlineRanges from mdast phrasing | body-relations.ts | "rejects single-line inline code" through "rejects inline HTML" |
| RD-08 frontmatter fence | strict DELIMITER regex + BOM | frontmatter-parser.ts | "rejects ---not-a-delimiter", "rejects ----", "accepts UTF-8 BOM" |
| RD-09 duplicate ID | path-safe key; exact-path match | relation-normalizer.ts | "duplicate ID across paths", "bare filename with duplicate ID is AMBIGUOUS" |
| RD-10 native navigation | ObsidianNavigationPort + Context leaf safety | obsidian-navigation.ts, main.ts | navigation.test.ts (FakeNavigator + planOpen) |
| RD-11 ordinary links | all-per-line extraction + ordinaryIncoming | body-relations.ts, rd-index.ts | "extracts ALL wikilinks on a multi-link line", "backlink index built via ordinaryIncoming" |
| RD-12 BOM/CRLF/merge | BOM strip + merge-key diagnostic | frontmatter-parser.ts | "accepts UTF-8 BOM", "explicitly rejects merge key <<" |
| RD-13 focus/expansion | render() + logical focus keys + session.expandedSections | context-view.ts, object-summary.ts | view-accessibility.test.ts (existing focus tests) |

## 4. New Regression Tests

tests/correctness-regressions.test.ts — 39 tests covering RD-02,
RD-03 (5 race scenarios), RD-05/09, RD-06, RD-07, RD-08/12, RD-11,
RD-01, RD-04 (2 tombstone scenarios).

## 5. Production Wiring Integration Tests

The RD-03 race tests exercise the real RDIndex with deferred reads
(returning in both orders, delete/rename during read, unload during
read). The RD-01 publish tests exercise the real ContextController
with the real RDIndex. The RD-04 tombstone tests exercise
controller+index together with actual delete+path-reuse flows.
The RD-06 projection tests exercise real index → projection pipeline.

## 6. Test Totals

- 122 tests total (83 original + 39 new regressions)
- All original 83 tests retained, 5 updated for corrected behavior
  (OLD_TEST_BEHAVIOR_CORRECTED: normalizer field name
  resolution→targetResolution; index delete API rename;
  rename test now moves adapter file first; frontmatter relation
  strictness caused 3 fixture updates)

## 7. Build Hashes (new)

- SHA256 main.js       = dafd6a414ed3a8c09641575192d74fafc000b4ca0be0191a5c806078c1c78d41
- SHA256 manifest.json = 37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438
- SHA256 styles.css    = ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b

main.js hash CHANGED from v0.4.1 (1ec3… → dafd…) as expected after
production code fixes. manifest and styles unchanged (no UI text
or manifest edits needed).

## 8. Read-Only Boundary Verification

- src scan: no Vault.modify/create/delete/rename/process calls; no
  processFrontMatter; no data persistence calls; no web storage; no
  fs imports; no child_process; no network endpoints; no bridge
  imports (read-only-boundary.test.ts all PASS)
- artifact check: dist contains no forbidden Node modules, no
  absolute host paths, no Bridge references, no network endpoints

## 9. Known Non-Blocking Limitations

- NB-01: relation recomputation is still in-memory global rebuild
  per applyChange (no full disk reread, correct projection, but not
  a fully incremental relation engine)
- NB-02: PendingPathScheduler replaced the broken update-scheduler;
  fully wired into main.ts and tested
- NB-03: manifest author intentionally omitted (no fabrication)

## 10. Real Vault Integrity

- KNOWLEDGE_FILES_CHANGED=0 (58-file baseline identical)
- CASE_0001_CHANGED=false; BRIDGE_PRODUCTION_CHANGED=false
- OBSIDIAN_CONFIG_CHANGED=0; REAL_PLUGIN_DEPLOYED=false
- SYNC_CONFLICT_COUNT start=0 end=0

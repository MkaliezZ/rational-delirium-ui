# RD v0.4.1.3 Final Static Correctness Closure Report

## 1. Defect Closure

| Finding | Root Cause | Fix |
|---------|-----------|-----|
| RD-01 | rename handler skipped projection refresh | onFileRenamed always calls refreshCurrentTarget; DISPOSED checks at every async resume |
| RD-02 | buildDone boolean; DISPOSED not terminal | explicit BuildPhase + disposed flag; DISPOSED checks after every await in start() |
| RD-05 | reverse BROKEN/AMBIGUOUS incorrectly RESOLVED | endpoint.resolution propagated; targetPaths conditional on RESOLVED |
| RD-07 | same-paragraph HTML only | cross-paragraph isInsideHtmlRegion conservative scanner |
| RD-10 | tab/split unreachable; no source action without line | per-relation tab/split/source buttons in relation-list |
| RD-11 | ordinary links used raw targetName | parseWikilink shared in ordinaryLinkResolution + rebuildOrdinaryMaps |
| RD-12 | CRLF range included \r | crlfAdjust strips trailing CR from range; offset advance preserves full length |
| FR-01 | non-RD target kept old READY | refreshCurrentTarget invalidates on null object (FOLLOW: NO_ACTIVE; PINNED: ERROR) |
| FR-02 | background create became anchor | onFileCreated only refreshes; never sets lastMarkdownAnchor |
| FR-03 | empty describe block | filled with 3 BOM/CRLF range tests |

## 2. Files Changed

src: context/context-controller.ts, index/relation-normalizer.ts,
index/rd-index.ts, parsers/body-relations.ts, main.ts,
views/relation-list.ts, views/context-view.ts,
runtime/runtime-wiring.ts (NEW)

tests: production-integration.test.ts (NEW, 12 tests),
targeted-closure.test.ts (FR-03 filled + fixture updates),
view-accessibility.test.ts (API surface)

## 3. Shared Production Runtime Wiring (§41)

src/runtime/runtime-wiring.ts: RuntimeWiring class encapsulating
the REAL production BUILDING/REPLAYING/LIVE lifecycle, workspace
file-open/active-leaf-change wiring, vault create/modify/rename/delete
handlers, scheduler handoff, and index-commit→context-refresh chain.
Tests instantiate this exact module via FakeWorkspace + FakeVault.

## 4. Production Host Integration Tests (§43)

tests/production-integration.test.ts (12 tests) exercises:
RuntimeWiring + RDIndex + ContextController + FakeNavigator +
FakeWorkspace/FakeVault through real event chains:
- layout-ready startup with active CASE
- same-leaf file switch A→B
- FR-01: target becomes non-RD → projection cleared
- FR-02: background create stays empty; file-open activates
- RD-01: rename dependency refresh (relation goes BROKEN)
- RD-02: DISPOSED terminal after start
- RD-05: supported_by BROKEN / AMBIGUOUS
- RD-11: [[B|Alias]] / [[C#Heading]] through real index
- RD-07: cross-paragraph HTML exclusion

## 5. Test Results

| Run | Exit | Files Passed | Files Failed | Suites Failed | Cases Passed | Cases Failed |
|-----|------|-------------|-------------|---------------|-------------|-------------|
| 1   | 0    | 13          | 0           | 0             | 165         | 0           |
| 2   | 0    | 13          | 0           | 0             | 165         | 0           |
| 3   | 0    | 13          | 0           | 0             | 165         | 0           |

npm ci clean-install: PASS
typecheck: PASS

## 6. New Build Hashes

- SHA256 main.js       = fa78e280f9bb8409414564e94a8100064e906c319d5b46ef51c8a550032123cb
- SHA256 manifest.json = 37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438
- SHA256 styles.css    = ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b

main.js changed (cc480c… → fa78e2…) as expected.

## 7. Closed-Finding Regression

All previously confirmed-closed findings still PASS:
RD03, RD04, RD06, RD08, RD09, RD13, RR01-05 (all 153 existing tests
continue to pass alongside the 12 new integration tests).

## 8. Read-Only Boundary

Verified: no Vault write APIs, no saveData, no localStorage, no
IndexedDB, no fs/child_process/network in runtime bundle.

## 9. Real Vault Integrity

KNOWLEDGE_FILES_CHANGED=0; all frozen layers 0; CASE_0001 unchanged;
BRIDGE unchanged; OBSIDIAN_CONFIG 0; SYNC_CONFLICT 0.

## 10. Non-Blocking Observations

- SCHEDULER_EFFECTIVE_DELAY ≈ 750ms trailing; MAX_WAIT ≈ 1000ms
  (documented; not 250ms as originally noted)
- runtime-wiring.ts is a new module; main.ts still has its own inline
  wiring for Obsidian-specific API (registerEvent, addRibbonIcon etc).
  The shared logic (phase machine, event routing, scheduler handoff)
  IS shared; the Obsidian Plugin API glue remains in main.ts.

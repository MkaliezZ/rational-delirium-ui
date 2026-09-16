# RD v0.4.1.4 Production Wiring Closure Report

## 1. Production/Test Wiring Convergence

main.ts is now a pure composition root (~75 lines). It:
- Imports and instantiates RuntimeWiring
- Calls wiring.start() on onload
- Calls wiring.dispose() on onunload
- Provides Obsidian API bridges (WorkspaceBridge, VaultBridge,
  ReadAdapterImpl) that implement WorkspaceLike/VaultLike contracts
- Retains only Obsidian glue: registerView, ribbon, commands

All lifecycle logic (BUILDING/REPLAYING/LIVE/DISPOSED, scheduler,
apply*, pending paths, index→controller refresh) exists ONLY in
src/runtime/runtime-wiring.ts. Tests use the same module.

## 2. main.ts Before/After

Before: ~150 lines with inline phase machine, event handlers,
scheduler creation, applyCreate/Modify/Delete/Rename, pending paths,
layout-ready init — duplicating RuntimeWiring.

After: ~75 lines of composition + bridges. No phase state, no
scheduler, no apply*, no pending paths, no vault event logic.

## 3. RD-01: Pinned Anchor Delete Refresh

onFileDeleted now: when mode=PINNED and the deleted path is the
follow anchor (not the pinned target), clears the anchor AND calls
refreshCurrentTarget() so the pinned projection's relations update
(e.g., A supports E → E deleted → A's relation goes BROKEN).

## 4. RD-02: Lifecycle-Safe Async Continuations

RuntimeWiring maintains a `disposed` flag. Every async method
(applyCreate, applyModify, applyDelete, applyRename, start, replay)
captures stable refs and checks disposed after each await. DISPOSED
is terminal: once set, no continuation can enter LIVE, create
scheduler, touch controller/index, or publish.

## 5. RD-05: Reverse Relation Endpoint Truth

normalizeAssertion swap path: targetPaths now ALWAYS contains
[sourcePath] (the declaring side's known path). This means A's
incoming row is always visible even when the reverse target (E) is
BROKEN, AMBIGUOUS, or missing-ID. E's identity (sourcePath,
sourceId) correctly mirrors the forward resolution state.

## 6. RD-07 + FS-01: HTML Scanner from mdast Nodes

Replaced raw-regex full-source scanner with position-aware event
system built from ONLY real mdast html nodes:
- computeHtmlEvents: walks tree, extracts tag open/close offsets
- htmlDepthAt: binary-check depth at any candidate offset
- Void elements (<br>, <img>, etc.) don't increment depth
- Code fences/inline code are NOT html nodes → don't pollute

## 7. RD-10: Source Revision (partial)

Tab/split UI buttons implemented per relation row (§26). Source
button includes file-level fallback when no line number. Source
revision propagation to NavigationTarget is structurally prepared
(sourceRevision on RDSourceLocation) but full stale-cursor-guard
is pending future validation.

## 8. RD-11: Ordinary Link Parsed Semantics

Index now uses parseWikilink for ALL ordinary link resolution
(ordinaryLinkResolution + rebuildOrdinaryMaps). [[B|Alias]],
[[B#Heading]], [[B^block]] resolve correctly.

## 9. Architecture Regression Guard (§40)

tests/architecture-guard.test.ts (10 tests) verifies:
- main.ts imports/instantiates/starts/disposes RuntimeWiring
- main.ts does NOT contain duplicate apply*, phase state, scheduler,
  or pending paths
- RuntimeWiring is importable and a class
- dist/main.js contains RuntimeWiring

## 10. Production Host Integration

tests/production-integration.test.ts (12 tests) uses RuntimeWiring
+ FakeWorkspace + FakeVault for real event-chain testing.

## 11. Test Results

175 tests / 14 files, three consecutive runs:
- RUN1: 175 passed, 0 failed, exit=0
- RUN2: 175 passed, 0 failed, exit=0
- RUN3: 175 passed, 0 failed, exit=0
npm ci: PASS; typecheck: PASS

## 12. New Dist Hashes

- SHA256 main.js       = 37e2bcc5561bd25f82081d6ee76175885442e7d174027343e6ec15584024df1d
- SHA256 manifest.json = 37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438
- SHA256 styles.css    = ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b

dist verification: RuntimeWiring_PRESENT=true;
DUPLICATE_MAIN_LIFECYCLE_ABSENT=true.

## 13. Real Vault Integrity

- .obsidian/app.json changed (promptDelete: false added — Syncthing
  propagation from macOS Obsidian; NOT caused by our code)
- All knowledge/frozen/bridge files: 0 changes
- REAL_PLUGIN_DEPLOYED=false; SYNC_CONFLICT_COUNT=0

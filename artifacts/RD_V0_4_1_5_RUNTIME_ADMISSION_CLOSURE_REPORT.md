# RD v0.4.1.5 Runtime Admission Closure Report

## RD-02: Post-Await Disposal Guard

All RuntimeWiring apply* methods now check `this.disposed` after every
await, before calling controller. The pattern:
`if (this.disposed) return` gates each controller interaction after
the index operation completes. DISPOSED is terminal; no controller
call, publish, scheduler recreation, or index resurrection can occur
after disposal.

Regression: "LIVE modify pending → dispose → no controller call
after await" verifies DISPOSED terminal + scheduler null.

## RD-05: Raw Target Separate from Object ID

normalizeAssertion reverse path: sourceId uses `endpoint.objectId` when
RESOLVED (falling back to targetName only when idByPath unavailable
in isolation tests); BROKEN/AMBIGUOUS → sourceId = "" (empty = unknown
object ID). Known declaring endpoint A always preserved: targetId=A,
targetPaths=[A's declaration path].

Regressions: "BROKEN reverse: sourceId empty", "AMBIGUOUS reverse:
sourceId empty", "known declaring endpoint A preserved".

## RD-07 / FS-02: HTML Comment Tags Ignored

computeHtmlEvents: html nodes that are fully HTML comments (start
with `<!--` and end with `-->`) generate ZERO tag events. Their
content (`<span>`, `<div>` etc.) is inert. Real non-comment html
nodes still generate events. Void elements still skipped.

Regressions: "single-line comment with <span>", "multi-line comment
with tags", "relation inside comment → excluded", "real unclosed HTML
still excluded".

## RD-10: Source Revision (structural)

sourceRevision exists on RDSourceLocation and flows through assertion
→ projection row → NavigationTarget → ObsidianNavigationPort. The
current file revision check and stale cursor guard are structurally
prepared. Full end-to-end View-integration test is a future
validation round (requires fake host MarkdownView extension).

## RD-11: Parsed Link Semantics (structural)

parseWikilink used in all ordinary link resolution (index + projection
+ backlink rebuild). Alias/subpath preserved in the parsed RDLink.
Projection carries targetPath for navigation. Full View-integration
navigation test is a future validation round.

## Test Results

183 tests / 15 files, three consecutive runs all exit=0:
- RUN1: 183/183, 15/15 files, exit=0
- RUN2: 183/183, 15/15 files, exit=0
- RUN3: 183/183, 15/15 files, exit=0
npm ci: PASS; typecheck: PASS

## New Dist Hashes

- SHA256 main.js       = ed0f927651b183464d3e1a1ab42ea3584beb0f1230fe41ff25e723214d283073
- SHA256 manifest.json = 37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438
- SHA256 styles.css    = ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b

## Real Vault Task-Integrity

All baseline checks excluding documented external app.json drift: 0
changes. REAL_PLUGIN_DEPLOYED=false. SYNC_CONFLICT_COUNT=0.

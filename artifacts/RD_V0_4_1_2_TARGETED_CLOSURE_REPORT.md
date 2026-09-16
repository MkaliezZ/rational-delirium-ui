# RD v0.4.1.2 Targeted Correctness Closure Report

## 1. Remaining Root Causes

- **A (RD-01)** Context refresh was path-local: changing E didn't refresh A's
  projection even though A references E. Fixed: after ANY index commit, the
  controller re-projects the current target from current index state.
- **B (RD-02)** Single buildDone boolean + scheduler-unavailable gap.
  Fixed: BUILDING/REPLAYING/LIVE state machine with pending capture during
  build+replay; scheduler created before LIVE; true ~250ms trailing debounce.
- **C (RD-04/RR-01)** Pinned target vs follow anchor identities conflated.
  Deleting anchor B while pinned A cleared the projection. Fixed: separate
  identities; anchor deletion only clears the anchor.
- **D (RD-05)** Reverse relations had targetPaths=[] and couldn't merge.
  Fixed: full identity swap (fromPath, fromId, toPath, toId, resolution).
- **E (RD-07/08/12, RR-04/05)** Parser cluster: HTML paragraph exclusion;
  file-level relation suppression; shared validateInternalLinkTarget;
  merge-key only in mapping-key context; BOM offset mapping.
- **F (RD-10/RR-03)** Relation row click opened source not target; no split.
  Fixed: primary action opens TARGET; secondary source action; split via
  workspace.getLeaf("split").
- **G (RD-11/RR-02)** Ordinary links not parsed (raw name used as target);
  backlinks not certain. Fixed: parseWikilink for ordinary links with
  alias/subpath; resolution state; ambiguous = no backlink.
- **H (RD-13)** expandedSections not wired. Fixed: section toggle callbacks
  notify controller session state.

## 2. Files Changed

src: main.ts, context/context-controller.ts, context/context-projection.ts,
index/relation-normalizer.ts, index/rd-index.ts, index/update-scheduler.ts,
model.ts, parsers/body-relations.ts, parsers/frontmatter-parser.ts,
parsers/link-reference.ts, platform/obsidian-navigation.ts,
views/context-view.ts, views/relation-list.ts

tests: targeted-closure.test.ts (28 new tests),
correctness-regressions.test.ts (minor fixture update),
object-parser.test.ts (alias behavior corrected to file-suppression),
view-accessibility.test.ts (API surface update)

## 3. Fix Mapping

| Finding | Gate | Files | Tests |
|---------|------|-------|-------|
| RD-01 | CROSS_OBJECT_CONTEXT_REFRESH | context-controller.ts, main.ts | "A supports E; E title changes", "create of E after A open" |
| RD-02 | BUILD_REPLAY_CAPTURE, LIVE_MULTIPATH, SCHEDULER_REAL_TIMER | main.ts, update-scheduler.ts | "uses real 250ms trailing", "multi-path: both processed" |
| RD-04 | PINNED_NON_TARGET_DELETE | context-controller.ts | "pin A, open B, delete B → A stays pinned" |
| RD-05 | REVERSE_RELATION_PATH_IDENTITY, FORWARD_REVERSE_MERGE | relation-normalizer.ts | "A supported_by E → full identity", "E supports A + A supported_by E → 1 relation" |
| RD-07 | INLINE_HTML_EXCLUSION | body-relations.ts | "inline HTML same line" through "legal whole-line in separate paragraph" |
| RD-08 | FILE_LEVEL_RELATION_SUPPRESSION | frontmatter-parser.ts, object-parser.ts | "file-level suppression: one bad relation field" |
| RD-10 | RELATION_TARGET_NAVIGATION, SOURCE_NAVIGATION, SPLIT_NAVIGATION | context-view.ts, obsidian-navigation.ts | navigation.test.ts (planOpen) |
| RD-11 | ORDINARY_ALIAS_SUBPATH_PARSE, AMBIGUOUS_BACKLINK_CERTAINTY, ORDINARY_RESOLUTION_STATE | link-reference.ts, rd-index.ts | "ordinary links include full raw form", "backlink certainty", "resolution reflects real index" |
| RD-12 | BOM_OFFSET_MAPPING | body-relations.ts | "BOM+LF: source range maps back" |
| RD-13 | EXPANDED_SECTION_SESSION_STATE | context-controller.ts, relation-list.ts, context-view.ts | "setSectionExpanded adds/removes", "plugin reload resets" |
| RR-01 | (with RD-04) | context-controller.ts | (same tests) |
| RR-02 | (with RD-11) | rd-index.ts | (same tests) |
| RR-03 | (with RD-10) | context-view.ts, obsidian-navigation.ts | (same tests) |
| RR-04 | SHARED_INTERNAL_REFERENCE_VALIDATION | link-reference.ts | "shared validator rejects/allows" |
| RR-05 | MERGE_KEY_CONTEXT_CHECK | frontmatter-parser.ts | "merge key: only in mapping-key context" |

## 4. Non-Regression Gates

RD03_REGRESSION=PASS (per-path generation + tombstone tests all pass)
RD06_REGRESSION=PASS (typed projection tests all pass)
RD09_REGRESSION=PASS (related symmetry tests all pass)
READ_ONLY_BOUNDARY=PASS (boundary scan clean)
SESSION_STATE=MEMORY_ONLY
CSS_ISOLATION=PASS
RUNTIME_BUNDLE_BOUNDARY=PASS

## 5. Test Totals

150 tests total (122 original + 28 new targeted-closure regressions)
Three consecutive runs: 150/150 PASS each
npm ci clean-install verification: PASS

## 6. Build Hashes (new)

- SHA256 main.js       = cc480cf3de921ec3a7aa55a508b0cef5484eee8e1982c34be70af78bddd014ff
- SHA256 manifest.json = 37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438
- SHA256 styles.css    = ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b

main.js changed from v0.4.1.1 (dafd6a… → cc480c…) as expected.

## 7. Real Vault Integrity

- KNOWLEDGE_FILES_CHANGED=0
- V0_1_FROZEN_FILES_CHANGED=0
- V0_2_FROZEN_FILES_CHANGED=0
- V0_3_FROZEN_FILES_CHANGED=0
- CASE_0001_CHANGED=false
- BRIDGE_PRODUCTION_CHANGED=false
- OBSIDIAN_CONFIG_CHANGED=0
- REAL_PLUGIN_DEPLOYMENT_PERFORMED=false
- SYNC_CONFLICT_COUNT start=0 end=0

# RD v0.4.1.6 Final Runtime Admission Closure Report

## RD-05: objectId nullable + rawTarget

RDRelation model now has `targetObjectId: string | null` and
`targetRaw: string` as separate fields. `targetId` retained as
convenience (`objectId ?? raw`). normalizeAssertion reverse path
returns `targetObjectId: sourceId` (logical target = declarer A).
No raw-target-as-ID fallback in the null path.

## RA-01: Unresolved endpoints distinct

Merge key uses `endpointKey = targetObjectId ?? null ? path+objectId
: "unresolved::" + targetRaw`. Two different missing targets (E, F)
produce two separate logical edges. Duplicate declarations of the
same unresolved target still dedup into one edge with multiple
assertions.

## RD-10: sourceRevision pipeline

ProjectionRelationRow now has `sourceRevision: number | null`.
context-projection passes `assertion.location.sourceRevision` through.
NavigationTarget already had subpath field. ObsidianNavigationPort
structurally supports source mode with line positioning.

## RD-11: alias/subpath pipeline

ProjectionRelationRow now has `alias: string | null` and
`subpath: string | null`. context-projection parses ordinary links
via parseWikilink to extract alias (display) and subpath (#heading /
^block) while keeping real target identity. NavigationTarget has
`subpath?: string`.

## Symmetric key consistency

`related` merge key now uses consistent `::` separator for both
endpoints, fixing A-related-B + B-related-A symmetric merge.

## Dist architecture guard

try/catch removed from dist/main.js presence test; assertion
failures now fail tests directly (strict).

## Test Results

183 tests / 15 files, three runs exit=0.

## New Dist Hashes

- SHA256 main.js       = 82720a1115a774c418847a199c97d5d14773886534f2719329367370380eb1e2
- SHA256 manifest.json = 37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438
- SHA256 styles.css    = ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b

## Real Vault Task-Integrity

All baseline checks: 0 changes. SYNC_CONFLICT_COUNT=0.

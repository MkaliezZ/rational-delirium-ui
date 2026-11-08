# Dossier layout and entry alignment · v1.11.0

final result: passed

Source visual truth: `docs/design/dossier-ui-reference.png`, supplied by the user. Implementation: `docs/design/dossier-ui-desktop-v1.11.0.jpg`, `docs/design/dossier-ui-relations-v1.11.0.jpg`, `docs/design/dossier-ui-mobile-v1.11.0.jpg`. Published captures use synthetic knowledge; private-workspace audit captures remain outside the repository.

## Comparison

Reference: 1448 × 1086 pixels. Desktop screenshot: 1456 × 1088 pixels, desktop requested viewport 1456 × 1088, density 1. The small framing difference was treated as framing rather than visual drift; comparison concerns panel hierarchy and controls. Both images were opened together in the same comparison input. Focused inspection covered the left hierarchy, document/title/status strip and right properties/linked records at readable size.

The reference includes simulated native window chrome and a long English fictional case. This is a working browser workspace, Chinese records and the user's red/orange palette. Scope is layout/function-entry alignment, not pixel duplication of fictional data or unavailable features. Short demo notes naturally leave more reading space.

## Findings and fixes

1. **P1 resolved — navigation regions differed.** The four roles were top tabs and the left column only a view-specific index. A shared left directory now holds all four roles, counts, selection, groups and reachable overflow. Case shelves remain in overview.
2. **P1 resolved — inspector absent by default.** Desktop note reading now keeps properties/relationships/source visible on the right. Small screens use an explicit drawer. Declared origins expose original path/URL, ref, commit and hash.
3. **P2 resolved — detached reading area.** The desk fills the center grid track, with document context, a left-aligned title and a compact true-metadata strip.
4. **P2 resolved — intake entry missing.** The left action opens scope configuration, downloads JSON with historical refs and provides the local Agent command. Configuration is explicitly distinguished from execution.
5. **P2 resolved — stale session looked like missing source.** Same-workspace restart renews the page session, retains dirty drafts and permits subsequent reading. Workspace/mode changes block replay; token checks remain enforced.

The listed post-fix captures were inspected. No actionable P0/P1/P2 mismatch remains within this correction's scope.

## Fidelity surfaces

- **Typography:** serif dossier headings, Chinese serif fallbacks, compact sans/monospace UI. Titles wrap in reading and remain available in sidebar tooltips. No fictional confidence or dates are inserted.
- **Layout:** 242px directory, flexible reading desk, 304px inspector at the reference width, compact header/document strip, aligned rules and low-radius controls. Four role groups are reachable; overflow is explicit.
- **Color:** neutral dark surfaces with warm rules, orange/red selection/action accents, restrained amber/coral semantic emphasis. Cyan is intentionally replaced by the previously selected palette.
- **Images/icons:** bundled licensed Phosphor assets. Decorative moth/noise recreation is outside this layout/function correction; it was not replaced by an improvised drawing.
- **Content:** actual Chinese product flows, real index counts, saved-version matches and candidate gaps. Unknown confidence and verification times remain absent.

## Interaction evidence

| Step | Health | Result |
| --- | --- | --- |
| 1. Desktop case reading | passed | Shared four-role directory, title/status and persistent properties |
| 2. Relationships and sources | passed | Directed typed paths render; source path/hash/lines/open-original remain available |
| 3. Scope configuration | passed | Downloaded rd-intake/1 JSON preserves repository and both entered history refs |
| 4. Mobile directory | passed | 390 × 844 requested viewport; capture 375 × 812, client width 375px equals scroll width; drawer opens/closes |
| 5. Restart with dirty draft | passed | Draft retained, another source opens, no console error entries |

Browser console errors checked: none observed. Automated UI checks cover view switching, provenance, directory overflow/escaping and origin URL handling. This is not full screen-reader, contrast or cross-device accessibility acceptance. Font rendering and the user's final aesthetic acceptance remain separate.

P3 follow-up: custom archival illustration/texture can be developed separately. Navigation, intake, evidence and relationship behavior are working independently of that polish.

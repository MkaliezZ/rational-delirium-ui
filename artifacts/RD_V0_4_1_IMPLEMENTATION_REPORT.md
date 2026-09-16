# RD v0.4.1 Implementation Report

## Source

- source path: <dev workspace>
- real vault untouched (F: vault only read for baseline hashing)

## Node 24 bootstrap

- install mode: SIDE_BY_SIDE_PORTABLE (official nodejs.org ZIP)
- version: v24.21.0, target the portable Node 24 directory
- zip SHA-256: 158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541
  (matched official SHASUMS256.txt)
- Node 25 preserved: the existing Node 25 install intact
- global PATH not modified; Node 24 selected via session-local PATH
  prefix and absolute binaries

## Toolchain during install/test/build

- node v24.21.0, npm 11.19.0 (from the portable Node 24 directory)
- dependencies: yaml, mdast-util-from-markdown
- devDependencies: typescript, esbuild, vitest, happy-dom, obsidian
  types, @types/node (typecheck only)

## Files created

- package.json / package-lock.json / tsconfig.json / vitest.config.ts
  / .node-version / manifest.json / README.md
- src: main, model, scope, parsers (object/frontmatter/body-relations/
  link-reference/source-location), index (rd-index/relation-normalizer/
  dependency-map/update-scheduler), platform (obsidian-read-adapter/
  native-navigation), context (context-controller/context-projection/
  session-state), views (context-view/object-summary/relation-list/
  dom-helpers)
- styles/styles.css (all scoped .rd-context, RD-DESIGN-v0.1 tokens)
- scripts: build.mjs / check-artifacts.mjs / deploy.mjs (NOT executed
  against the real vault)
- tests: 10 suites / 83 tests (object-parser, relation-parser,
  relation-normalizer, scope, index-lifecycle, context-state,
  async-race, navigation, read-only-boundary, view-accessibility)
  + fixtures support (FakeAdapter, fixtureNote)
- docs: parser-contract.md, runtime-acceptance.md

## Architecture boundaries honored

- Markdown source of truth; native MarkdownView stays the editor
- one shared RDIndex (two-phase build, dependency-map invalidation,
  file+lifecycle generations); single ContextView ItemView
- read-only ReadAdapter narrow surface; no Vault write API reachable
- session state memory-only (no Obsidian data persistence calls, no
  web storage, no data.json)
- body relations only from top-level paragraphs via mdast structure;
  CJK + CRLF + alias/heading/block wikilinks; strict exclusions all
  covered by tests
- normalization: supports/supported_by + contradicts/contradicted_by
  logical pairs, related symmetric, directional predicates kept;
  assertions merged per logical relation, never inferred
- CSS scoped; a11y (aria-pressed/expanded/busy, keyboard, focus
  restore, no color-only state, prefers-reduced-motion)

## Test / build results

- typecheck (strict): PASS
- TEST RUN 1: 83 passed / 0 failed
- TEST RUN 2: 83 passed / 0 failed
- TEST RUN 3: 83 passed / 0 failed
- npm ci reproducibility (clean node_modules reinstall + typecheck +
  test + build + artifact check): PASS
- BUILD: PASS
- ARTIFACT_CHECK: PASS (dist exactly main.js/manifest.json/styles.css;
  no source maps/tests/host paths/forbidden modules/network)
- SHA256 main.js      = 1ec3a8bfe50d36409fb8810d51204a2f9a08bb916c848bedf567605bdc0fcdd4
- SHA256 manifest.json= 37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438
- SHA256 styles.css   = ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b

## Known limitations / deferrals

- WINDOWS_REAL_OBSIDIAN_RUNTIME=DEFERRED (loading the candidate inside
  real Obsidian GUI is a separately authorized runtime gate)
- macOS runtime gate deferred by design (cross-platform validator)
- ContextView DOM rendering is exercised through renderer functions
  in happy-dom; the ItemView shell itself needs the runtime gate
- update scheduler uses esbuild-safe microtask ticking with injected
  clock; Obsidian's own debounce wraps it in main.ts

## Real vault integrity

- KNOWLEDGE_FILES_CHANGED=0 (58-file baseline identical)
- CASE_0001_CHANGED=false; BRIDGE_PRODUCTION_CHANGED=false
- OBSIDIAN_CONFIG_CHANGED=0; REAL_PLUGIN_RUNTIME_CREATED=false
- SYNC_CONFLICT_COUNT start=0 end=0

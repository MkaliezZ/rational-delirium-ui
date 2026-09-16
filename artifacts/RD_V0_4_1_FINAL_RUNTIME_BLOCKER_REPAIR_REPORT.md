# Rational Delirium v0.4.1 — Final Runtime Blocker Repair Report

## 1. Authoritative candidate identity

本次为指定 blocker 的窄范围实现，不是新的架构或 hardening review。唯一权威输入为 ~/Desktop/RD-v0.4.1.6-review-candidate.zip；先核验 ZIP，再 fresh extraction 至 ~/Documents/Rational-Delirium-UI-v0416-final-fix，未复用 review extraction。

| 输入 | SHA-256 |
| --- | --- |
| ZIP | 6bc90c7447273c61435b9010be318cec878d63b04e42c626e7d451769fa31ee2 |
| frozen dist/main.js | 82720a1115a774c418847a199c97d5d14773886534f2719329367370380eb1e2 |
| frozen dist/manifest.json | 37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438 |
| frozen dist/styles.css | ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b |

全部匹配后才修改。原 ZIP、先前 review artifacts 均未改动。输入 ZIP 的 backslash/absolute/traversal/duplicate/symlink 均为 0。

环境：macOS，Node v24.14.1，npm 11.11.0，Vitest v3.2.7；锁文件未修改。全部 implementation/tests/build 在指定工作目录。没有 Git 操作。

## 2. Files changed

| 文件 | 目的 |
| --- | --- |
| src/model.ts | 显式双端 endpoint 数据；body source locator |
| src/index/relation-normalizer.ts | 双端 nullable identity、raw/path、merge keys |
| src/index/rd-index.ts | 查询关系时使用真实 endpoint identity/path |
| src/context/context-projection.ts | 未知端点 raw 标签及 source locator |
| src/views/context-view.ts | 传递 sourceRevision/locator 和普通链接 subpath |
| src/platform/navigation-core.ts | source navigation target 契约 |
| src/platform/obsidian-navigation.ts | current-source 重新解析与 public subpath navigation |
| tests/support/fake-obsidian-api.ts（新增） | 最小公开 Obsidian host API shim |
| tests/support/production-acceptance-host.ts（新增） | 真实 wiring/View/adapter 的持久化 fixture |
| tests/production-acceptance.test.ts（新增） | 25 个生产链验收 |
| tests/relation-normalizer.test.ts | resolved fixture 显式提供真实 ID map；原断言全部保留 |
| vitest.config.ts | 测试环境将外部 Obsidian API 映射到 fixture shim |
| dist/main.js | 实际构建产物 |
| REVIEW_MANIFEST.txt / CANDIDATE_IDENTITY.txt / BUNDLE_FILE_SHA256.txt | 最终交付身份与清单 |
| artifacts/RD_V0_4_1_FINAL_RUNTIME_BLOCKER_REPAIR_REPORT.md | 本报告 |
| artifacts/RD_FINAL_FIX_VERIFICATION.json | 三轮测试摘要、哈希、确切 proof names |

main.ts、RuntimeWiring、post-await guards、controller pin/follow、HTML/frontmatter/BOM parsers、session state、CSS、strict architecture guard 均未改动。manifest/styles、package metadata/lock 保持输入内容。保留历史 closure reports，当前结果以本报告和 root REVIEW_MANIFEST 为准。

## 3. RD-05 repair

生产调用路径：RDIndex.rebuildRelations → normalizeAssertion → RDRelation.source/target → buildProjection → RDContextView。

两端独立保存 objectId:string|null、raw:string、path:string|null、resolution。known declarer A 与被引用 E 分别构造，再按 predicate 交换；不在真实 ID 中使用 raw/basename fallback。

旧 sourceId 保留为兼容真实 ID lookup，unknown 为 ""；targetId 是明确标注的兼容显示字段。真实 identity 以 source.objectId / target.objectId 为准，index 查询也已使用这两个字段。

对 supported_by 和 contradicted_by 均有实际生产链验收：

| E | source.objectId | source.raw | source.path | source.resolution |
| --- | --- | --- | --- | --- |
| unique，id=ACTUAL-E | ACTUAL-E | E | EVIDENCE/E.md | RESOLVED |
| missing | null | E | null | BROKEN |
| ambiguous | null | E | null | AMBIGUOUS |
| typed file，无 id | null | E | EVIDENCE/E.md | RESOLVED |

target.objectId=ACTUAL-A、target.path=CASES/A.md 保持。未知 ID 的 Context title 使用 raw；不会空白，也不将 E 写入真实 ID。无 ID fixture 自身的标题不是 E，仍断言 DOM 显示 E，避免仅靠标题偶然通过。

Exact persisted proof：
- keeps nullable reverse identity and raw Context labels (supported_by)
- keeps nullable reverse identity and raw Context labels (contradicted_by)

## 4. RA-01 repair

生产 merge key 从两个真实 endpoint 构造：已解析文件以 path + nullable objectId 识别；无法确定 path 的 endpoint 以 resolution + raw 识别。reverse source 的 E/F 因 raw 不同而不同，不能再被 known target A 的相同 ID 掩盖。

同一 A：
- supported_by E/F：2 relations、2 个 Unresolved DOM rows，分别显示 E/F，source.objectId 都为 null。
- supported_by E/E：1 relation、2 assertions、1 个 Unresolved row。
- contradicted_by 的对应输入有相同去重/区分结果。Contradictions 与 Unresolved section 的既有重复分类不改动。
- A related B / B related A：仍为 1 symmetric logical relation / 2 assertions。

Exact persisted proofs：
- keeps E and F as distinct unresolved production relations and DOM rows (supported_by)
- keeps E and F as distinct unresolved production relations and DOM rows (contradicted_by)
- deduplicates E and E with both assertions through production Context (supported_by)
- deduplicates E and E with both assertions through production Context (contradicted_by)
- preserves symmetric A related B and B related A in the production index

未重新展开 RD-09；只有构造两个 endpoint key 所必需的合并实现改变。

## 5. RD-10 repair

生产调用路径：

RDSourceLocation.sourceRevision → assertion → projection.sourceRevision + sourceLocator(predicate, raw link) → RDContextView source action → NavigationTarget → ObsidianNavigationPort.open → Vault.read + 当前 editor buffer → 现有 parseObject → 唯一 body assertion → 当前行 cursor。

sourceRevision 是 index generation，不是可以与文件 mtime 直接比较的时钟。adapter 因此每次 source click 都读取当前文件，按最小 declaration locator 重新解析；不只检查 stale RDIndex。若 editor 比磁盘更新，使用点击时当前 editor 内容。旧 line 只决定 source action，不作为 cursor 坐标使用。

验收中旧 projection 保持同一对象、action=@8；fake host 插入三行后不发送 index event，点击 DOM：
- production NavigationTarget 包含原 sourceRevision 和 predicate/raw locator；
- Vault current read 确实发生；
- source file 打开；
- editor.setCursor 为 0-based line 10，即当前第 11 行；
- 显式断言没有旧 0-based line 7。

没有唯一匹配、声明删除、当前 read 失败时只开文件，不设置 cursor。frontmatter source 继续只开文件。read await 后校验 leaf/view/file，避免把位置写到另一文件。

Exact persisted proofs：
- rejects stale source cursor before index refresh through production navigation
- validates unchanged source before positioning its current declaration
- uses the current editor buffer when newer than the source file read
- opens source without a guessed cursor when current declaration is removed
- opens source without a guessed cursor when current declaration is ambiguous
- opens source without a guessed cursor when current declaration is read-failure

没有修改既有 parsing behavior、revision counter 或 session 持久化。

## 6. RD-11 repair

生产调用路径：

RDIndex ordinary resolution → projection 的 target/alias/subpath → RDContextView DOM action → NavigationTarget.subpath → ObsidianNavigationPort → existing TFile/leaf.openFile → metadataCache.getFileCache → resolveSubpath → MarkdownView.editor.setCursor。

保留 B、B|Alias、B#Heading、B^block、B#Heading|Alias 的解析/显示；View 从已解析 row.subpath 传递，未从 display text 重构。别名仍只影响标签。

API 使用锁定依赖中的公开声明，并核对 [Obsidian 官方 API](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)：openFile、getFileCache、resolveSubpath、editor.setCursor。逻辑 block subpath ^block 在 host API 边界转换为 #^block；projection/action 中仍保留 ^block。metadata 不可用或解析不到时只打开现存文件。

真实 production adapter 仅对现存 TFile 操作。View 对 BROKEN/AMBIGUOUS 不发确定性 target navigation；点击后文件已删除时 adapter 同样拒绝。没有 openLinkText 或任何可能创建缺失文件的写入路径。

Exact persisted proofs：
- preserves decorated link through ContextView and production navigation ('B')
- preserves decorated link through ContextView and production navigation ('B|Alias')
- preserves decorated link through ContextView and production navigation ('B#Heading')
- preserves decorated link through ContextView and production navigation ('B^block')
- preserves decorated link through ContextView and production navigation ('B#Heading|Alias')
- refuses deterministic target navigation without creating files (BROKEN)
- refuses deterministic target navigation without creating files (AMBIGUOUS)
- refuses deterministic target navigation without creating files (DELETED)

heading/block 测试断言实际 host openFile、resolveSubpath 参数以及对应 cursor，而不仅断言 helper plan。target click/new tab/split/frontmatter source 的 4 个生产 DOM smoke 均保持通过。

## 7. Production acceptance fixture

tests/support/production-acceptance-host.ts 实例化：
- RuntimeWiring，内部真实 RDIndex + ContextController；
- 真实 RDContextView；
- 真实 ObsidianNavigationPort；
- 最小 fake host + happy-dom。

旧 FakeNavigator 单元测试保留，但新增 acceptance 不使用 FakeNavigator。vi.spyOn 仅观察真实 adapter 方法，不替换实现；DOM click 后 await 的是实际 production open 返回的 promise。

fixture 可观察 workspace/vault events、getLeaf、openFile、当前 file/read、editor buffer、cursor、metadata subpath resolution、DOM。TFile/MarkdownView/ItemView/resolveSubpath 是外部 Obsidian host API 的测试替身；没有伪造生产 View、adapter、normalizer 或 index。file mutation tripwires 与文件数断言确认无 knowledge write。

这是持久化源码测试，已随最终源包交付。它证明生产代码到 host API 的调用路径；真实 Obsidian GUI 仍需后续 runtime gate，不在本任务内。

## 8. Persisted proof tests

所有新增测试都在 tests/production-acceptance.test.ts，25 个展开后的实际测试名为：

- keeps nullable reverse identity and raw Context labels (supported_by)
- keeps nullable reverse identity and raw Context labels (contradicted_by)
- keeps E and F as distinct unresolved production relations and DOM rows (supported_by)
- keeps E and F as distinct unresolved production relations and DOM rows (contradicted_by)
- deduplicates E and E with both assertions through production Context (supported_by)
- deduplicates E and E with both assertions through production Context (contradicted_by)
- preserves symmetric A related B and B related A in the production index
- rejects stale source cursor before index refresh through production navigation
- validates unchanged source before positioning its current declaration
- uses the current editor buffer when newer than the source file read
- opens source without a guessed cursor when current declaration is removed
- opens source without a guessed cursor when current declaration is ambiguous
- opens source without a guessed cursor when current declaration is read-failure
- preserves decorated link through ContextView and production navigation ('B')
- preserves decorated link through ContextView and production navigation ('B|Alias')
- preserves decorated link through ContextView and production navigation ('B#Heading')
- preserves decorated link through ContextView and production navigation ('B^block')
- preserves decorated link through ContextView and production navigation ('B#Heading|Alias')
- preserves production file/tab/split/frontmatter navigation ('.rdc-rel')
- preserves production file/tab/split/frontmatter navigation ('.rdc-act-tab')
- preserves production file/tab/split/frontmatter navigation ('.rdc-act-split')
- preserves production file/tab/split/frontmatter navigation ('.rdc-src')
- refuses deterministic target navigation without creating files (BROKEN)
- refuses deterministic target navigation without creating files (AMBIGUOUS)
- refuses deterministic target navigation without creating files (DELETED)

核心报告字段：
```text
RD05_PROOF_TEST=keeps nullable reverse identity and raw Context labels (supported_by)
RA01_PROOF_TEST=keeps E and F as distinct unresolved production relations and DOM rows (supported_by)
RD10_PROOF_TEST=rejects stale source cursor before index refresh through production navigation
RD11_PROOF_TEST=preserves decorated link through ContextView and production navigation ('B#Heading|Alias')
```

现有 relation-normalizer.test.ts 只给 resolved fixtures 增加真实 ID map；所有原 assertions 保留。此前测试隐含从文件名得到 ID 的 fixture 前提被纠正，不是降低预期。没有删除、skip、xfail 或为了保持计数修改测试。

## 9. Regression status

顺序：npm ci → typecheck → RUN1 → build → check-artifacts → RUN2 → RUN3。npm ci 仅设置 workspace-local cache 并关闭 audit/fund；依赖安装脚本正常执行。完整 suite 只附加 default/json reporters 以保留可核实计数，没有过滤测试。

| 项目 | files passed | files failed | suites failed | cases passed | cases failed | exit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| RUN1 | 16 | 0 | 0 | 208 | 0 | 0 |
| RUN2 | 16 | 0 | 0 | 208 | 0 | 0 |
| RUN3 | 16 | 0 | 0 | 208 | 0 | 0 |

三轮 pending cases 均为 0。typecheck/build/check-artifacts exit 均为 0。原有 183 cases 全部保留，新增 25 acceptance cases。

RD-01/02/03/04/06/07/08/09/12/13、FR-01/02/03、RR-01..05、FS-01/02 的现有 regression 全绿。RuntimeWiring/main composition、strict architecture guard 未改动，三轮均通过。没有 broad static review。

实施期间一次定向测试启动因只读沙箱禁止系统临时目录写入而报 EPERM，未执行任何 cases。将 TMPDIR 置于工作目录 .tmp 后，定向 33 cases 通过；上述三轮正式完整 suite 都是在此已修正运行环境下成功执行。该环境处理未改变 product/test assertions。缓存和临时目录不打入最终源包。

## 10. Build/artifact identity

| 最终产物 | SHA-256 |
| --- | --- |
| dist/main.js | 418e33a26f255b0b553ef4cc58b342c4e1dbc69af84adc2d26e4d10c7dbfd9aa |
| dist/manifest.json | 37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438 |
| dist/styles.css | ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b |

main.js 与旧 hash 明确不同；manifest/styles 无需修改。build 由现有 scripts/build.mjs 执行，没有手改 dist。

最终源包：~/Desktop/RD-v0.4.1-final-fix-source.zip。包含 source/tests/config/scripts/dist/package metadata、本报告和验证摘要；排除 node_modules、.git、.npm-cache、.tmp、.bundle-sanity、coverage、OS metadata 和任何真实 Vault 内容。

BUNDLE_FILE_SHA256.txt 记录除清单自身外的全部归档文件。ZIP 验证要求 backslash/absolute/traversal/duplicate/symlink 全部为 0；fresh extraction 在该实现 workspace 内的 .bundle-sanity 下进行，与原始候选/review extraction 不复用。最终交付前逐项比较解压文件和 final dist hashes。

ZIP 自身 SHA-256 不能写进 ZIP 内的报告而保持自洽，因此完整 ZIP digest 与 extraction 结果保存在工作目录的独立 FINAL_SOURCE_ZIP_SHA256.txt / FINAL_BUNDLE_INTEGRITY.json，并在最终回复给出；这两个归档后生成的收据不放入 ZIP。

## 11. Read-only/session boundaries

READ_ONLY_BOUNDARY=PASS；SESSION_STATE=MEMORY_ONLY；CSS_ISOLATION=PASS；RUNTIME_BUNDLE_BOUNDARY=PASS。

只增加 current-source read、现有文件打开和 cursor/subpath navigation。无 Vault knowledge write、processFrontMatter、saveData、localStorage、IndexedDB、Node filesystem runtime、child_process、network 或 Bridge runtime access。现有 read-only boundary tests、artifact forbidden-token checks 全部通过；Node filesystem 只用于测试/构建工具。

未访问真实 Vault，未启动真实 Obsidian，未部署或启用 plugin，未修改 Bridge；未独立监测外部 Syncthing。这些状态仅描述本任务行为：

```text
REAL_OBSIDIAN_RUNTIME_PERFORMED=false
REAL_PLUGIN_DEPLOYMENT_PERFORMED=false
REAL_VAULT_CHANGED_BY_TASK=0
BRIDGE_CHANGED=false
```

全部闭环依靠本轮 persisted acceptance 和现有 suite；real runtime execution 仍是随后独立的 gate。

## 12. Final matrix

以下矩阵的 ZIP digest 由归档后的独立收据补充；最终用户回复给出完整实际值。ZIP 安全和解压状态必须在交付前实测通过。

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=FINAL_RUNTIME_BLOCKER_REPAIR

PLATFORM=MACOS
IMPLEMENTATION_AGENT=CODEX_GPT6_ASTRA

AUTHORITATIVE_INPUT_ZIP_SHA256=6bc90c7447273c61435b9010be318cec878d63b04e42c626e7d451769fa31ee2
AUTHORITATIVE_INPUT_IDENTITY=PASS

RD05_FIXED=true
RD05_PROOF_TEST=keeps nullable reverse identity and raw Context labels (supported_by)

RA01_FIXED=true
RA01_PROOF_TEST=keeps E and F as distinct unresolved production relations and DOM rows (supported_by)

RD10_FIXED=true
RD10_PROOF_TEST=rejects stale source cursor before index refresh through production navigation

RD11_FIXED=true
RD11_PROOF_TEST=preserves decorated link through ContextView and production navigation ('B#Heading|Alias')

REVERSE_SOURCE_REAL_ID_NULLABLE=PASS
REVERSE_SOURCE_RAW_PRESERVED=PASS
REVERSE_EXISTING_NO_ID_NOT_FAKED=PASS
REVERSE_CONTEXT_RAW_LABEL=PASS

UNRESOLVED_E_F_DISTINCT=PASS
UNRESOLVED_E_E_DEDUP=PASS
SYMMETRIC_RELATION_REGRESSION=PASS

SOURCE_REVISION_PROJECTION=PASS
SOURCE_REVISION_VIEW_ACTION=PASS
SOURCE_REVISION_NAVIGATION_TARGET=PASS
CURRENT_SOURCE_VALIDATION=PASS
STALE_SOURCE_CURSOR_GUARD=PASS

ORDINARY_ALIAS_PROJECTION=PASS
ORDINARY_SUBPATH_PROJECTION=PASS
ORDINARY_SUBPATH_VIEW_ACTION=PASS
ORDINARY_SUBPATH_NAVIGATION=PASS

REAL_RDCONTEXTVIEW_IN_ACCEPTANCE_TESTS=true
REAL_OBSIDIAN_NAVIGATION_PORT_IN_ACCEPTANCE_TESTS=true
FAKE_HOST_NAVIGATION_OBSERVABLE=true
FAKE_HOST_CURSOR_OBSERVABLE=true
FAKE_HOST_SUBPATH_OBSERVABLE=true

PRODUCTION_HOST_INTEGRATION_TESTS=PASS
PRODUCTION_VIEW_INTEGRATION_TESTS=PASS
PRODUCTION_NAVIGATION_INTEGRATION_TESTS=PASS
PRODUCTION_TEST_QUALITY=PASS

ARCHITECTURE_REGRESSION_GUARD=PASS
DIST_ARCHITECTURE_GUARD_STRICT=PASS

READ_ONLY_BOUNDARY=PASS
SESSION_STATE=MEMORY_ONLY
CSS_ISOLATION=PASS
RUNTIME_BUNDLE_BOUNDARY=PASS

TYPECHECK=PASS

RUN1_NPM_TEST_EXIT_CODE=0
RUN1_TEST_FILES_PASSED=16
RUN1_TEST_FILES_FAILED=0
RUN1_TEST_SUITES_FAILED=0
RUN1_TEST_CASES_PASSED=208
RUN1_TEST_CASES_FAILED=0

RUN2_NPM_TEST_EXIT_CODE=0
RUN2_TEST_FILES_PASSED=16
RUN2_TEST_FILES_FAILED=0
RUN2_TEST_SUITES_FAILED=0
RUN2_TEST_CASES_PASSED=208
RUN2_TEST_CASES_FAILED=0

RUN3_NPM_TEST_EXIT_CODE=0
RUN3_TEST_FILES_PASSED=16
RUN3_TEST_FILES_FAILED=0
RUN3_TEST_SUITES_FAILED=0
RUN3_TEST_CASES_PASSED=208
RUN3_TEST_CASES_FAILED=0

BUILD=PASS
ARTIFACT_CHECK=PASS

PREVIOUS_DIST_MAIN_SHA256=82720a1115a774c418847a199c97d5d14773886534f2719329367370380eb1e2
FINAL_DIST_MAIN_SHA256=418e33a26f255b0b553ef4cc58b342c4e1dbc69af84adc2d26e4d10c7dbfd9aa
FINAL_DIST_MANIFEST_SHA256=37dea176eb6f75df113bed2eb71242d7f98565098b62dfe5cad0bae75fe57438
FINAL_DIST_STYLES_SHA256=ebb085018390182b89f780db9c8be8d73c16742a341c54cff34b3a64e6c8a17b

FINAL_SOURCE_ZIP=~/Desktop/RD-v0.4.1-final-fix-source.zip
FINAL_SOURCE_ZIP_SHA256=SEE_DETACHED_FINAL_SOURCE_ZIP_SHA256.txt

ZIP_BACKSLASH_ENTRY_COUNT=0
ZIP_ABSOLUTE_ENTRY_COUNT=0
ZIP_TRAVERSAL_ENTRY_COUNT=0
ZIP_DUPLICATE_ENTRY_COUNT=0
ZIP_SYMLINK_ENTRY_COUNT=0

CROSS_PLATFORM_EXTRACTION_SANITY=PASS

REAL_OBSIDIAN_RUNTIME_PERFORMED=false
REAL_PLUGIN_DEPLOYMENT_PERFORMED=false
REAL_VAULT_CHANGED_BY_TASK=0
BRIDGE_CHANGED=false

BLOCKERS=none
READY_FOR_REAL_RUNTIME_GATE=true
```


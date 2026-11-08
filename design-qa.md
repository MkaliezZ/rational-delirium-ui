# 理性失序 1.10.0 — 四板块 UI / UX 验收

日期：2026-11-07。工程验收通过；用户的最终审美体验仍由真实使用反馈决定。

沿用已选定的深色档案室、暖纸色文字、橙红强调色、中文衬线标题和来源核对布局。本轮按已确认的三层设计重组任务入口，未改变品牌方向。审美层以解决知识理解问题为定义。

- 升级前证据：`docs/validation/v1.10.0/ui/before.jpg`。原版本缺少四角色入口、材料整理和资产迁移闭环；来源核对、论证与审阅保留。
- 桌面证据：`docs/validation/v1.10.0/ui/hypothesis-desktop.jpg`，CSS 1440×1000；图像导出为 1425×990。
- 窄屏证据：`docs/validation/v1.10.0/ui/hypothesis-mobile.jpg`，CSS 390×844；导出为 375×812。无页面横向溢出，索引和来源通过抽屉访问。
- 四角色共享资产，角色标签、候选状态、关系方向和来源版本可核对。假设视图突出支持/反驳；重复模式使用案例与反例对照表。声明细节折叠，避免重复信息挤占核心任务。
- 材料整理展示精确摘录与行范围，允许修改标题、多选角色和弃权；角色建议写明规则方法。导入预览区分同名、身份和内容相同状态。
- 动效用于页面进入、对话框/抽屉、控件反馈：180 ms / 120 ms，小幅位移，无持续漂浮和闪烁。实际对话框计算样式为 0.18 s；减少动态效果的 CSS 与 JS 分支都有覆盖，JS 分支有自动化测试。
- 浏览器发现并修复：段落默认标题过于泛化；模式比较被技术关系列表推到后面；跨角色跳转显示不合适的任务视图；材料对话框关闭丢失草稿；帮助文案进入输入框的可访问名称。最终对应流程复测通过。
- 实际走通收集、采纳、角色编辑、关系搜索、理由保存、ZIP 下载与导入预览。最终浏览器控制台未见错误。

完整功能、自动化与限制见 [1.10.0 验收](docs/validation/v1.10.0/readiness.md)。下面保留 1.9.0 的历史视觉对照记录。

---

# 理性失序 1.9.0 — implementation design QA

Date: 2026-11-07. final result: **passed**

This checks the implemented design against the selected direction and the approved UI plan. It is not the owner's aesthetic acceptance or a claim of pixel-for-pixel reproduction.

## Evidence and normalization

- Source visual truth: `docs/design/images/midnight-orange-red-2026-11-07.png`, 1487×1058.
- Implementation: `docs/validation/standalone/argument-final.jpg`, 1425×1013 browser-exported JPEG; CSS viewport 1440×1024, devicePixelRatio 1. Exported content has a slight uniform size reduction.
- State: dark orange-red theme; focal Agent memory object; contrary evidence selected in the source pane. Fixture wording, IDs and source paths differ from the generated mock.
- Full-view comparison: `docs/validation/standalone/qa-comparison.jpg`. Source contained proportionally in the implementation pixel box; actual capture preserved. Both images were opened together in the same comparison input.
- Focused evidence-pane comparison: `docs/validation/standalone/qa-source-detail.jpg`. Original-density crops show headings, source prose, provenance, selection and primary action legibly.
- Responsive evidence: `docs/validation/standalone/mobile.jpg`, 390×844.

The user subsequently requested an intuitive, efficient alternative to a dot graph. The approved plan reduces daily headline size, permits smaller supporting panes and makes decorative DELIRIUM optional. These are intended changes, not unnoticed drift.

## Findings

No remaining actionable P0/P1/P2 issue was found in the final comparison and core task walkthrough.

Required fidelity surfaces:

1. **Fonts/typography:** Chinese serif headings, readable system sans prose, exact monospaced IDs remain. H1 computes to 38px, source prose 15px; main prose 16px. Smaller than the image's display typography, as approved for everyday reading. Exact source excerpts and selectable IDs wrap rather than overlap.
2. **Spacing/layout:** three functional regions, restrained rules and a focused reading area retained. The relation field is intentionally a grouped argument map rather than a free spatial canvas. More evidence can extend below the fold; persistent navigation and source access remain reachable.
3. **Colors/tokens:** near-black, warm paper, orange-red focus/action, neutral support and coral dissent. No green main accent. Primary button uses dark text/icons on orange. Text/solid-swatch contrast calculations are in the design plan; this is not a complete accessibility certification.
4. **Asset quality:** real Phosphor regular icon assets are bundled locally, with license notices. No raster illustration is needed. Brand text, notes and relationship groups are live UI content. The large decorative vertical word is omitted to keep the source pane usable.
5. **Copy/content:** real saved Markdown, exact source versions, declared relation directions, and distinct approval/execution states replace mock assertions. No fake confidence, authority scores or dashboard metrics are introduced.

## Verification and corrections

- An early viewport-change capture (`argument-before.jpg`) was unsuitable for fidelity comparison and is excluded from the final judgement.
- Fixed rapid selection/navigation races; repeated the exact-ID → switch-view task and verified the same object stayed selected.
- Fixed mobile navigation/drawer alignment and added the proposal-evidence entry. At 390×844 the header and drawer top both measured 153px; document content did not overflow horizontally.
- Verified stale draft preservation, actual proposal approval/application/inverse restore and paginated-summary/full-record access in the browser.
- Verified Ctrl+K focus and no observed browser error/warn logs in the final walkthrough.
- Final normalized comparison and focused crops were opened after the corrections. No new visual fix was required by that comparison.

## Implementation checklist

- [x] Selected orange-red visual direction implemented.
- [x] Core navigation, reading, source inspection, graph/list and editor function against local service.
- [x] Approval and execution are separately visible and exercised.
- [x] Narrow layout, keyboard search and failure feedback checked.
- [x] Actual screenshots and side-by-side evidence saved.

## Follow-up polish and limits

- P3: platform-specific serif fallback may change line breaks; only Windows browser rendering was inspected.
- P3: a richer display treatment for a large research workspace can be assessed after real notes are available.
- Real-user efficiency against point graphs, screen-reader acceptance, text-only zoom and the owner's aesthetic acceptance remain separate checks.

final result: passed

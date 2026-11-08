# 理性失序：独立知识库使用指南

1.10.0 提供本地浏览器界面、CLI、库 API 与 MCP stdio。Markdown 是知识源；运行时只需 Node 24+，不需要启动 Obsidian、Python、模型服务或数据库。源代码构建仍需 npm 安装依赖。Obsidian 插件保留为可选阅读入口。

本版操作与格式：[四板块知识工作区](four-role-workspace.md)。产品约定：[三层设计 v1.0](architecture/three-layer-design-v1.0.md)。本轮验收：[1.10.0 当前发布](validation/v1.10.0/release.md)。

## 启动

```powershell
npm ci
npm run build
node dist-agent/rd.mjs demo --root "F:/Knowledge/RD-example"
node dist-agent/rd.mjs serve --root "F:/Knowledge/RD-example"
```

`demo` 只接受空目录，创建明确标为示例的合成笔记。`serve` 默认地址 `http://127.0.0.1:4399`；可用 `--port` 指定其他端口。

使用自己的现有 Markdown 目录：

```powershell
node dist-agent/rd.mjs init --root "F:/Knowledge/MyLibrary"
node dist-agent/rd.mjs serve --root "F:/Knowledge/MyLibrary"
```

`init` 添加 `.rd/workspace.json`，生成外置审阅密钥，不迁移或转换笔记。已有初始化信息时拒绝重复初始化。直接读取现有目录可以不初始化；写入、审阅和历史需要初始化。纯查看可加 `serve --read-only`。

发布包内 `Start-RD.cmd` 可双击启动，或把目录作为第一个参数传入。默认在发布包旁创建 `knowledge` 目录。Node 24+ 需自行安装；启动脚本不会安装软件或修改系统设置。

## 日常操作

- 四板块：案例、证据、假设、重复模式按认知角色组织；多角色知识共享身份。全部资产和待整理材料保留普通笔记。
- 搜索：标题、正文、精确 ID 和作者声明的 aliases；普通笔记也能搜索。点击引用查看来源，复制引用包含文件版本。
- 假设与比较解释：围绕当前对象查看分组论证图。支持、反驳分别呈现，其他来源与依赖可展开。每条卡片可核对声明出处；可切换关系列表。
- 编辑：新建普通笔记或 KO；现有笔记使用 Markdown 编辑器。人工直接保存会自动留下带决定与快照的变更记录。若外部文件变化，保存会拒绝覆盖并保留草稿。此时可自行复制草稿，核对后载入磁盘版本。
- Agent 提案：修改前后对比 → 核对依据 → 批准/拒绝 → 应用。批准与应用是不同状态；文件或证据变化会阻止旧提案执行。
- 修订历史：连接提案、决定、文件变化与旧版本。恢复会创建另一份提案，核对后执行；后续外部编辑不能被旧恢复操作直接覆盖。

服务通过文件事件与定期扫描维护索引；每次查询也重新核对目录，因此丢失事件不会永久留下旧结果。界面约每 4 秒核对修订；编辑期间保留草稿。后台 watcher 每 10 秒完整核对作为事件遗漏的兜底。无需手工生成 graph.json。

## 资料格式与迁移

既有 `CASES/EVIDENCE/HYPOTHESES/LOOPS/ARCHIVE` 中的 `type/id` 对象继续使用原身份与状态。KO 使用 `object_id/kind`，可以放在普通 Markdown 目录。未声明对象的笔记不会被自动赋予对象身份。

KO 示例：

```yaml
---
object_id: ko-20261107-0142
kind: concept
status: candidate
title: 记忆的修订边界
aliases: [智能体长期记忆, Agent memory]
supported_by: [ko-20261107-0087]
contradicted_by: [ko-20261107-0092]
---
```

身份重复、无效 YAML、未解析来源会被显示。精确 ID 歧义时拒绝任意选取，但可以按文件路径核对。普通链接不自动成为支持、反驳等语义关系。旧状态标签和未知信息不会被显示逻辑自动修正。

隐藏目录、Templates、Attachments、demo-only 源目录及符号链接/目录联接不进入知识索引。首版独立 UI 展示文本及附件引用，不提供 PDF/OCR 解析、附件预览或多设备同步。保留这些文件本身不受索引排除影响。

## Agent 接入

任意可启动本地 MCP stdio 进程的客户端可使用下列结构；具体配置文件位置取决于客户端。

```json
{
  "mcpServers": {
    "rational-delirium": {
      "command": "node",
      "args": ["/absolute/path/dist-agent/rd.mjs", "mcp", "--root", "/absolute/path/knowledge"]
    }
  }
}
```

默认只读工具包括：status、list、search、get、read_source、check_citations、check_relations、source_coverage、prepare_answer、relations、context、validate、proposals、proposal，名称均以 `rd_` 开头。添加 `--write` 开放 propose、revise、restore 和 apply，始终不开放批准、直接保存和恢复执行工具。

工具遵循 [MCP stdio](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)、[生命周期](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)和[工具协议](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)。当前协议版本为 `2025-11-25`。stdout 仅输出 JSON-RPC；初始化后发送 `notifications/initialized` 才能调用工具。返回结构化内容及兼容的文本内容。

阅读 [Agent workflow](../skills/rational-delirium-agent-skill.md)。检索相关性并非正确性评分，context 的预算按 JSON 字符计数，不按模型 token 计数；截断与省略会显式标注。本产品不内置模型，也不会把来源文本当作运行指令。

## CLI 与 API

```powershell
node dist-agent/rd.mjs help
node dist-agent/rd.mjs search --root "F:/Knowledge/MyLibrary" --query "记忆 修订"
node dist-agent/rd.mjs get --root "F:/Knowledge/MyLibrary" --id ko-20261107-0142
node dist-agent/rd.mjs get --root "F:/Knowledge/MyLibrary" --path Notes/example.md
node dist-agent/rd.mjs relations --root "F:/Knowledge/MyLibrary" --id ko-20261107-0142
node dist-agent/rd.mjs context --root "F:/Knowledge/MyLibrary" --id ko-20261107-0142 --budget 12000
node dist-agent/rd.mjs export --root "F:/Knowledge/MyLibrary" --includeContent > backup-export.json
node dist-agent/rd.mjs propose --root "F:/Knowledge/MyLibrary" --args change.json
node dist-agent/rd.mjs decide --root "F:/Knowledge/MyLibrary" --id P-... --decision approved --reviewer owner --digest SHA256 --human
node dist-agent/rd.mjs apply --root "F:/Knowledge/MyLibrary" --id P-...
```

复杂参数使用 `--args file.json`，避免 shell 引号误读。JSON 变更格式见 Agent workflow。Graph-only export 是派生数据，内容 export 便于读取与互操作；两者都不能替代整个知识目录和历史的备份。

`proposals` 默认返回最近 50 条摘要，可用 `limit/offset` 分页；`proposal --id` 才读取完整差异与旧快照。内容 export 包含索引内所有原始 Markdown，包括普通笔记与身份歧义的来源。

限制：单篇 Markdown 2 MiB、提案 8 MiB / 32 文件、恢复日志（含旧快照）31 MiB、索引文本总量 256 MiB、最多 50,000 篇。无法完整核对身份的不可读来源会阻止写入。超出上限时拒绝提交，不默默跳过数据后写入。

Node 库入口 `dist-agent/index.mjs` 导出 KnowledgeService、RootFiles、workspaceLock、initialize、startServer、runAgentTask。服务 `execute(command, args)` 与 CLI/MCP 共用语义；只有本地操作者调用才传入第三个参数 `true` 进行 decide/save/recover。HTTP `/api` 只服务本地 UI，需要同源请求及页面会话 Token，不提供远程公开 API。

## 保存、审阅与失败恢复

权威变更记录在 `.rd/proposals`、`.rd/decisions`、`.rd/transactions`。旧插件 `.proposals/*.md` / `.contributions/*.md` 保持历史兼容；其文字状态不授权独立执行器。

审阅决定通过 Ed25519 签名绑定提案内容、工作区和决定。默认私钥在用户主目录 `.rational-delirium/keys/<workspace-id>.pem`，可在初始化及操作者启动时通过 `--key` 指定知识根目录外的位置。Agent 服务不提供私钥接口。完整文件系统权限的 Agent 仍可能直接读写文件；这是一条合作式服务边界，不能替代主机权限隔离，也不能证明签名必定由人点击。

执行前重新检查签名、源文件 SHA-256、证据版本、身份冲突。每个文件用临时文件及替换写入；事务先记录旧内容与执行状态，再写知识。多个文件不是一次操作系统级原子事务。Windows 使用文件 fsync，不宣称拥有目录 fsync 或断电级保证。

中断时 `.rd/active.json` 会阻止新写入。操作者可从工作区菜单恢复，或：

```powershell
node dist-agent/rd.mjs recover --root "F:/Knowledge/MyLibrary" --human
```

恢复先核对全部文件是否仍为记录的 before/after 版本。遇到第三方改动则停止，不覆盖它；需先人工比较。恢复已经完成但标记尚在的事务时保留已提交内容。完成写入的撤回通过 `restore` 提出新提案。不能靠删除 `.rd` 记录“修好”状态。

根目录、祖先和文件路径拒绝符号链接/联接与越界访问；多进程用工作区锁串行化。活跃进程或另一主机留下的锁不会按时间自动抢占。同一主机已退出进程的有效锁可核对后清理。无法读取的锁需要检查；不盲目删除。

首次使用自己的重要资料时保留完整目录备份；签名记录、文件快照与工作区密钥都应纳入相应恢复安排。密钥丢失不会阻止阅读和导出，但会阻止新的本地批准；本版不提供自动密钥轮换。

## 已知边界

普通文本知识、检索、声明关系、来源核对与受控修订是本版范围。模型问答质量、真实长期使用、移动端原生体验、同步冲突和大规模附件处理没有因为自动化测试通过而得到验证。规模与任务测试记录见 [本版验收](validation/standalone/readiness.md)。

## Agent 答案交付

使用 [Agent 交付流程](agent-delivery.md) 接入实际调用：宿主必检整份草稿，错误先反馈修正，修正耗尽则保留明确未知并撤下未核正文。候选不进入正式关系。该流程不依赖 Obsidian；可选 DSH 入口使用本机既有配置。

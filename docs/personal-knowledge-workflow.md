# RD 1.8.0 个人知识库使用流程

RD 是 Obsidian 的知识组织插件。保存、编辑、全文搜索、附件和同步沿用 Obsidian；RD 提供对象、来源、声明关系、档案入口和人工协作记录。Markdown 是持久资料，内存索引随时可重建。

## 安装

使用 Node 24（仓库 `.node-version` 为 24.21.0）：

```powershell
npm ci
npm run build
node scripts/deploy.mjs "你的 Vault 路径"
```

部署复制 `dist` 中的四个文件：`main.js`、`manifest.json`、`styles.css`、`tokens-rational-archive.css`。脚本不启用插件、不改其他设置。在 Obsidian 中手动启用 Rational Delirium，执行 **Open RD Workspace**。要求桌面版 Obsidian 1.13.7 或更新版本。

不要将旧冻结 tag 的运行文件与 1.8.0 混装；四个文件应来自同一次构建。首次升级使用 Vault 副本，并保留原有插件目录的备份。

## 两种笔记格式

### 保留旧笔记

旧格式仍位于 `CASES/`、`EVIDENCE/`、`HYPOTHESES/`、`LOOPS/` 或 `ARCHIVE/`：

```yaml
---
type: evidence
id: EVIDENCE-001
status: verified
supports: "[[Knowledge/idea]]"
---
# 一次已有的实验记录
```

合法 `type` 为 `case/evidence/hypothesis/loop`。原 ID、类型、状态保留；`evidence` 不会被改称 `fact`，`verified` 也不会被升级为新的知识结论。标题继续取 Markdown 的一级标题。

### 创建新 Knowledge Object

可以使用 [KO 模板](../templates/knowledge-object-template.md)，放在普通 Markdown 文件夹，例如 `Knowledge/idea.md`：

```yaml
---
object_id: ko-20261107-0001
kind: concept
status: candidate
title: "一个待研究的问题"
depends_on: [EVIDENCE-001]
provenance:
  observation: "具体观察到了什么"
  evidence: |
    实际读过的材料及其位置。
    未知或未取得的证据应明确保留。
  inference: "从材料推导了什么"
  conclusion: "当前暂定结论"
---
# 一个待研究的问题
```

`object_id` 格式为 `ko-八位日期-数字序号`，必须唯一；不会根据文件名自动生成。`kind` 支持 `observation/fact/concept/hypothesis/decision/reference/process`；`status` 支持 `candidate/reviewed/active/superseded/archived`。标题和生命周期须明确填写。日期与序号由作者管理，不代表真实性或质量。

新笔记可在普通目录中使用；隐藏目录、`Templates/`（大小写均排除）、`Attachments/`、`00_HOME/RD_DEMO/` 不进入知识索引。旧格式的目录范围保持兼容。普通笔记不会自动成为知识对象。

两种格式进入同一个只读索引：Archive Home、Archive Navigation、Knowledge Panel、Inspector、Graph Intelligence、Context、Investigation 与 Loop 使用同一批已保存的对象。Loop 的特定工作流仍只适用于 `loop` 对象。

双格式笔记同时声明 `id` 与 `object_id` 时，两者必须相同，否则显示身份冲突诊断并拒绝选取。`kind` 用于 KO 展示；不会改写源字段。无需批量迁移旧文件。

## 关系、来源和修订

- 旧笔记继续使用 `[[路径或文件名]]`；反向字段 `supported_by/contradicted_by` 保留原有方向归一化规则。
- KO 前言中的关系可用精确 ID 或显式 wikilink，支持行内列表、分行列表和单个字符串。裸 ID 按身份匹配，不按文件名猜测；旧对象 ID 也可被 KO 引用。
- 支持 `supports/contradicts/complements/derived_from/depends_on/revises/supersedes`。`complements` 只补充具体内容或边界，不表示支持整个结论。原有 `related`、正文 `repeats_in/observed_in/derived_from` 继续保留，普通链接不会被推测为语义关系；待确认内容使用独立的 `rd_relation_candidates`，不进入正式图。
- 多行 `|`、折叠 `>`、转义引号、行内列表由 YAML 解析器处理。重复键、别名、锚点、合并键、错误类型会显示诊断。缺失关系目标保留为 unresolved；不创建文件。
- 重复身份不会静默选择“最新”文件。即使副本的其他字段无效，声明的重复身份也会被隔离并报告路径。
- `provenance` 的四层仅显示明确声明的文本，RD 不从正文猜测。事实、证据、推理和结论应分别保留。
- 修订使用明确的 `predecessor/successor`、`revises/supersedes` 声明；RD 不执行晋升，也不自动覆盖历史。

## 保存与刷新

日常路径：**编辑 Markdown → 保存 → 同一个 RDIndex 更新 → 所有视图与所选对象来源刷新**。静默约 250ms 合并连续保存，持续修改的每个路径最多等待约 1 秒。显示的是已提交到索引的保存内容，不是未保存的编辑缓冲区。

首页不再依赖 `semantic-graph/graph.json`，不需要手动运行 Python。Archive Navigation 可以按标题或 ID 过滤，完整正文搜索仍使用 Obsidian 搜索。

如果外部工具写入后未收到文件事件，点击 **Refresh saved notes**，或执行 **Refresh RD knowledge from saved notes** 命令，重新核对新增、修改、删除与重命名文件。重新核对失败会显示错误，可再次刷新重试。关闭重开与刷新都会拒绝已经过期的异步结果。

`.proposals/`、`.contributions/`、`.organization-proposals/` 的直接 Markdown 子文件是协作记录，不成为知识对象；外部新增或修改记录会刷新协作视图并保留当前选择。

## 可选导出

```powershell
npm run project-graph -- "你的 Vault 路径" -o "导出目录/graph.json"
```

此命令使用与插件相同的 TypeScript 索引及解析器，同时导出旧格式与 KO；不修改笔记。新导出使用 `rd-semantic-graph-projection/2`，明确容纳旧格式额外关系；加载器继续接受 `/1` 并严格保留其六种关系限制，不会默默扩大旧协议。JSON 是派生资料，不能代替整个 Vault 备份。输入目录不存在时命令失败，不会伪装为空知识库。

旧 `semantic-graph/projector.py` 保留为 **KO-only 兼容导出工具**，不参与插件日常运行。使用它需先安装 `python -m pip install -r semantic-graph/requirements.txt`；完整双格式导出请使用上面的 npm 命令。

## 协作和边界

外部 Agent 提案 → 人工决定 → 人工或受授权的外部工具执行 → Contribution Record。插件只允许在明确操作时记录提案审批，不运行 Agent，也不会把“批准”当作修改知识的自动执行指令。

RD 不提供 PDF/OCR 自动摄取、向量检索、AI 问答或模型调用。真实知识质量、备份有效性、同步冲突及跨设备长期使用仍需作者自行检查；自动测试通过不等于知识正确或长期实用性已经验证。

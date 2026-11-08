# 四板块知识工作区 · 1.10.0

实施依据：[三层设计 v1.0](architecture/three-layer-design-v1.0.md)。审美层定义用户需要解决的问题及认知体验，功能层组织操作，资产层保存用户的内容、关系和来源。

## 日常使用

1. **收集材料**：粘贴文字，或载入 UTF-8 Markdown / TXT。原文保存在 `Materials/`，有独立资产 ID。关闭对话框后，未保存草稿留在当前页面；刷新或离开前会提示。可明确放弃草稿。
2. **整理知识**：按段落和标题提出角色建议，显示完整摘录、原文行号及建议理由。调整标题、勾选一个或多个角色，再采纳。代码块、超长段落及最多 24 段以外的内容仍在原文中。未分类内容放在「待整理材料」，也能在「全部资产」检索。
3. **四个板块**：案例保留事件情境；证据保留依据及使用关系；假设比较支持和反驳；重复模式对照已连接案例与反例。一个单元可以出现在多个板块，身份不重复。
4. **建立关系**：从当前知识出发，选择关系、目标和理由。方向会写入原文声明；理由和两端的当时版本记录在 `rd_relation_notes`。相似标题只提供候选相关资料，用户选择后才成为声明。
5. **核对与修订**：摘录记录来源版本、路径和行范围。原文被外部更新后显示「原文已更新」，原摘录保持原样。编辑、分类、链接、导入继续走同一套事务和恢复流程；修订历史里可提出恢复提案。

「候选」「已审阅」等是生命周期状态。来源一致、存在支持关系或分类为证据，都不代表内容已经证实。

## 内容关系的依据与候选

`complements`（补充）是有方向的正式关系：来源增加了目标的具体内容、条件或限制；不表示支持目标的全部结论。`supports` 和 `contradicts` 应指向明确主张，理由写明它支持或反驳哪一部分、在哪个版本与验证范围内成立。项目索引、设计草稿、合成测试、Agent 历史报告与真实观察分别保留材料性质，角色不代替可信度判断。

`rd_relation_notes` 中可附 `scope` 及 `evidence`（与 `rd_sources` 相同的路径、SHA-256、行号、原文摘录结构）。关系来源面板显示摘录及版本状态。写入时，若引用版本在本机可用，原文摘录必须与对应行完全一致；历史或不可用版本保留摘录并明确显示版本变化或缺失，不悄悄重绑定。

不确定的关系保存在 `rd_relation_candidates` 数组，每项含 `state: candidate`、`predicate`、`target`、`reason`、`evidence`，可加 `targetPath`、`targetTitle`、`acceptance`。候选单独展示，可由 `get.relationCandidates` 读取，**不进入正式图关系和 Agent 关系上下文**。确认后通过原有变更审阅流程建立正式声明并移除候选；缺少依据时继续保留候选。

两种对象格式均可声明 `complements`；当前的完整 RD 图格式和资产导出保留它。旧版客户端及仅支持 KO 六谓词的 Python 兼容投影器无法读取该扩展，应使用当前统一索引和完整知识包。

## 两套格式的连接

既有 `type/id` 与 `object_id/kind` 继续使用原身份。角色补充在可选字段中：

```yaml
rd_roles: [case, evidence]
rd_sources:
  - path: Materials/source.md
    revision: <source SHA-256>
    startLine: 8
    endLine: 11
    quote: <exact source excerpt>
rd_extraction_key: <source path/version/span SHA-256>
```

legacy 四种类型及 KO 的 `hypothesis` 自带相应角色；其他类型只在用户明确指定后获得角色。`process` 不自动成为重复模式，`fact` 不自动成为已核实证据。摘录正文使用统一的换行符，材料原文保留载入的文字；载入文件作为文字材料处理，不是附件字节备份。

同一个原文版本与行范围只能提取一个单元，多角色放在同一个单元上。需要调整角色时编辑该单元，不再建立副本。原文变化后可重新整理新版本，旧摘录仍可追溯。

## 关系与资产导出

「导入 / 导出」提供：

| 格式 | 包含内容 |
| --- | --- |
| JSON | 节点身份、类型、角色、状态、版本、引用；有向关系、声明出处和理由；未解析关系与诊断 |
| 节点 CSV / 关系 CSV | 便于表格分析的两张表；复杂字段保留为 JSON；公式开头的值加文本前缀 |
| Markdown / Mermaid | 可阅读的关系说明及关系图；机器处理优先使用 JSON |
| 知识 ZIP | 全部可索引 Markdown、清单、文件哈希、关系 JSON；包含原材料和单元引用 |

关系文件可以限定为当前对象的两跳范围，最多 32 个对象；截断在 JSON 中标示。知识 ZIP 导出整个工作区，最多 1000 个 Markdown、32 MiB 解压内容、单份文件及元数据 2 MiB、压缩包 6 MiB。超限时直接复制 Markdown 文件夹，或使用范围关系导出。

知识 ZIP **不包含附件、本机批准私钥、批准决定与执行历史**，用于内容迁移；完整灾备另行保留工作区和外置密钥。导入重新从 Markdown 建索引，不从关系 JSON 注入额外关系。

导入先检查目录边界、大小和哈希，显示新增、内容相同、同名冲突、身份冲突。每次选择 1–32 个文件、总提案最多 8 MiB；同名冲突必须明确勾选替换，身份冲突需先人工处理，不自动重编号。原目标在预览后发生变化时拒绝写入。预览保留 10 分钟；大包可分批处理。

## Agent 接入

MCP 新增只读工具 `rd_boards`、`rd_analyze`、`rd_suggestions`、`rd_export_assets`；在 `--write` 下增加 `rd_propose_organize`、`rd_propose_roles`、`rd_propose_link`。Agent 可以用自己的模型分析，提交精确原文范围和角色；服务没有内置模型。

```json
{
  "path": "Materials/source.md",
  "revision": "<exact returned SHA-256>",
  "actor": "Research Agent",
  "reason": "Extract the event and preserve its supporting source",
  "selections": [{"startLine": 8, "endLine": 11, "title": "A specific event", "roles": ["case", "evidence"]}]
}
```

调用 `rd_propose_organize` 后，经本地用户审阅、批准，才能 `rd_apply`。Agent 不获得 `decide`、直接采纳或导入执行工具。CLI 使用同名去掉 `rd_` 的命令；直接采纳 `organize/set_roles/link/import_package` 需显式 `--human`。CLI 导出返回文件名与文本，ZIP 返回 base64，浏览器负责下载。

## 评估边界

本版使用段落规则分类，允许弃权；不自动从相似性推断支持、反驳、因果或跨案例模式。10 条合成分类样本与原有 26 条检索样本用于开发回归，不能代替真实个人材料、真实 Agent 推理和长期使用评估。PDF/OCR、附件处理、同步和自动模式发现仍需后续开发。

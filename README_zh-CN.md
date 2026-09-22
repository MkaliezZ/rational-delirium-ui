# Rational Delirium（理性谵妄）

**一个面向人类主导知识组织的 Obsidian 插件。**

Rational Delirium（RD）在 Obsidian 内提供档案式知识阅读与导航体验，包括 Archive Home、Knowledge Object 展示、声明关系、溯源信息以及贡献记录。

**v1.7.0 — Archive Home Experience** 是当前冻结的可用基线版本。

[English](README.md) · [v1.7.0 release notes](docs/releases/v1.7.0-archive-home-experience.md)

## 概览

Markdown 仍然是知识来源。Obsidian 仍然是运行环境。RD 提供的是位于该环境中的知识展示与组织层。

Knowledge Object 是带有声明身份、类型、生命周期以及上下文信息的笔记。RD 中的展示不会证明其中内容一定正确。Proposal、Contribution Record 等工作流产物也与 Knowledge Object 保持区分。

RD 不是独立数据库，不是 AI 替代品，也不是自主知识管理系统。它不会运行 Agent，也不会自动将 Agent 建议转化为已接受知识。

## 功能

### Archive Home

通过 **RD Workspace** 进入个人知识档案入口。

当没有选中对象时，Archive Home 展示：

- 已声明对象、类型、生命周期状态和标题组成的知识概览；
- 已存在的 Proposal 和 Contribution 记录；
- 已声明关系、未解析声明以及 snapshot 诊断信息。

这些列表和统计描述的是当前加载的 snapshot 或已有 artifact 记录，不代表实时 Vault 全量统计，也不是质量评分。

![Archive Home with Archive Navigation and Inspector in Obsidian](docs/images/01-workspace.png)

### Knowledge Object Surface

在保持原生 Markdown 体验的同时查看知识对象身份、溯源、关系和谱系。

可以检查精确对象身份，并沿声明连接进行导航，而不会替换底层笔记。

Provenance 区分 Observation、Evidence、Inference 和 Conclusion。缺失或未解析信息会被保留，不会由 Agent 或界面自动补全。

![Knowledge Object identity, provenance and relations in a native Obsidian note](docs/images/06-knowledge-object.png)

### Graph Intelligence

探索声明语义关系、方向以及来源上下文。

Graph Intelligence 不是 Obsidian 普通 Markdown 链接图，也不是相似度引擎或推荐系统。关系不代表可信度、重要性或正确性。

![Graph Intelligence displaying a selected fixture with no declared relations](docs/images/02-graph.png)

### Inspector

右侧 Inspector 保持对象上下文、声明字段和诊断信息可见，方便在浏览过程中检查对象状态。

选择对象只是展示状态，不会改变生命周期，也不会验证内容。

### Obsidian 集成

RD 使用真实 Obsidian View 和 dock leaf。

你的 Vault、原生 Markdown、Live Preview、Properties 和普通笔记编辑流程都会继续保留。

左侧 Archive Navigator、中间 Workspace 和右侧 Inspector 协同工作，但不会替代 Obsidian。

## 使用 Agent + RD Skill

外部 Agent 可以辅助研究、整理信息、准备 Knowledge Object 以及提出组织建议。

Agent 是贡献者，人类保持知识最终决定权。

```text
External Agent
      ↓
读取 RD Skill
      ↓
准备 Knowledge Object 创建 / 整理建议
      ↓
Human review
      ↓
人工在明确流程下应用修改
      ↓
Obsidian Vault 中的 Markdown + Contribution Record
      ↓
RD 展示
```

Agent 可以帮助：

- 整理资料；
- 提取 Knowledge Object；
- 建立声明关系；
- 保留来源信息。

RD 不提供：

- 自动判断真相；
- 自动批准修改；
- 未经确认修改 Vault；
- 自动替代人的知识判断。

## 架构边界

```text
Obsidian Vault
   ├─ Knowledge 数据 / 派生展示 → RD Knowledge Views
   └─ Proposal / Contribution Artifact → Collaboration

Human Decision 与 Agent Contribution 保持分离。
```

核心原则：

- Knowledge ≠ Truth（知识 ≠ 真相）
- Projection ≠ Authority（投影 ≠ 权威）
- Agent Contribution ≠ Human Decision（Agent 贡献 ≠ 人类决定）
- Relationship ≠ Confidence（关系 ≠ 可信度）
- Visibility ≠ Validation（可见 ≠ 已验证）

## 快速开始

当前版本使用手动安装方式。

需要从冻结 tag 的 `dist/` 获取：

```text
main.js
manifest.json
styles.css
tokens-rational-archive.css
```

复制到：

```text
<vault>/.obsidian/plugins/rational-delirium/
```

然后在 Obsidian Community plugins 中启用 RD。

从源码构建：

```bash
git clone https://github.com/MkaliezZ/rational-delirium-ui.git
cd rational-delirium-ui
git checkout v1.7.0-archive-home-experience
npm ci
npm run build
```

## 当前状态

```text
v1.7.0-archive-home-experience

STATUS: FROZEN

MODE:
Real Usage Validation
```

RD 当前进入真实使用阶段：

- 使用 Agent + RD Skill 整理真实知识；
- 在 Obsidian 中验证长期工作流；
- 根据实际反馈决定未来开发方向。

## 限制

RD 有意不提供：

- Agent 运行和调度；
- AI 模型调用；
- 自动修改 Vault；
- 自动判断知识正确性。

缺少 semantic snapshot 不代表 Vault 没有知识。RD 只展示当前可用数据。

## License

MIT

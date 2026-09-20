# Rational Delirium（理性谵妄）

一个面向 [Obsidian](https://obsidian.md) 的人类主导知识工作区。

Rational Delirium 帮助用户在研究、分析和知识整理过程中使用 AI Agent，同时保持人的判断、决定和变化历史可见。

它记录：

- Agent 提出了什么建议；
- 人类批准或拒绝了什么；
- 知识如何随着时间发生变化。

Rational Delirium **不是** Agent 平台，**不是** Agent 运行时，也**不是**自主 AI 系统。

它由两部分组成：

- Obsidian 插件：负责知识展示、关系探索和工作流记录；
- Agent Skill 契约：指导外部 Agent 如何参与协作。

外部 Agent 是贡献者，不是权威：Agent 提案，人类决定，RD 展示过程。

[English](README.md)

## 为什么需要 Rational Delirium？

AI Agent 可以帮助研究、分析和整理知识，但长期使用时还需要：

- 清晰的推理历史；
- 可见的人类判断；
- 建议与最终决定的分离；
- 对实际发生变化的记录。

Rational Delirium 将这一层带入 Obsidian。

## 截图

*真实 macOS Obsidian 截图，使用 DEMO 内容。*

| 知识工作区 | 语义图 |
| --- | --- |
| ![工作区](docs/images/01-workspace.png) | ![图](docs/images/02-graph.png) |

| 协作面 | 人类决定 | 贡献记录 |
| --- | --- | --- |
| ![协作](docs/images/03-collaboration.png) | ![决定](docs/images/04-human-decision.png) | ![贡献](docs/images/05-contribution-record.png) |

## 工作流程

```text
外部 Agent
    |
    v
RD Skill 契约
    |
    v
创建 Proposal（提案）
    |
    v
人类审核决定
    |
    v
外部 Agent 仅执行人类明确批准的范围
    |
    v
Contribution Record（贡献记录）
    |
    v
RD 展示完整历史
```

提案不是执行。人类批准是一项被记录的决定，不是真相验证。贡献记录保存报告的执行溯源，不证明结果正确。

## 架构概览

```text
知识数据 + 派生投影
          |
          v
知识工作区 / 图谱视图

工作流工件
.proposals/
.contributions/
.organization-proposals/
          |
          v
协作面
提案 / 人类决定 / 贡献记录
```

知识视图读取知识数据和派生投影。协作面独立读取工作流工件，不依赖语义图快照。

插件可以记录人类的明确决定，但不执行获批的知识修改。外部 Agent 在 RD 之外，仅执行人类明确批准的操作；Contribution Record 记录报告的执行溯源，不构成独立验证。

知识对象（KO）指带有身份、溯源和关系信息的笔记或知识工件。

## 核心功能

- **知识工作区** —— 查看身份、溯源、谱系、关系和上下文。
- **语义图投影** —— 将声明关系确定性投影为只读知识图。
- **协作面** —— 查看 Agent 提案、人类决定和贡献历史。
- **人类决定记录** —— 明确记录批准或拒绝。
- **Agent Skill 契约** —— 指导外部 Agent：提案、等待、执行批准范围、记录结果。
- **主题系统** —— Rational Archive 视觉系统与语义化 UI。

## 设计原则

- **Knowledge ≠ Truth（知识 ≠ 真相）** —— 知识对象记录主张与溯源。
- **Projection ≠ Authority（投影 ≠ 权威）** —— 出现在图中不代表正确。
- **Agent Contribution ≠ Human Decision（Agent 贡献 ≠ 人类决定）** —— Agent 输出只是判断输入。
- **Relationship ≠ Confidence（关系 ≠ 置信度）** —— 关系不携带评分或权重。
- **Visibility ≠ Validation（可见 ≠ 已验证）** —— 展示不等于背书。

没有真相评分，没有置信度排名，没有自动合并。

## 五分钟快速开始

### 普通 Obsidian 用户

1. 从 `dist/` 获取四个插件文件（构建步骤见下文）：`main.js`、`manifest.json`、`styles.css`、`tokens-rational-archive.css`。
2. 将四个文件全部复制到 `<vault>/.obsidian/plugins/rational-delirium/`。
3. 在 Obsidian 设置中启用 Rational Delirium。
4. 在命令面板运行 **Open RD Workspace**，打开 RD 工作区。
5. 从 RD Workspace 打开 **Collaboration**，查看已有 Proposal、Human Decision 和 Contribution Record。工作流工件由外部 Agent 创建；RD 不运行 Agent。

### 从源码构建

```bash
git clone https://github.com/MkaliezZ/rational-delirium-ui
cd rational-delirium-ui
npm ci
npm run build
```

将上述四个生成的插件文件从 `dist/` 复制到：

```text
<vault>/.obsidian/plugins/rational-delirium/
```

## Agent 工作流示例

1. Agent 阅读 RD Skill。
2. Agent 检查知识对象。
3. Agent 创建 Proposal。
4. 人类在 Obsidian 中审核。
5. 外部 Agent 在 RD 插件之外，仅执行人类明确批准范围内的操作。
6. Agent 创建 Contribution Record。
7. RD 展示完整链路。

示例：

```text
提案：
Evidence supports Hypothesis

决定：
Human Approved

执行：
External Agent 仅执行人类明确批准的范围

记录：
Contribution Record 保存报告的执行溯源
```

## 当前状态——已冻结

开发在验证里程碑完成后暂停。

| 里程碑 | 状态 |
| --- | --- |
| v1.9 Agent Skill Workflow Validation | FROZEN |
| v1.10 Real Agent Usage Validation | PASSED |

已在以下环境完成真实 Obsidian 使用验证：

- macOS + Codex；
- Windows + WorkBuddy + GLM 5.3。

已验证工作流：

```text
Proposal → Human Decision → Contribution Record → Relation Display
提案 → 人类决定 → 贡献记录 → 关系展示
```

验证覆盖外部 Agent 工作流兼容性、跨设备工件兼容性、Obsidian 冷启动和暖重载。

这些结果仅覆盖已测试的环境和工作流，不代表所有 Agent 均兼容，也不代表所有多 Agent 场景或自主批准已通过验证。关系展示呈现已声明的关系，不构成真相验证。

## 局限

依赖语义图快照的视图需要有效的 `semantic-graph/graph.json`。插件不会自动生成或修复该快照。缺少快照不代表 Vault 中没有知识，也不阻止 Collaboration 工作流。

Rational Delirium 有意不提供：

- Agent 运行和调度；
- AI 模型调用；
- 替代人类判断；
- 自动整理 Vault；
- 自动判断真相；
- 自主修改 Vault。

未来开发仅由真实使用反馈、明确用户痛点或具体验证需求触发。

## License

[MIT](LICENSE)

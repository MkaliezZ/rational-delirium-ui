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

外部 Agent 提案，人类决定，RD 展示过程。

[English](README.md)

## 为什么需要 Rational Delirium？

AI Agent 可以帮助研究、分析和整理知识，但长期使用时还需要：

- 清晰的推理历史；
- 可见的人类判断；
- 建议与最终决定的分离；
- 对实际发生变化的记录。

Rational Delirium 将这一层带入 Obsidian。

## 截图

*（占位图——真实截图稍后补充）*

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
外部 Agent 执行批准范围
    |
    v
Contribution Record（贡献记录）
    |
    v
RD 展示完整历史
```

提案不是执行。批准不代表真相判断。贡献记录描述发生过什么，而不是证明什么正确。

## 架构概览

```text
知识对象（Knowledge Object, KO）
          |
          v
只读语义投影
          |
          v
Rational Delirium 插件
          |
          +---- 知识工作区
          +---- 图谱展示
          +---- 协作面
          +---- 人类决定记录

外部 Agent 通过工件协作：
.proposals/
.contributions/
```

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

1. 安装 Rational Delirium 插件。
2. 在 Obsidian 设置中启用插件。
3. 打开 Rational Delirium 工作区。
4. 查看知识对象、关系和工作流记录。

### 从源码构建

```bash
git clone https://github.com/MkaliezZ/rational-delirium-ui
cd rational-delirium-ui
npm ci
npm run build
```

将生成的插件文件复制到：

```text
<vault>/.obsidian/plugins/rational-delirium/
```

## Agent 工作流示例

1. Agent 阅读 RD Skill。
2. Agent 检查知识对象。
3. Agent 创建 Proposal。
4. 人类在 Obsidian 中审核。
5. Agent 仅执行批准范围外的实际操作。
6. Agent 创建 Contribution Record。
7. RD 展示完整链路。

示例：

```text
提案：
Evidence supports Hypothesis

决定：
Human Approved

执行：
External Agent 完成批准范围

记录：
Contribution Record 保存过程信息
```

## 当前状态——已冻结

开发在验证里程碑完成后暂停。

| 里程碑 | 状态 |
| --- | --- |
| v1.9 Agent Skill Workflow Validation | FROZEN |
| v1.10 Real Agent Usage Validation（DSH 5/5 PASS） | PASSED |

冻结时验证：

- 434/434 测试通过；
- TypeScript 检查通过；
- 构建通过。

## 局限

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

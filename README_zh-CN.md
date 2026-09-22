# Rational Delirium（理性谵妄）

一个面向 **Obsidian** 的人类主导知识工作区。

Rational Delirium（RD）帮助用户在 Obsidian 中组织、探索和维护长期知识结构，并支持外部 Agent 按照 RD Skill 规则参与知识整理。

RD 保持以下边界：

- Obsidian Markdown 仍然是知识载体；
- Agent 是辅助者，不是真相来源；
- 人类保持最终判断权；
- 图谱和展示是知识投影，不代表权威。

Rational Delirium 不是 Agent 平台，不是模型运行时，也不是自主 AI 系统。

## 核心理念

AI Agent 可以帮助研究、分析和整理信息，但长期知识系统仍需要：

- 清晰的身份与结构；
- 可追溯的来源；
- 可见的变化历史；
- 人类对重要决定的控制。

RD 将这些能力带入 Obsidian。

## v1.7.0 Archive Home Experience

v1.7.0 是 Rational Delirium 第一个可实际使用的稳定基线。

主要能力：

- **Archive Home** —— 作为 RD 在 Obsidian 内的知识入口。
- **Knowledge Object Surface** —— 展示知识对象身份、溯源、关系和谱系。
- **Graph Intelligence** —— 探索声明关系和知识连接。
- **Inspector** —— 查看对象上下文与诊断信息。
- **Provenance / Relations / Lineage** —— 保留知识来源和关系链路。

## 截图

*真实 Obsidian 使用截图，展示 RD 当前界面。*

（截图持续更新中）

## Agent + RD Skill 工作流

RD 支持外部 Agent 按照 Skill 契约参与知识整理。

```text
Agent
  |
  v
RD Skill
  |
  v
整理知识 / 创建 Knowledge Object
  |
  v
写入 Obsidian Vault
  |
  v
Rational Delirium 展示结构、关系和来源
```

Agent 可以帮助：

- 整理资料；
- 提取知识对象；
- 建立声明关系；
- 保留来源信息。

但 RD 不提供：

- 自动判断真相；
- 自动替代人的决定；
- 未经确认修改知识库。

## 架构概览

```text
Obsidian Vault
      |
      v
Knowledge Objects
      |
      v
Rational Delirium Plugin
      |
      +-- Archive Home
      +-- Knowledge Object Surface
      +-- Graph Intelligence
      +-- Inspector
```

## 五分钟开始

### 使用已有插件构建

1. 从 `dist/` 获取插件文件：

```text
main.js
manifest.json
styles.css
tokens-rational-archive.css
```

2. 复制到：

```text
<vault>/.obsidian/plugins/rational-delirium/
```

3. 在 Obsidian 设置中启用 Rational Delirium。

4. 打开 RD Workspace。

### 从源码构建

```bash
git clone https://github.com/MkaliezZ/rational-delirium-ui
cd rational-delirium-ui
npm ci
npm run build
```

## 设计原则

- Knowledge ≠ Truth（知识 ≠ 真相）
- Projection ≠ Authority（投影 ≠ 权威）
- Agent Contribution ≠ Human Decision（Agent 贡献 ≠ 人类决定）
- Visibility ≠ Validation（可见 ≠ 已验证）

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
- 根据实际反馈决定未来开发。

## 限制

RD 有意不提供：

- Agent 运行和调度；
- AI 模型调用；
- 自动修改 Vault；
- 自动判断知识正确性。

缺少语义图快照不代表 Vault 没有知识，RD 只展示已有可用数据。

## License

MIT

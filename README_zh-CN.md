# Rational Delirium

一个以边界为先的知识工作流框架,用于 AI 辅助的研究、评审、批准、受控变更与证据保全。

职责分离是本设计的核心:

- **Agent** 产出推理工件(研究、提案、评审、交接)——传递的是
  工作结果,永不传递权限。
- **Human(人)** 拥有批准权。任何 Agent、共识、评分或超时都
  不能替代显式的人工决定。
- **Bridge** 控制准入(租约、写者身份、有效期、同步安全)。
- **Mutation Gate(变更门)** 控制变更:一次经人批准的追加,
  字节精确,恰一次。
- **Audit(审计)** 记录执行事实(逐记录摘要验证)。

本仓库包含 Obsidian 插件(只读可视化)、Mutation Gate、Bridge
Adapter,以及供应商中立的 Agent 技能包。不包含任何个人 vault
内容。

## 当前状态

**v0.7.5 运行时证据包 — FROZEN(已冻结)**

范围:仅沙箱验证证据。**非生产部署。**

变更能力仍仅为 `APPEND_EXISTING_NOTE`(追加既有笔记)。

## 验证时间线

| 阶段 | 试验 |
|---|---|
| v0.7.2 | 单 Agent 工作流边界试验 |
| v0.7.3 | 沙箱受控变更试验 |
| v0.7.4 | 真实组件沙箱执行试验 |
| v0.7.5 | 运行时证据包冻结 |

详情:[docs/RD_V0_7_5_RUNTIME_EVIDENCE_PACKAGE.md](docs/RD_V0_7_5_RUNTIME_EVIDENCE_PACKAGE.md)

## 架构

```text
Agent(智能体)
  ↓
Workflow(工作流)
  ↓
Approval Boundary(批准边界,仅限 Human)
  ↓
Bridge Adapter(桥接适配器)
  ↓
Mutation Gate(变更门)
  ↓
Audit(审计)
  ↓
Knowledge Layer(知识层)
```

## 证据边界

已证(依据冻结证据包,沙箱范围 + 包内源码/测试):

- 通用 Agent 能够理解并遵循工作流边界
- 工作流工件链的沙箱验证
- 冻结组件(Bridge Adapter、Mutation Gate、AuditLog)在沙箱内执行

未证:

- 生产部署
- 分布式协调
- 真实人类批准自动化(沙箱批准经由 MockSigner 以声明身份模拟)

## 文档

英文文档:[docs/](docs/)

English README: [README.md](README.md)

## 开发

```text
npm ci
npm run typecheck
npm test
npm run build
npm run check-artifacts
```

- 插件开发需 Node.js ≥ 24;插件打包面向 Obsidian(浏览器)平台,
  `obsidian` 为外部依赖。
- Mutation Gate / Bridge Adapter:Python 3.11 标准库
  (`mutation-gate/`,测试:`python -m unittest discover -s
  mutation-gate/tests`)。
- `dist/` 有意纳入版本管理:分发工件是本插件的发布身份。

## 许可证

本仓库尚未声明许可证;在选择许可证之前,所有权利由所有者保留。

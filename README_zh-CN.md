# 理性失序 · Rational Delirium

[English](README.md) · [简体中文](README_zh-CN.md)

**本地优先的人与 Agent 知识工作区。Obsidian 是可选入口。**

用 Markdown 保留材料，通过 **CASE / EVIDENCE / HYPOTHESIS / LOOP（案例、证据、假设、重复模式）** 连接经历、核对支持与反驳、比较解释，并随新材料修订认识。

**v1.10.0 为工程预览版**，面向本地文本知识，以及已有 Markdown 或 Agent 使用习惯的用户。

[下载工程预览](https://github.com/MkaliezZ/rational-delirium-ui/releases/tag/v1.10.0) · [当前验收记录](docs/validation/v1.10.0/release.md) · [使用与恢复](docs/standalone-knowledge.md)

## 可以做什么

- 收集 Markdown / TXT，保留原文，按段落核对角色建议。
- 用案例、证据、假设和重复模式组织知识；一份知识可以承担多个角色，并保留同一身份。
- 通过案例索引和有向关系视图查看摘录、支持、反驳、补充和所缺依据。
- 检索已保存正文、别名、声明关系与来源引用；相关性是词法排名，不是正确性评分。
- 编辑笔记、审阅 Agent 的具体变更、查看历史，并在版本核对后恢复中断写入。
- 导出 Markdown 知识包，以及 JSON、CSV、Markdown 或 Mermaid 关系文件。
- 通过 CLI、Node SDK 或 MCP 连接已有 Agent，在交付前检查引用、正式关系、候选状态及当前/历史版本覆盖。

四个角色表示知识的用途，不自动证明内容为真。相似性不会自动变成支持、反驳或已确认的重复模式；不确定的关联保留为候选。

## 下载后启动

安装 **Node.js 24+**，解压发布页中的独立运行包。运行依赖已经打包，无需运行时 npm 安装、Python、数据库或 Obsidian。Node 本身不包含在下载包内。

Windows 用户双击 `Start-RD.cmd`，默认在包旁创建 `knowledge` 目录。使用时保持服务窗口开启。

从解压目录体验明确标为合成示例的知识库：

```sh
node dist-agent/rd.mjs demo --root ./example-knowledge
node dist-agent/rd.mjs serve --root ./example-knowledge
```

打开终端打印的本地地址，默认 `http://127.0.0.1:4399`。端口占用时增加 `--port 4400`。`demo` 只接受空目录。

使用自己的 Markdown 目录：

```sh
node dist-agent/rd.mjs init --root ./my-knowledge
node dist-agent/rd.mjs serve --root ./my-knowledge
```

初始化保留现有笔记，添加工作区元数据及外置审阅密钥。重要资料先做完整备份。纯查看可使用 `serve --read-only`。

## 从源码构建

```sh
npm ci
npm run build
node dist-agent/rd.mjs demo --root ./example-knowledge
node dist-agent/rd.mjs serve --root ./example-knowledge
```

同一次构建也会在 `dist/` 生成可选 Obsidian 插件。独立工作区不需要安装该插件。

## 连接 Agent

在兼容客户端中启动本地 MCP stdio 进程：

```sh
node dist-agent/rd.mjs mcp --root /absolute/path/knowledge
```

MCP 默认只读。`--write` 可提出变更并应用已批准的提案，始终不开放批准和直接保存工具。Agent 拥有完整主机文件权限时，仍需由宿主另行提供隔离。

需要宿主强制核对答案时，使用 SDK 的 `runAgentTask`，或可选的本机 DSH 适配器：

```sh
node dist-agent/agent-run.mjs --root /absolute/path/knowledge --questions /path/questions.json --output /path/new-run --dsh-entry /path/installed/dsh/lib/bin.js
```

宿主先提供来源覆盖清单，再检查完整草稿，将具体错误反馈给 Agent 修正；依据不足则保留明确未知。使用宿主返回的 `delivery` 作为交付结果。直接调用 `prepare_answer` 的客户端必须携带原始 `questions`。

本产品不包含模型或 API 凭据。外部 Agent / 模型可能处理提供给它的材料，具体数据流向取决于所用客户端的配置。

[Agent 工作流](skills/rational-delirium-agent-skill.md) · [交付约定](docs/agent-delivery.md) · [来源读取](docs/agent-source-reading.md)

## 验证与范围

- **704 项 Vitest + 62 项 Python 检查**；完整 CI 在 Windows 和 Ubuntu 通过。
- 本机 DSH 对 **14 道既有个人材料问题**完成实际复测：77 条引文、23 条正式关系与保存的来源及声明对齐；2 题保留来源覆盖未知。
- 独立运行包、MCP、HTTP、知识包和恢复场景已有工程检查；这些结果不等于长期可靠性或真实世界效果已验证。

本次预览聚焦本地文本知识。PDF/OCR、附件预览、云同步及内置模型聊天进入后续开发。分类建议使用段落规则，语义分析依赖人工审阅或外部 Agent。14 道既有问题不属于新的盲测集，也不是通用准确率保证。

知识 ZIP 用于迁移已索引 Markdown 和声明关系，不包含附件、批准密钥和完整执行历史。完整恢复需要另外保存工作区及外置密钥。

[当前发布验收](docs/validation/v1.10.0/release.md) · [来源与版本评估](docs/validation/v1.10.0/source-coverage.md) · [四板块格式](docs/four-role-workspace.md) · [三层设计](docs/architecture/three-layer-design-v1.0.md)

## 制作发布包

在干净的源码工作区中，安装 Node 24+ 和构建依赖后执行：

```sh
npm run validate > validation.log
npm run package:agent -- --output ../release-output --validation-log ./validation.log
```

使用新的输出目录。脚本保留已有交付物，记录源提交及文件哈希，生成独立运行包、插件包与 `SHA256SUMS.txt`。打包使用 Node，无需 Python；运行 Python 测试仍需安装 Python 与声明的测试依赖。

## 许可

[MIT](LICENSE)。打包依赖保留各自许可，见运行包中的 `THIRD_PARTY_NOTICES.txt`；图标资源同时附带其许可证。

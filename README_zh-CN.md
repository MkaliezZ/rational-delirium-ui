# 理性失序 · Rational Delirium

**1.10.0：四板块知识工作区。** 案例、证据、假设和重复模式相互支持；从材料整理带出处的知识单元，保留两套对象格式和原身份。新增多角色、关系编辑、内容包导入导出，以及遵循减少动态效果设置的动效。

[三层设计 v1.0](docs/architecture/three-layer-design-v1.0.md) · [四板块使用说明](docs/four-role-workspace.md) · [本轮验收](docs/validation/v1.10.0/readiness.md)

**供人和 Agent 使用的本地个人知识库，Obsidian 为可选入口。**

当前版本 **1.10.0**。这次升级基于任务 eval，保留稳定身份、来源和声明关系，改进检索排序，加入独立浏览器界面、CLI/MCP、受控修订与失败恢复。

## 启动

需要 Node 24+。从源码运行：

```powershell
npm ci
npm run build
node dist-agent/rd.mjs demo --root ./example-knowledge
node dist-agent/rd.mjs serve --root ./example-knowledge
```

打开打印的本地地址，默认 `http://127.0.0.1:4399`。示例只接受空目录，内容均为合成资料。自己的 Markdown 目录先用 `init --root 目录` 初始化，再用 `serve --root 目录` 启动。初始化只添加工作区元数据和外置审阅密钥，不迁移笔记。

构建后的独立包只需 `rd.mjs`、`web/` 与 Node，不需要 Obsidian、Python、模型账号或数据库。发布包提供 Windows 启动脚本。

## 日常使用

- **知识库**：搜索标题、中文关键词、作者别名与精确 ID，阅读和编辑普通笔记及知识对象。
- **推演**：用带摘要的分组论证图比较支持、反驳和依赖；点击卡片核对原始文件与声明位置，也可切换列表。
- **Agent 提案**：看修改前后、引用依据和影响范围；批准与应用分开，源文件或证据改变后拒绝使用旧决定。
- **修订历史**：保留决定与实际写入的连接，支持提出恢复提案和核对中断写入。

旧 `type/id` 和新 `object_id/kind` 共用索引；未声明对象的 Markdown 不会被强行转换。重复身份不任意选择，缺失来源不隐藏。界面采用深色档案与橙红强调，来源保持可读。

## Agent 接入

```powershell
node dist-agent/rd.mjs mcp --root 你的知识目录
node dist-agent/rd.mjs mcp --root 你的知识目录 --write
node dist-agent/rd.mjs search --root 你的知识目录 --query "记忆 修订"
```

MCP 默认只读；`--write` 增加提出和执行已批准提案的能力，始终不提供批准工具。使用 [Agent workflow](skills/rational-delirium-agent-skill.md)。检索相关性不等于可信度，声明关系不等于事实推导。本版不内置模型。

[完整使用、命令与恢复指南](docs/standalone-knowledge.md) · [eval 与验收记录](docs/validation/standalone/readiness.md) · [UI 设计规划](docs/design/standalone-ui-plan.md)

## 验证

```powershell
python -m pip install -r semantic-graph/requirements.txt
npm run validate
node scripts/scale-agent.mjs
```

固定合成语料的前后对照、服务测试与浏览器走查分别记录。自动化通过不等于真实长期使用、真实资料质量或模型回答忠实性已被验证。

可选 Obsidian 插件仍可用 `npm run build:plugin` 构建，安装见 [插件工作流](docs/personal-knowledge-workflow.md)。旧 Markdown 提案界面不授权新执行器；旧 Python 导出器和 append-only gate 仅保留兼容用途。

首版独立运行范围是文本知识、来源核对与受控修订；PDF/OCR、附件预览、内置模型对话和多设备同步尚未提供。MIT 许可。

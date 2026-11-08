# Agent 草稿、修正与交付

实际交付走同一个顺序：来源与版本预检 → 检索与读原文 → 生成完整草稿 → 宿主 `prepare_answer` 必检 → 反馈修正 → 再检 → 交付，或者明确未知。检查不写知识或提升候选。

## 来源与版本覆盖

当前状态题先用 `source_coverage({query})`：从匹配的案例及其正式入链证据读取来源清单，再查找同仓库、会话或文档的其他已存快照，包括尚未被卡片引用的快照。来源不足、项目范围不明确、清单截断或当前版本声明冲突会显示缺口。它不扫描外部目录或联网更新，也不把发现当成正式关系。

`runAgentTask` 每轮在生成前自动提供 `coveragePlans`；生成适配器必须把它传给模型。交付时按原问题重新计算清单，防止模型漏读记录或资料在生成期间变化。对当前状态题增加 `sourceReview`：

```json
{"status":"snapshot","currentVersions":[{"family":"repository:owner/project","version":"2.0.0-rc.2"}],"historicalVersions":[{"family":"repository:owner/project","version":"2.0.0-rc.1"}],"limits":["只核对库内声明，外部当前状态未知。"]}
```

`snapshot` 表示已对照保存的来源，不等于现实最新状态。`requiredEvidence` 中当前与历史版本声明需有对应引用，版本同时出现在正文与结构化对照中；至少覆盖 `minimumRecords` 个不同来源记录。同一会话的摘录不另算一条来源，记录数也不代表独立实验数。版本家族按明确仓库 URL 或声明的 `rd_version_family` 区分，课件版本与依赖版本不能当作主项目发布。

`sourceDate` 使用显式事件/来源日期，`capturedAt` 单列抓取时间；没有来源日期就保留 null。版本大小、抓取时间、复核日期和提交哈希都不建立发布先后。多个冲突的“当前”声明暂不自动选一个；没有显式当前版本声明时，`currentVersions=[]`，保留缺口。外部当前状态始终标为 unknown。

覆盖不足时使用 `status: unknown`、空 `currentVersions` 与具体 `limits`；宿主将正文撤回为固定未知说明，不让仅改变标签的肯定断言通过。历史材料可以保留在引文中。修正失败的兜底单独计数，不能算作已得到有依据的回答。

## 日常调用

运行包需要 Node 24。可选的 DSH 适配器使用用户已经安装的 DSH headless 和既有模型配置：

```text
node dist-agent/agent-run.mjs --root /path/knowledge --questions /path/questions.json --output /path/new-run --dsh-entry /path/installed/dsh/lib/bin.js
```

`questions.json` 为 1–32 项 `[{"id":"Q1","question":"要查的问题"}]`，题号唯一。输出目录必须新建且位于知识目录之外，避免把测试与答案混进资料。默认每次 Agent 调用最多 300 秒，首次加最多两轮修正，每轮最多 20 次只读调用；可用 `--max-repairs 0..3`、`--timeout-ms 1000..900000` 调整。DSH 继续同一会话修正，宿主始终重新检查完整结果，不相信模型自报的校验状态。

只读命令入口同时接受工具目录中的 `rd_search` 等名称和 `search` 等短名；别名不开放任何写命令。

消费 `delivery.json`；`run.json` 保存经过宿主检查的结果、修正与兜底记录，`review-*.json` 保存检查反馈。`attempt-*/agent-final.txt` 是未审草稿，不能当答案。工具行为在 `read-calls.jsonl`；适配器不暴露写入、批准、发布或提权操作。不改全局 DSH 配置，不安装模型或依赖，也不把来源里的历史指令当当前任务。

原问题可由调用方指定 `mode: current | historical | general`；默认按当前、最新、版本、发布等问法识别。仅讨论历史的题目可显式用 historical，跨项目或无明确对象的当前状态题需先澄清范围或保留未知。模式由宿主问题决定，模型草稿不能改写问题或模式来绕过检查。

## 输出合同

每项必填：`id/claim/answer/conclusion/citations/relations/candidateRelations/uncertainties`。`conclusion` 取 supported、refuted、bounded、unknown，判定对象是明确的 `claim`。仅有肯否标签不能代替命题。

- 引用需路径、当前完整 SHA-256、行范围与连续原句。错误行号可以按唯一精确匹配建议修正；多处匹配、版本变化或无原句，需要重新读来源。
- 正式边必须有精确 ID 或相对 Markdown 路径，方向与谓词均匹配当前图；正文注明候选不能补救正式数组里的候选。
- 候选单独列出 state=candidate、missingEvidence，必须对应库中声明的候选。交付会使用库中保存的缺口，不把模型描述当成候选升级依据。尚未入库的猜想只写入 uncertainties，另走既有提案流程。
- 有判断的正文需要有效引用。没有可核对引用时，只有 unknown 与非空缺口说明可作为不确定结果交付；正文由宿主替换为固定未知说明，不能只改标签、删引用却沿用肯定正文。这不算来源已获证。
- `prepare_answer` 必须携带原始 `questions`，并核对其题号与答案一致；旧客户端需补上此参数。expectedIds 可额外固定预期集合。可用 revision 固定本次核对的知识版本；变化后重查。

`prepare_answer` 返回 needs_revision 时 `delivery` 为 null，失败项只有反馈，不返回其正文作为可交付答案。达到修正上限后，宿主保留分别通过的题目，撤下失败题的原正文、引文和关系，改为固定的未知说明与错误/缺口；兜底还会通过交付检查。不能只删掉失败引用后继续发布原来肯定的断言。

## 其他 Agent

MCP 调 `rd_prepare_answer`；CLI 调 `prepare_answer --root ... --args draft.json`；HTTP 与 SDK 使用同名命令。建议通过模型无关的宿主函数接入：

```javascript
import {KnowledgeService, runAgentTask} from './dist-agent/index.mjs';
const service = new KnowledgeService('/path/knowledge');
try {
  const result = await runAgentTask(service, questions, async ({questions, round, feedback, coveragePlans}) => {
    return await yourAgent.generate({questions, round, feedback, coveragePlans}); // 完整 JSON 草稿
  });
  consume(result.delivery);
} finally { await service.close(); }
```

消费方必须使用宿主返回的 delivery。任意有完整文件权限的 Agent 仍能绕过合作接口；本功能不声称提供操作系统隔离。回执按内容和知识版本生成，表示字面引用与声明关系对齐，不是签名授权或语义真理证明。资料变化后再次核对；支持程度、证据独立性和文字断言是否符合原文范围，继续单独评估。

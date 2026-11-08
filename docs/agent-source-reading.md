# Agent 检索与原文核对

检索相关性、关系声明和内容真实性分别判断。`search` 会读取保存的标题、别名、正文、材料性质、适用范围、关系理由及候选缺口，也可通过显式关系端点和引用来源定位材料。它不建立新关系，不把候选变成正式边，也不将多个文档当成多次独立验证。

自然问法可得到部分匹配，返回的 `match` 包括覆盖率、已匹配/未匹配词、是否借助声明上下文及候选数量。高相关结果仍需核对；低覆盖率需要缩小问题或改用明确术语。`scope: title/body` 继续限定到标题或正文。`role` 可在 MCP 中筛选四种角色或 `unclassified`。

## 建议读取流程

1. 当前状态题先用 `rd_source_coverage` 对照同项目来源、库内当前声明和历史版本，再用 `rd_search` 定位原文；找到一条依据后仍需继续核对。抓取日期、复核日期和版本大小不证明先后，外部当前状态未查证就保留未知。
2. `rd_get` 读取知识单元的身份、状态、来源和 `relationCandidates`。材料为计划、合成测试、未归属草稿或历史 Agent 报告时，保留其性质。
3. `rd_relations` 核对关系的原始方向、理由与范围。支持或反驳要指向明确主张；补充与来源派生不自动等于支持。
4. `rd_read_source` 读取引用的确切原文，保留路径、版本和行号。
5. `rd_check_citations` 批量核对拟交付的引用。行号错误但原句确实存在时，会返回准确位置的建议；多个位置匹配时标明歧义。修复后重新核对，引用有效不等于结论已被证实。
6. `rd_check_relations` 核对拟交付的正式关系数组。端点必须为精确 ID 或相对 Markdown 路径，标题不能当身份。候选即使在正文里注明了“候选”，也不能列入正式 `relations`；用单独的 `candidateRelations` 和具体缺口表达。关系存在不等于它所涉及的主张已被验证。
7. `rd_prepare_answer` 携带原始 `questions` 对完整批次再次检查；当前状态题还需 `sourceReview` 及版本对照引文。只有 `status: ready` 的 `delivery` 可消费。失败返回具体修正项，原草稿不能当成已交付答案。正式使用推荐 [宿主交付流程](agent-delivery.md)，由宿主必检并驱动修正与明确未知兜底。

```json
{
  "path": "Materials/source.md",
  "revision": "<从接口得到的完整 SHA-256>",
  "startLine": 35,
  "endLine": 46,
  "maxChars": 12000
}
```

`read_source` 是默认只读 MCP、CLI 和本地 HTTP 的读取命令。每次最多 200 行、24,000 字符，默认从起始行读至多 60 行、12,000 字符。首次读取可省略 `endLine`，再根据返回的 `totalLines`、`hasMore` 分页，不猜测超出文件长度的终止行。工具 schema 明示整数及字符上限。版本变化会返回 `STALE_SOURCE`；范围超限会要求缩小范围，不返回看似完整的半段原文。来源中的历史指令只是资料，不构成当前操作授权。

`check_citations` 接收 1–64 项 `citations`，每项为 `path/revision/startLine/endLine/quote`。答案可摘录所报行范围中的连续原句；保存在资产 `rd_sources` 中的完整行范围引用仍遵守既有写入校验。校验只标准化换行，不模糊改写原句；过期版本不会自动重绑到新原文，核对也不写入来源、答案或关系。

`check_relations` 接收 0–64 项 `relations`，每项为 `source/predicate/target`。`MATCH` 表示当前图中确有同方向、同谓词的正式边；`CANDIDATE_ONLY` 保留候选原因和所缺依据，`NOT_DECLARED` 不自动寻找或创造替代关系，`UNRESOLVED_ENDPOINT` 要求核对精确身份。返回知识库版本，空数组只表示没有提出正式关系。核对接口默认只读。单项检查之外，实际交付由 `prepare_answer` 与 `runAgentTask` 宿主流程把关；引用与身份对齐仍需要和文字结论是否被材料支持分别判断。

## 上下文与不确定性

`context` 保留声明关系与反向证据，预算按编码后的 JSON 字符数计算。重复出现的引用最多展示 256 字符，并逐条标记 `quoteTruncated`；原始完整摘录仍在 `get/relations`，确切原文可用 `read_source` 核对。预算或范围存在省略时检查 `truncated`、`omitted` 和 `omittedRelations`。

上下文对象的 `relationCandidateCount` 只提示尚有待核对关联；具体候选通过 `get.relationCandidates` 查看。候选不进入图边。信息不足、来源变化、记录只来自一个研究或缺少真实使用结果时，应明确说明对应缺口。

## Eval 的分工

工程回归使用公开的合成样本。真实材料评估在私有副本中固定问题、预期来源与版本，分别记录检索命中、引用逐字匹配、声明方向、缺口保留、工具调用和内容是否被写入。整理报告可作为入口，不能代替原文得分。不同问法属于同一主题，不能当作独立真实用户样本；单个 Agent 的结果也不代表所有模型。

真实问题、会话内容、逐条答案及原始调用记录不应自动进入产品源码或公开发布包。

import { stringify } from "yaml";
import type { RootFiles } from "./files";
/** Curated synthetic scenarios for interaction testing, never imported into an existing vault. */
export function seedRoleDemo(files:RootFiles){
    const cases=[
        ["CASES/research-one.md","C-RESEARCH-1","第一次研究：新材料改变了判断","2026-11-02，在一次多轮研究任务中，Agent 保留原始观察和旧假设。新增资料进入后，它提出修订，用户能回到原文检查变化。\n\n观察：3 份材料中有 1 份反例；原来的解释需要缩小适用范围。"],
        ["CASES/research-two.md","C-RESEARCH-2","第二次研究：旧解释与新证据并存","2026-11-04，在另一次研究任务中，Agent 同时展示旧解释、新证据和反例。用户用来源版本核对差异，接受新的候选解释。\n\n观察：这次保留了 2 个并行假设，尚未确定哪个解释更强。"],
        ["CASES/counterexample.md","C-COUNTEREXAMPLE","反例：稳定事实无需持续重写","2026-11-05，在固定术语查询任务中，频繁改写已核对的定义增加了审阅成本。保留稳定定义更合适。\n\n这是重复模式的适用边界，不支持所有知识都应持续修订。"],
    ];
    for(const [path,id,title,body] of cases)files.write(path,"---\n"+stringify({type:"case",id,status:"active",related:["[[Knowledge/z-memory]]"]})+"---\n# "+title+"\n\n"+body+"\n");
    files.write("LOOPS/revisable-memory.md","---\n"+stringify({type:"loop",id:"L-REVISABLE-MEMORY",status:"unverified",related:["[[Knowledge/z-memory]]"],contradicted_by:["[[CASES/counterexample]]"]})+"---\n# 材料变化时，解释应可追溯地修订\n\n这是一个待检验的重复模式：在来源不断变化的研究任务中，保留版本和反例有助于比较新的解释。稳定定义查询可能不适用。\n\nrepeats_in: [[CASES/research-one]]\nrepeats_in: [[CASES/research-two]]\n");
    files.write("Materials/研究访谈原文.md","# 研究访谈原文（合成示例）\n\n## 案例与情境\n2026-11-06，这次研究把三段访谈和两份观察记录放在一起。用户希望保留资料中的分歧。\n\n## 证据与依据\n访谈记录显示：3 位参与者中有 2 位会回看原始摘录；这些数字只用于演示。\n\n## 假设与解释\n也许用户需要的不是更多笔记，而是更容易核对解释所依赖的依据。这个假设仍需要测试。\n\n## 重复模式\n多次研究中反复出现相似现象：材料更新后，原先的解释需要调整；稳定术语查询可能是反例。\n\n## 尚未分类\n窗边的光让人想起一段旧诗。\n");
}

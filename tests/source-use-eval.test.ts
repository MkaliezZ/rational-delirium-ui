// @vitest-environment node
import {afterEach,expect,it} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {tmpdir} from "node:os";
import {stringify} from "yaml";
import {RootFiles,sha256} from "../standalone/files";
import {initialize} from "../standalone/mutations";
import {KnowledgeService} from "../standalone/service";
import {toolDefinitions} from "../standalone/mcp";
const dirs:string[]=[],services:KnowledgeService[]=[];
function fixture(){const dir=fs.mkdtempSync(path.join(tmpdir(),"rd-source-use-"));dirs.push(dir);const files=new RootFiles(path.join(dir,"knowledge"),true);initialize(files,path.join(dir,"key.pem"));const kb=new KnowledgeService(files.root,path.join(dir,"key.pem"));services.push(kb);return {files,kb};}
afterEach(async()=>{for(const s of services.splice(0))await s.close();for(const d of dirs.splice(0))fs.rmSync(d,{recursive:true,force:true});});
const md=(id:string,title:string,fields:any={},body="一份历史记录。")=>'---\n'+stringify({object_id:id,kind:"reference",title,status:"candidate",...fields},{aliasDuplicateObjects:false})+'---\n# '+title+'\n\n'+body+'\n';
const a='ko-20261108-0001',b='ko-20261108-0002';
it("rejects candidate leakage and direction or predicate changes in proposed formal answers",async()=>{
 const{files,kb}=fixture();files.write("Knowledge/b.md",md(b,"目标主张",{kind:"hypothesis"}));
 const source=md(a,"来源记录",{supports:[b],rd_relation_candidates:[{state:"candidate",predicate:"complements",target:b,reason:"具体映射不足",acceptance:"补充版本映射"}]});files.write("Knowledge/a.md",source);
 const r=await kb.execute("check_relations",{relations:[{source:a,predicate:"supports",target:b},{source:b,predicate:"supports",target:a},{source:a,predicate:"contradicts",target:b},{source:"Knowledge/a.md",predicate:"complements",target:"Knowledge/b.md"},{source:"来源记录",predicate:"supports",target:b}]});
 expect(r.allValid).toBe(false);expect(r.checks.map((c:any)=>c.code)).toEqual(["MATCH","NOT_DECLARED","NOT_DECLARED","CANDIDATE_ONLY","UNRESOLVED_ENDPOINT"]);expect(r.checks[3].candidate).toMatchObject({state:"candidate",acceptance:"补充版本映射"});expect(r.checks[0].source.id).toBe(a);expect(files.read("Knowledge/a.md").text).toBe(source);
 files.write("Knowledge/a.md",md(a,"来源记录"));const next=await kb.execute("check_relations",{relations:[{source:a,predicate:"supports",target:b}]});expect(next.checks[0].code).toBe("NOT_DECLARED");expect(next.revision).not.toBe(r.revision);
 expect(toolDefinitions(false).find(t=>t.name==="rd_check_relations")?.annotations.readOnlyHint).toBe(true);
});
it("keeps ordinary-note candidates and ambiguous identities outside formal answer relations",async()=>{
 const{files,kb}=fixture();files.write("Knowledge/b.md",md(b,"目标主张"));files.write("Notes/mock.md",'---\n'+stringify({rd_relation_candidates:[{state:"candidate",predicate:"complements",target:b,reason:"合成测试未确认归属",acceptance:"补充课程标识"}]})+'---\n# 合成材料\n');
 expect((await kb.execute("check_relations",{relations:[{source:"Notes/mock.md",predicate:"complements",target:b}]})).checks[0].code).toBe("CANDIDATE_ONLY");expect((await kb.execute("check_relations",{relations:[]})).allValid).toBe(true);
 files.write("Knowledge/a.md",md(a,"来源记录",{supports:[b]}));files.write("Knowledge/collision.md",md(a,"另一个同ID记录"));expect((await kb.execute("check_relations",{relations:[{source:"Knowledge/a.md",predicate:"supports",target:b}]})).checks[0]).toMatchObject({code:"UNRESOLVED_ENDPOINT",detail:"AMBIGUOUS_ID"});
 await expect(kb.execute("check_relations",{relations:new Array(65).fill({source:a,predicate:"supports",target:b})})).rejects.toMatchObject({code:"INVALID_ARGUMENT"});expect((await kb.execute("check_relations",{relations:[{source:"../outside.md",predicate:"supports",target:b}]})).checks[0].code).toBe("UNRESOLVED_ENDPOINT");
});
it("finds candidate gaps in authored metadata without turning them into graph edges",async()=>{
 const{files,kb}=fixture(),source="# 来源\n\n这是虚构的测试。\n";files.write("Materials/a.md",source);
 files.write("Knowledge/a.md",md(a,"测试记录",{rd_relation_candidates:[{state:"candidate",predicate:"complements",target:b,reason:"课包归属尚未核实",acceptance:"补充课程版本映射",evidence:[{path:"Materials/a.md",revision:sha256(source),startLine:3,endLine:3,quote:"这是虚构的测试。"}]}]}));
 const r=await kb.execute("search",{query:"课包归属"});expect(r.hits[0]).toMatchObject({id:a,match:{candidateCount:1}});expect((await kb.execute("search",{query:"课包归属",scope:"body"})).hits).toEqual([]);
 const c=await kb.execute("context",{id:a});expect(c.objects[0].relationCandidateCount).toBe(1);expect(c.edges).toEqual([]);expect((await kb.execute("get",{id:a})).relationCandidates[0].acceptance).toBe("补充课程版本映射");
});
it("retrieves evidence via declared endpoints and citation ownership, and invalidates dependent titles",async()=>{
 const{files,kb}=fixture(),source="# 原始材料\n\n记录两种状态。\n";files.write("Materials/a.md",source);files.write("Knowledge/h.md",md(b,"任务边界",{kind:"hypothesis"}));
 const e=md(a,"工程记录",{supports:[b],rd_sources:[{path:"Materials/a.md",revision:sha256(source),startLine:3,endLine:3,quote:"记录两种状态。"}]});files.write("Knowledge/e.md",e);
 expect((await kb.execute("search",{query:"任务边界"})).hits.some((h:any)=>h.id===a&&h.match.viaDeclaredContext)).toBe(true);
 expect((await kb.execute("search",{query:"工程记录"})).hits.some((h:any)=>h.path==="Materials/a.md")).toBe(true);
 files.write("Knowledge/h.md",md(b,"执行凭证",{kind:"hypothesis"}));expect((await kb.execute("search",{query:"任务边界"})).hits.some((h:any)=>h.id===a)).toBe(false);
 expect((await kb.execute("search",{query:"执行凭证"})).hits.some((h:any)=>h.id===a)).toBe(true);expect(files.read("Knowledge/e.md").text).toBe(e);
 expect((await kb.execute("relations",{id:a})).relations.map((r:any)=>r.predicate)).toEqual(["supports"]);
});
it("marks partial natural-language matches and abstains when there is no meaningful overlap",async()=>{
 const{files,kb}=fixture();files.write("Knowledge/a.md",md(a,"MemoryProbe 评估",{},"MemoryProbe 的 source_record_id 不等于事实存活。"));
 const r=await kb.execute("search",{query:"只要还保留 source_record_id 就能说明所有事实永远记得吗"});expect(r.hits[0]).toMatchObject({id:a,match:{partial:true}});
 expect((await kb.execute("search",{query:"航空票价火星天气"})).hits).toEqual([]);
});
it("reads exact bounded source lines, pins revisions, and refuses oversized or unsafe reads",async()=>{
 const{files,kb}=fixture(),source="# 原始文档\r\n\r\n已有检查通过。\r\n实际效果未知。\r\n";files.write("Materials/a.md",source);const revision=files.read("Materials/a.md").revision;
 expect(await kb.execute("read_source",{path:"Materials/a.md",revision,startLine:3,endLine:4})).toMatchObject({revision,startLine:3,endLine:4,quote:"已有检查通过。\n实际效果未知。",hasMore:true});
 await expect(kb.execute("read_source",{path:"../outside.md"})).rejects.toBeDefined();files.write("Materials/a.md",source+"新版本");await expect(kb.execute("read_source",{path:"Materials/a.md",revision,startLine:3,endLine:4})).rejects.toMatchObject({code:"STALE_SOURCE"});
 files.write("Materials/large.md","x".repeat(300));await expect(kb.execute("read_source",{path:"Materials/large.md",startLine:1,endLine:1,maxChars:256})).rejects.toMatchObject({code:"RANGE_TOO_LARGE"});
 expect((toolDefinitions(false).find(t=>t.name==="rd_read_source")!.inputSchema as any).properties.maxChars).toMatchObject({type:"integer",minimum:256,maximum:24000});expect((toolDefinitions(false).find(t=>t.name==="rd_search")!.inputSchema as any).properties.role.enum).toContain("evidence");
});
it("keeps opposing assertions within context budgets by explicitly clipping repeated quotes",async()=>{
 const{files,kb}=fixture(),source="# 材料\n\n"+"连续原文依据".repeat(350)+"\n",citation={path:"Materials/a.md",revision:sha256(source),startLine:3,endLine:3,quote:source.split("\n")[2]};files.write(citation.path,source);
 files.write("Knowledge/h.md",md(b,"待检验的主张",{kind:"hypothesis",rd_sources:[citation]}));
 for(const [id,predicate]of [[a,"supports"],["ko-20261108-0003","contradicts"]])files.write(`Knowledge/${predicate}.md`,md(id,"来源记录",{[predicate]:[b],rd_relation_notes:[{predicate,target:b,reason:"只作用于原文限定的条件",evidence:[citation]}]}));
 const c=await kb.execute("context",{id:b,depth:1,budget:6000,maxObjects:3});expect(c.edges.map((e:any)=>e.relation).sort()).toEqual(["contradicts","supports"]);expect(JSON.stringify(c).length).toBeLessThanOrEqual(6000);expect(c.edges.every((e:any)=>e.assertions[0].basis[0].evidence[0].quoteTruncated)).toBe(true);
 expect((await kb.execute("read_source",{path:citation.path,startLine:3,endLine:3})).quote).toBe(citation.quote);
});
it("locates incorrectly numbered answer quotes without silently fixing stale or ambiguous citations",async()=>{
 const{files,kb}=fixture(),source="# 记录\n\n重复句\n\n已有检查通过。\n实际效果未知。\n\n重复句\n";files.write("Materials/a.md",source);const citation={path:"Materials/a.md",revision:sha256(source),startLine:2,endLine:3,quote:"已有检查通过。\n实际效果未知。"};
 const wrong=await kb.execute("check_citations",{citations:[citation]});expect(wrong).toMatchObject({allValid:false,checks:[{code:"WRONG_LINES",ambiguous:false,suggestedCitations:[{startLine:5,endLine:6,quote:citation.quote}]}]});
 const fixed=wrong.checks[0].suggestedCitations[0];expect((await kb.execute("check_citations",{citations:[fixed]})).allValid).toBe(true);
 const ambiguous=await kb.execute("check_citations",{citations:[{...citation,quote:"重复句",startLine:1,endLine:1}]});expect(ambiguous.checks[0]).toMatchObject({ambiguous:true});expect(ambiguous.checks[0].suggestedCitations).toHaveLength(2);
 expect((await kb.execute("check_citations",{citations:[{...citation,quote:"已完成真实使用验收。"}]})).checks[0].code).toBe("QUOTE_NOT_FOUND");
 files.write(citation.path,source+"外部修改");const stale=await kb.execute("check_citations",{citations:[fixed]});expect(stale.checks[0].code).toBe("STALE_SOURCE");expect(stale.checks[0].suggestedCitations).toBeUndefined();expect(files.read(citation.path).text).toBe(source+"外部修改");
});

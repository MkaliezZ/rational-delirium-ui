// @vitest-environment node
import {afterEach,expect,it} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {tmpdir} from "node:os";
import {stringify} from "yaml";
import {KnowledgeService} from "../standalone/service";
import {RootFiles,sha256} from "../standalone/files";
import {initialize} from "../standalone/mutations";
import {runAgentTask} from "../standalone/agent-flow";
import {toolDefinitions} from "../standalone/mcp";
const dirs:string[]=[],services:KnowledgeService[]=[];
function prepare(service:KnowledgeService,args:any){const ids=args.expectedIds??[...new Set(args.answers.map((a:any)=>a?.id))];return service.execute("prepare_answer",{...args,questions:ids.map((id:string)=>({id,question:"局部检查是否证明实际效果？"}))});}
const a="ko-20261108-0101",b="ko-20261108-0102";
function fixture(){
 const dir=fs.mkdtempSync(path.join(tmpdir(),"rd-agent-delivery-"));dirs.push(dir);const files=new RootFiles(path.join(dir,"knowledge"),true);initialize(files,path.join(dir,"key.pem"));
 const source="# 原始记录\n\n局部检查通过。\n实际效果未知。\n";files.write("Materials/source.md",source);
 const md=(id:string,extra:any={})=>'---\n'+stringify({object_id:id,kind:"hypothesis",status:"candidate",title:id,...extra})+'---\n# '+id+'\n';
 files.write("Knowledge/a.md",md(a,{supports:[b],rd_relation_candidates:[{state:"candidate",predicate:"complements",target:b,reason:"课程映射未知",acceptance:"补充课程与版本标识"}]}));files.write("Knowledge/b.md",md(b));
 const service=new KnowledgeService(files.root,path.join(dir,"key.pem"));services.push(service);
 const citation={path:"Materials/source.md",revision:sha256(source),startLine:3,endLine:4,quote:"局部检查通过。\n实际效果未知。"};
 const answer=(id="Q1")=>({id,claim:"局部检查能证明实际效果",answer:"记录只确认局部检查，实际效果未知。",conclusion:"bounded",citations:[citation],relations:[{source:a,predicate:"supports",target:b}],candidateRelations:[],uncertainties:["缺少实际效果测量。"]});
 return {files,service,source,citation,answer};
}
afterEach(async()=>{for(const s of services.splice(0))await s.close();for(const d of dirs.splice(0)){if(!path.resolve(d).startsWith(path.join(tmpdir(),"rd-agent-delivery-")))throw Error("Unsafe cleanup");fs.rmSync(d,{recursive:true,force:true});}});

it("withholds the complete batch when a quote or candidate-as-formal relation fails",async()=>{
 const {files,service,answer,citation}=fixture(),original=files.read("Knowledge/a.md").text;
 const bad={...answer("Q2"),citations:[{...citation,startLine:1,endLine:2}],relations:[{source:a,predicate:"complements",target:b}]};
 const r=await prepare(service,{answers:[answer(),bad],expectedIds:["Q1","Q2"]});expect(r.status).toBe("needs_revision");expect(r.delivery).toBeNull();expect(r.items[0].valid).toBe(true);expect(r.items[1].issues.map((i:any)=>i.code)).toEqual(["WRONG_LINES","CANDIDATE_ONLY"]);expect(r.items[1].answer).toBeUndefined();expect(r.items[1].issues[0].details.suggestedCitations[0].startLine).toBe(3);expect(files.read("Knowledge/a.md").text).toBe(original);
});
it("sends actual check feedback back for repair and delivers only the rechecked batch",async()=>{
 const{files,service,answer,citation}=fixture();let calls=0;
 const result=await runAgentTask(service,[{id:"Q1",question:"局部检查是否证明实际效果？"}],async request=>{
  calls++;if(request.round===0)return {answers:[{...answer(),citations:[{...citation,startLine:1,endLine:2}],relations:[{source:a,predicate:"complements",target:b}]}]};
  expect((request.feedback as any).items[0].issues.map((i:any)=>i.code)).toEqual(["WRONG_LINES","CANDIDATE_ONLY"]);
  return {answers:[{...answer(),relations:[],candidateRelations:[{source:a,predicate:"complements",target:b,state:"candidate",missingEvidence:"重新取得对应证据"}]}]};
 });
 expect(calls).toBe(2);expect(result.repairRounds).toBe(1);expect(result.outcome).toBe("delivered");expect(result.delivery.answers[0].relations).toEqual([]);expect(result.delivery.answers[0].candidateRelations[0]).toMatchObject({state:"candidate",missingEvidence:"补充课程与版本标识"});expect((await prepare(service,{answers:result.delivery.answers,expectedIds:["Q1"]})).delivery.receipt.id).toBe(result.delivery.receipt.id);expect(files.read("Knowledge/a.md").text).toContain("state: candidate");
});
it("removes an invalid confident body on exhaustion while preserving separately valid answers",async()=>{
 const{service,answer}=fixture();const bad={...answer("Q2"),answer:"实际效果已经100%证明。",citations:[{...answer().citations[0],quote:"不存在的试验通过原句"}]};
 const result=await runAgentTask(service,[{id:"Q1",question:"有什么局部记录？"},{id:"Q2",question:"实际效果是否成立？"}],async()=>({answers:[answer(),bad],delivery:{status:"ready",answers:[bad]}}),{maxRepairs:1});
 expect(result.attempts).toBe(2);expect(result.fallbackIds).toEqual(["Q2"]);expect(result.delivery.receipt.status).toBe("uncertain");expect(result.delivery.answers[0].answer).toBe(answer().answer);expect(result.delivery.answers[1]).toMatchObject({conclusion:"unknown",citations:[],relations:[],candidateRelations:[]});expect(JSON.stringify(result.delivery)).not.toContain("实际效果已经100%证明");expect(result.delivery.answers[1].uncertainties.join(" ")).toContain("QUOTE_NOT_FOUND");
});
it("rejects stale source versions even when the Agent says it already checked",async()=>{
 const{files,service,answer,source}=fixture();files.write("Materials/source.md",source+"后续记录。\n");
 const result=await runAgentTask(service,[{id:"Q1",question:"检查记录能否使用？"}],async()=>JSON.stringify({answers:[answer()],validation:"passed"}),{maxRepairs:0});
 expect(result.history[0].items[0].issues.some((i:any)=>i.code==="STALE_SOURCE")).toBe(true);expect(result.fallbackIds).toEqual(["Q1"]);expect(result.delivery.answers[0].conclusion).toBe("unknown");
});
it("does not launder an unchanged confident body by removing its citation and changing the label",async()=>{
 const{service,answer}=fixture();let calls=0;
 const result=await runAgentTask(service,[{id:"Q1",question:"实际结果是否已证实？"}],async request=>{
  calls++;return {answers:[{...answer(),answer:"实际结果已经完全证实。",conclusion:request.round?"unknown":"supported",citations:request.round?[]:[{...answer().citations[0],quote:"虚构的证明"}],uncertainties:["未找到可核对原文。"]}]};
 });
 expect(calls).toBe(2);expect(result.outcome).toBe("uncertain");expect(result.delivery.answers[0].answer).toBe("当前没有通过核对的原文依据，暂保留未知。");expect(JSON.stringify(result.delivery)).not.toContain("实际结果已经完全证实");
});
it("does not deliver a dropped or duplicated question, missing evidence, or invented candidate",async()=>{
 const{service,answer}=fixture();expect((await prepare(service,{answers:[answer()],expectedIds:["Q1","Q2"]})).globalIssues[0].code).toBe("ANSWER_SCOPE_MISMATCH");expect((await prepare(service,{answers:[answer(),answer()]})).globalIssues[0].code).toBe("DUPLICATE_ANSWER_ID");
 const r=await prepare(service,{answers:[{...answer(),citations:[],candidateRelations:[{source:b,predicate:"complements",target:a,state:"candidate",missingEvidence:"未经记录的联系"}]}]});expect(r.delivery).toBeNull();expect(r.items[0].issues.map((i:any)=>i.code)).toEqual(["EVIDENCE_REQUIRED","NOT_DECLARED_CANDIDATE"]);
 const unknown={...answer(),conclusion:"unknown",citations:[],relations:[],uncertainties:["未获得原文。"]};expect((await prepare(service,{answers:[unknown]})).delivery.receipt.status).toBe("uncertain");
});
it("returns actionable validation failures for malformed elements and refuses stale workspace receipts",async()=>{
 const{service,answer}=fixture();const r=await prepare(service,{answers:[{...answer(),citations:[null],relations:[null]}]});expect(r.delivery).toBeNull();expect(r.items[0].issues.map((i:any)=>i.code)).toEqual(["INVALID_CITATION","INVALID_RELATION"]);
 await expect(prepare(service,{answers:[answer()],revision:"0".repeat(64)})).rejects.toMatchObject({code:"STALE_WORKSPACE"});expect(toolDefinitions(false).find(t=>t.name==="rd_prepare_answer")?.annotations.readOnlyHint).toBe(true);
});
it("retains unknown after invalid JSON or Agent failure without treating it as a completed answer",async()=>{
 const{service}=fixture();const result=await runAgentTask(service,[{id:"Q1",question:"材料缺失时怎么办？"}],async()=>"已经校验通过。 {\"answers\":[]}",{maxRepairs:0});expect(result.outcome).toBe("uncertain");expect(result.fallbackIds).toEqual(["Q1"]);expect(result.history[0].globalIssues[0].code).toBe("DRAFT_ERROR");expect(result.delivery.answers[0].citations).toEqual([]);
});

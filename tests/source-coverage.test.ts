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
import {isCurrentQuestion} from "../standalone/coverage";
import {toolDefinitions} from "../standalone/mcp";

const dirs:string[]=[],services:KnowledgeService[]=[];
const c="ko-20261108-0201",e="ko-20261108-0202";
const md=(fields:any,body:string)=>"---\n"+stringify(fields)+"---\n"+body;
function fixture(){
 const dir=fs.mkdtempSync(path.join(tmpdir(),"rd-coverage-"));dirs.push(dir);
 const files=new RootFiles(path.join(dir,"knowledge"),true);initialize(files,path.join(dir,"key.pem"));
 const repo="Owner/Example-App",family="repository:owner/example-app";
 const source=(p:string,body:string,extra:any={})=>files.write(p,md({rd_material:true,rd_origin:{repository:repo,url:"https://github.com/Owner/Example-App/blob/pinned/"+path.basename(p)},rd_captured_at:"2099-01-01",...extra},body));
 source("Materials/current.md","# Example App\n**当前发布：v2.0.0-rc.2 工程测试版。**\n");
 source("Materials/history.md","# Historical report\n[旧版 v2.0.0-rc.1](https://github.com/Owner/Example-App/releases/tag/v2.0.0-rc.1)\n",{rd_origin:{threadId:"thread-one"},rd_event_date:"2025-01-01"});
 source("Materials/course.md","# Course v99.0\nCurrent course design is a draft.\n",{rd_origin:{originalPath:"/course-v99.docx"}});
 files.write("Knowledge/case.md",md({object_id:c,kind:"concept",status:"candidate",title:"Example App：示例工程",rd_roles:["case"],rd_sources:[{path:"Materials/history.md"},{path:"Materials/course.md"} ]},"# Example App\n"));
 files.write("Knowledge/evidence.md",md({object_id:e,kind:"reference",status:"candidate",title:"Saved repository",rd_roles:["evidence"],complements:[c],rd_sources:[{path:"Materials/current.md"}]},"# Saved repository\n"));
 const service=new KnowledgeService(files.root,path.join(dir,"key.pem"));services.push(service);
 const questions=[{id:"Q1",question:"Example App 当前公开版本怎样？"}];
 const plan=()=>service.execute("source_coverage",{query:questions[0].question});
 const answer=(p:any)=>({id:"Q1",claim:"Example App 的库内发布记录",answer:"库内 README 声明 v2.0.0-rc.2；历史记录是 v2.0.0-rc.1。外部当前状态未知。",conclusion:"bounded",citations:p.requiredEvidence.map((s:any)=>s.citation),relations:[],candidateRelations:[],uncertainties:["未核对外部实时发布。"],sourceReview:{status:"snapshot",currentVersions:[{family,version:"2.0.0-rc.2"}],historicalVersions:[{family,version:"2.0.0-rc.1"}],limits:["仅核对保存的来源；外部当前状态未知。"]}});
 const prepare=(a:any)=>service.execute("prepare_answer",{answers:[a],questions});
 return {files,service,source,questions,plan,answer,prepare,family};
}
afterEach(async()=>{for(const s of services.splice(0))await s.close();for(const dir of dirs.splice(0)){if(!path.resolve(dir).startsWith(path.join(tmpdir(),"rd-coverage-")))throw Error("Unsafe cleanup");fs.rmSync(dir,{recursive:true,force:true});}});

it("follows incoming evidence to current and historical sources without treating a course version as a release",async()=>{
 const {plan,answer,prepare}=fixture(),p=await plan();expect(p.scopes).toHaveLength(1);expect(p.families).toHaveLength(1);expect(p.families[0].current[0].version).toBe("2.0.0-rc.2");expect(p.families[0].history[0].version).toBe("2.0.0-rc.1");expect(JSON.stringify(p.requiredEvidence)).not.toContain("99.0");
 expect(p.records.find((r:any)=>r.path==="Materials/history.md")).toMatchObject({sourceDate:"2025-01-01",capturedAt:"2099-01-01"});
 const r=await prepare(answer(p));expect(r.status).toBe("ready");expect(r.delivery.receipt.sourceCoverageChecked).toBe(1);expect(r.delivery.answers[0].sourceReview).toMatchObject({externalCurrentState:"unknown",snapshotRevision:p.revision});
});
it("blocks an exact historical quote when the saved current release was omitted",async()=>{
 const{plan,answer,prepare}=fixture(),p=await plan(),a=answer(p);a.citations=a.citations.filter((s:any)=>s.path!=="Materials/current.md");a.answer="历史版本 v2.0.0-rc.1。";a.sourceReview.currentVersions=[];
 const r=await prepare(a);expect(r.delivery).toBeNull();expect(r.items[0].issues.map((i:any)=>i.code)).toEqual(expect.arrayContaining(["CURRENT_RECORD_OMITTED","SOURCE_RECORD_COVERAGE_INCOMPLETE","VERSION_COMPARISON_INCOMPLETE","VERSION_OMITTED_FROM_ANSWER"]));
});
it("requires historical comparison and version wording, not merely metadata or citations",async()=>{
 const{plan,answer,prepare}=fixture(),p=await plan(),a=answer(p);a.citations=a.citations.filter((s:any)=>s.path!=="Materials/history.md");a.answer="新版可用，旧版也曾存在。";
 const r=await prepare(a);expect(r.delivery).toBeNull();expect(r.items[0].issues.map((i:any)=>i.code)).toEqual(expect.arrayContaining(["HISTORICAL_RECORD_OMITTED","VERSION_OMITTED_FROM_ANSWER"]));
});
it("discovers unlinked same-origin snapshots, never ordering conflicting assertions by version magnitude or capture date",async()=>{
 const{files,source,plan,answer,prepare}=fixture(),old=await plan();source("Materials/unlinked.md","# Example App\n当前版本：v3.0.0\n",{rd_captured_at:"2100-01-01"});const p=await plan();expect(p.revision).not.toBe(old.revision);expect(p.records.some((r:any)=>r.path==="Materials/unlinked.md")).toBe(true);expect(p.families[0].status).toBe("conflicting_current_assertions");
 const r=await prepare(answer(old));expect(r.delivery).toBeNull();expect(r.items[0].issues.some((i:any)=>i.code==="CURRENT_STATE_UNRESOLVED")).toBe(true);
 // Coverage is read-only and must not promote the candidate objects.
 expect(files.read("Knowledge/case.md").text).toContain("status: candidate");
});
it("does not count an excerpt and its original conversation as two different provenance records",async()=>{
 const{source,plan}=fixture();source("Materials/excerpt.md","# Excerpt\nReview of thread one.\n",{rd_origin_thread:"thread-one",rd_origin:{}});const p=await plan(),rows=p.records.filter((r:any)=>["Materials/history.md","Materials/excerpt.md"].includes(r.path));expect(rows).toHaveLength(2);expect(new Set(rows.map((r:any)=>r.recordKey)).size).toBe(1);
});
it("keeps a referenced dependency in its own version family",async()=>{
 const{source,plan,family}=fixture();source("Materials/current.md","# Example App\n当前发布：v2.0.0-rc.2\n[Dependency v8.0.0](https://github.com/Other/Dependency/releases/tag/v8.0.0)\n");const p=await plan();expect(p.families.find((f:any)=>f.family===family).history.map((s:any)=>s.version)).toEqual(["2.0.0-rc.1"]);expect(p.families.find((f:any)=>f.family==="repository:other/dependency")).toMatchObject({status:"historical_only",current:[]});
});
it("withdraws confident current-state prose when coverage is unknown, even if its citations align",async()=>{
 const{plan,answer,prepare}=fixture(),p=await plan(),a=answer(p);a.answer="最新版本已经获得全面验证。";a.sourceReview={status:"unknown",currentVersions:[],historicalVersions:[],limits:["缺少实时记录。"]};const r=await prepare(a);expect(r.delivery.answers[0]).toMatchObject({conclusion:"unknown",answer:"当前来源或版本覆盖不足，不能确认当前状态。"});expect(r.delivery.receipt.status).toBe("uncertain");
});
it("requires original unique questions and an explicit review rather than trusting the model's validation flag",async()=>{
 const{service,plan,answer,prepare,questions}=fixture(),a=answer(await plan());delete (a as any).sourceReview;const r=await prepare({...a,validated:true});expect(r.delivery).toBeNull();expect(r.items[0].issues[0].code).toBe("SOURCE_COVERAGE_REQUIRED");await expect(service.execute("prepare_answer",{answers:[a]})).rejects.toMatchObject({code:"INVALID_ARGUMENT"});await expect(service.execute("prepare_answer",{answers:[a],questions:[...questions,...questions]})).rejects.toMatchObject({code:"INVALID_ARGUMENT"});expect(toolDefinitions(false).find(t=>t.name==="rd_source_coverage")?.annotations.readOnlyHint).toBe(true);
});
it("preflights before generation, repairs a missed release and protects the host's original questions",async()=>{
 const{service,questions,answer}=fixture();let calls=0;const r=await runAgentTask(service,questions,async request=>{calls++;const p=request.coveragePlans[0];expect(p.requiredEvidence).toHaveLength(2);const a=answer(p);if(!request.round){request.questions[0].mode="general";a.citations=a.citations.filter((s:any)=>s.path!=="Materials/current.md");}else expect((request.feedback as any).items[0].issues.some((i:any)=>i.code==="CURRENT_RECORD_OMITTED")).toBe(true);return {answers:[a]};});expect(calls).toBe(2);expect(r.repairRounds).toBe(1);expect(r.delivery.answers[0].answer).toContain("rc.2");expect(questions[0]).not.toHaveProperty("mode");
});
it("rechecks coverage after sources change during generation and falls back to unknown",async()=>{
 const{service,questions,source,answer}=fixture();const r=await runAgentTask(service,questions,async request=>{const a=answer(request.coveragePlans[0]);source("Materials/unlinked.md","# Example App\n当前发布：v4.0.0\n");return {answers:[a]};},{maxRepairs:0});expect(r.outcome).toBe("uncertain");expect(r.fallbackIds).toEqual(["Q1"]);expect(r.delivery.answers[0].citations).toEqual([]);expect(r.delivery.answers[0].sourceReview.status).toBe("unknown");
});
it("allows explicitly historical questions and keeps uncertain scope visible",async()=>{
 const{service}=fixture();expect(isCurrentQuestion({id:"Q",question:"version history",mode:"historical"})).toBe(false);const p=await service.execute("source_coverage",{query:"Unlisted project 最新情况"});expect(p.scopes).toEqual([]);expect(p.gaps.length).toBeGreaterThan(0);
});
it("keeps receipts stable when rechecking snapshot and unknown answers with coverage gaps",async()=>{
 const{source,plan,answer,prepare}=fixture();source("Materials/current.md","# Example App\nSaved status is frozen; real outcomes are unknown.\n");const p=await plan(),a=answer(p);a.sourceReview.currentVersions=[];a.answer="历史发布为 v2.0.0-rc.1；现有冻结说明不足以确认外部当前状态。";a.citations.push(p.records.find((r:any)=>r.path==="Materials/current.md").overview.at(-1));const first=await prepare(a);expect(first.delivery).not.toBeNull();expect((await prepare(first.delivery.answers[0])).delivery.receipt.id).toBe(first.delivery.receipt.id);
 a.sourceReview={status:"unknown",currentVersions:[],historicalVersions:[],limits:Array.from({length:24},(_,i)=>"缺口 "+i)};const unknown=await prepare(a);expect(unknown.delivery.answers[0].sourceReview.limits).toHaveLength(24);expect((await prepare(unknown.delivery.answers[0])).delivery.receipt.id).toBe(unknown.delivery.receipt.id);
});

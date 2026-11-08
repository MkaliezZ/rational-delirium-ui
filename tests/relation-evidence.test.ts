// @vitest-environment node
import {afterEach,expect,it} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {tmpdir} from "node:os";
import {stringify} from "yaml";
import {RootFiles,sha256} from "../standalone/files";
import {initialize} from "../standalone/mutations";
import {KnowledgeService} from "../standalone/service";

const dirs:string[]=[],services:KnowledgeService[]=[];
afterEach(async()=>{for(const s of services.splice(0))await s.close();for(const d of dirs.splice(0))fs.rmSync(d,{recursive:true,force:true});});
function fixture(){const dir=fs.mkdtempSync(path.join(tmpdir(),"rd-basis-"));dirs.push(dir);const files=new RootFiles(path.join(dir,"knowledge"),true),key=path.join(dir,"key.pem");initialize(files,key);const service=new KnowledgeService(files.root,key);services.push(service);return {files,service};}
const md=(id:string,extra:any={})=>"---\n"+stringify({object_id:id,kind:"reference",status:"candidate",title:id,...extra},{aliasDuplicateObjects:false})+"---\n# "+id+"\n";
const source="# 原文\n\n尚未进行真人验证。\n";
const citation={path:"Materials/a.md",revision:sha256(source),startLine:3,endLine:3,quote:"尚未进行真人验证。"};
it("keeps malformed externally edited candidate metadata readable with diagnostics",async()=>{
    const {files,service}=fixture();files.write("Knowledge/a.md",md("ko-20261107-0001",{rd_relation_candidates:[{state:"candidate",target:"x",evidence:"invalid"}]}));
    const n=await service.execute("get",{id:"ko-20261107-0001"});expect(n.diagnostics.some((d:any)=>d.type==="invalid-role-metadata")).toBe(true);expect(n.relationCandidates[0].evidence).toEqual([]);
});
it("keeps supplements directional, candidates outside the graph, and exposes exact evidence availability",async()=>{
    const {files,service}=fixture();files.write(citation.path,source);files.write("Knowledge/b.md",md("ko-20261107-0002"));
    const data={complements:["ko-20261107-0002"],rd_relation_notes:[{predicate:"complements",target:"ko-20261107-0002",reason:"补充验证边界",scope:"历史工程报告",evidence:[citation]}],rd_relation_candidates:[{state:"candidate",predicate:"supports",target:"ko-20261107-0002",reason:"仍需真人数据",evidence:[citation]}]};
    await service.execute("save",{path:"Knowledge/a.md",revision:null,markdown:md("ko-20261107-0001",data)},true);
    const relations=(await service.execute("relations",{id:"ko-20261107-0001"})).relations;
    expect(relations).toHaveLength(1);expect(relations[0]).toMatchObject({predicate:"complements",direction:"outgoing"});
    expect(relations[0].assertions[0].basis[0]).toMatchObject({scope:"历史工程报告",evidence:[{...citation,availability:"current"}]});
    expect((await service.execute("get",{id:"ko-20261107-0001"})).relationCandidates[0].evidence[0].availability).toBe("current");
    expect((await service.execute("context",{id:"ko-20261107-0001"})).edges.map((e:any)=>e.relation)).toEqual(["complements"]);
    files.write(citation.path,source+"新增记录\n");
    expect((await service.execute("get",{id:"ko-20261107-0001"})).relationCandidates[0].evidence[0]).toMatchObject({availability:"changed",quote:citation.quote});
});
it("rejects fabricated quotes for the cited revision, while retaining explicitly historical or missing source versions",async()=>{
    const {files,service}=fixture();files.write(citation.path,source);
    const candidate=(e:any)=>({rd_relation_candidates:[{state:"candidate",predicate:"supports",target:"ko-20261107-0002",reason:"待核对",evidence:[e]}]});
    await expect(service.execute("save",{path:"Knowledge/a.md",revision:null,markdown:md("ko-20261107-0001",candidate({...citation,quote:"已经完成真人验证。"}))},true)).rejects.toMatchObject({code:"INVALID_CITATION"});
    await service.execute("save",{path:"Knowledge/a.md",revision:null,markdown:md("ko-20261107-0001",candidate({...citation,revision:"a".repeat(64)}))},true);
    expect((await service.execute("get",{id:"ko-20261107-0001"})).relationCandidates[0].evidence[0].availability).toBe("changed");
    await service.execute("save",{path:"Knowledge/c.md",revision:null,markdown:md("ko-20261107-0003",candidate({...citation,path:"Materials/missing.md"}))},true);
    expect((await service.execute("get",{id:"ko-20261107-0003"})).relationCandidates[0].evidence[0].availability).toBe("missing");
});
it("checks citations against source content staged in the same transaction",async()=>{
    const {service}=fixture();
    const args=(quote:string)=>({actor:"operator",reason:"同时导入原文和摘录",changes:[{path:citation.path,beforeSha256:null,afterMarkdown:source},{path:"Knowledge/a.md",beforeSha256:null,afterMarkdown:md("ko-20261107-0001",{rd_relation_notes:[{predicate:"complements",target:"ko-20261107-0002",reason:"边界",evidence:[{...citation,quote}]}]})}]});
    await expect(service.execute("propose",args("伪造的原文"))).rejects.toMatchObject({code:"INVALID_CITATION"});
    const p=await service.execute("propose",args(citation.quote));await service.execute("decide",{id:p.id,digest:p.digest,decision:"approved",reviewer:"operator"},true);await service.execute("apply",{id:p.id});
    expect((await service.execute("get",{id:"ko-20261107-0001"})).frontmatter.rd_relation_notes[0].evidence[0].quote).toBe(citation.quote);
});

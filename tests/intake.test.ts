// @vitest-environment node
import {afterEach,expect,it} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {tmpdir} from "node:os";
import {collectIntake,transcriptText} from "../standalone/intake-sources";
import {runIntake,intakePackets,type IntakeGenerator} from "../standalone/intake";
import {KnowledgeService} from "../standalone/service";
import {sha256} from "../standalone/files";
const dirs:string[]=[];
function fixture(){const dir=fs.mkdtempSync(path.join(tmpdir(),"rd-intake-test-"));dirs.push(dir);const input=path.join(dir,"input"),root=path.join(dir,"knowledge"),key=path.join(dir,"key.pem");fs.mkdirSync(input);fs.writeFileSync(path.join(input,"record.md"),"# Example project\n\n本次测试完成。实测只覆盖本机，用户效果未知。\n可能的解释是缓存影响延迟。\n另一份测量不支持缓存是唯一原因。\n");const manifest={schema:"rd-intake/1",name:"Example",purpose:"Review project observations and open explanations",sources:[{type:"local",path:input}]};return {dir,input,root,key,manifest};}
afterEach(()=>{for(const dir of dirs.splice(0)){if(!path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep+"rd-intake-test-"))throw Error("Unsafe cleanup");fs.rmSync(dir,{recursive:true,force:true});}});
function citation(p:any,text:string){const index=p.quote.split("\n").findIndex((l:string)=>l.includes(text));return {path:p.path,revision:p.revision,startLine:p.startLine+index,endLine:p.startLine+index,quote:text};}
const generator:IntakeGenerator=async r=>{
 if(r.phase==="extract"){const p=r.packets![0],c=citation(p,"本次测试完成。实测只覆盖本机，用户效果未知。"),h=citation(p,"可能的解释是缓存影响延迟。");return {items:[{key:"case",title:"Example project 本机测试",body:c.quote,roles:["case","evidence"],citations:[c],uncertainties:["用户效果未知"]},{key:"hypothesis",title:"缓存可能影响延迟",body:h.quote,roles:["hypothesis","loop"],citations:[h],uncertainties:["重复性未证实"]}],dispositions:r.packets!.map(p=>({packetId:p.packetId,status:"used",reason:"重要测试与解释"}))};}
 if(r.phase==="relate"){const [c,h]=r.objects!;return {relations:[{source:c.key,target:h.key,predicate:"complements",state:"declared",reason:"本机范围限制补充解释",missingEvidence:"",evidence:[...c.citations,...h.citations]},{source:h.key,target:c.key,predicate:"supports",state:"candidate",reason:"猜测缓存机制尚未排除其他原因",missingEvidence:"缺少控制变量对照",evidence:[...h.citations,...c.citations]}]};}
 return {reviews:r.relations!.map((_,index)=>({index,decision:"confirm",reason:"引文范围内补充，候选不自动提升",missingEvidence:"控制变量对照"}))};
};
it("collects only the specified scope, rejects links and redacts credentials before model or Markdown",async()=>{
 const f=fixture();fs.writeFileSync(path.join(f.input,"config.txt"),"API_KEY=sk-"+"x".repeat(30));fs.writeFileSync(path.join(f.input,"outside.txt"),"not selected");fs.mkdirSync(path.join(f.input,".hidden"));fs.writeFileSync(path.join(f.input,".hidden","private.md"),"hidden");const m={...f.manifest,sources:[{type:"local",path:f.input,include:["record.md","config.txt"]}]};
 const c=await collectIntake(m,f.dir,f.root);expect(c.materials).toHaveLength(2);expect(JSON.stringify(c)).not.toContain("sk-"+"x".repeat(30));expect(c.materials.some(s=>s.redactions>0)).toBe(true);expect(c.skipped.some(s=>s.source.includes(".hidden"))).toBe(true);expect(JSON.stringify(c.materials)).not.toContain("not selected");
 await expect(collectIntake({...m,sources:[{type:"local",path:path.parse(f.root).root}]},f.dir,f.root)).rejects.toMatchObject({code:"INVALID_SCOPE"});
});
it("extracts visible Codex/Claude messages while omitting reasoning, tool output and system instructions",()=>{
 const lines=[{type:"response_item",payload:{type:"message",role:"user",content:[{type:"input_text",text:"Visible user"}]}},{type:"response_item",payload:{type:"message",role:"assistant",channel:"analysis",content:[{type:"output_text",text:"PRIVATE REASONING"}]}},{type:"response_item",payload:{type:"message",role:"assistant",channel:"final",content:[{type:"output_text",text:"Visible assistant"}]}},{type:"assistant",message:{role:"assistant",content:[{type:"thinking",thinking:"PRIVATE THINKING"},{type:"text",text:"Visible Claude"}]}},{role:"system",content:"SYSTEM SECRET"},{role:"tool",content:"TOOL SECRET"}].map(v=>JSON.stringify(v)).join("\n");const text=transcriptText(lines,true);expect(text).toContain("Visible user");expect(text).toContain("Visible assistant");expect(text).toContain("Visible Claude");expect(text).not.toMatch(/PRIVATE|SECRET/);
});
it("runs extraction, second-pass relations, source checks, journal writes and idempotent refresh end to end",async()=>{
 const f=fixture(),r=await runIntake(f.root,f.manifest,generator,{key:f.key});expect(r.status).toBe("complete");expect(r.summary).toMatchObject({objects:2,formalRelations:1,candidates:1});expect(r.transactions.length).toBe(3);
 const s=new KnowledgeService(f.root,f.key);try{const status=await s.execute("status");expect(status.structurallyValid).toBe(true);const boards=await s.execute("boards");expect(boards.counts).toMatchObject({case:1,evidence:1,hypothesis:1,loop:1});const h=await s.execute("get",{id:r.items.find((n:any)=>n.key.endsWith("hypothesis")).id});expect(h.relationCandidates[0].state).toBe("candidate");expect(h.relationCandidates[0].acceptance).toBe("控制变量对照");expect((await s.execute("check_relations",{relations:[{source:h.id,predicate:"supports",target:r.items[0].id}]})).checks[0].code).toBe("CANDIDATE_ONLY");for(const n of r.items)expect((await s.execute("check_citations",{citations:n.citations})).allValid).toBe(true);const again=await runIntake(f.root,f.manifest,async()=>{throw Error("Must not regenerate");},{key:f.key});expect(again.status).toBe("unchanged");expect((await s.execute("status")).revision).toBe(status.revision);}finally{await s.close();}
});
it("repairs a mixed valid/invalid quote rather than accepting the valid subset",async()=>{
 const f=fixture();let repaired=false;const generate:IntakeGenerator=async r=>{if(r.phase==="extract"&&r.round===0){const d:any=await generator(r);d.items[0].citations.push({...d.items[0].citations[0],quote:"FABRICATED"});return d;}if(r.phase==="extract")repaired=true;return generator(r);};const r=await runIntake(f.root,f.manifest,generate,{key:f.key});expect(repaired).toBe(true);expect(r.status).toBe("complete");expect(JSON.stringify(r.items)).not.toContain("FABRICATED");
});
it("failed semantic verification retains candidates and never accepts an Agent's approval flag",async()=>{
 const f=fixture();const generate:IntakeGenerator=async r=>r.phase==="verify"?{approved:true}:generator(r);const r=await runIntake(f.root,f.manifest,generate,{key:f.key});expect(r.status).toBe("partial");expect(r.summary.formalRelations).toBe(0);expect(r.summary.candidates).toBe(2);
});
it("a failed extraction keeps originals and an explicit unresolved record",async()=>{
 const f=fixture();const r=await runIntake(f.root,f.manifest,async()=>({items:[],dispositions:[]}),{key:f.key});expect(r.status).toBe("partial");expect(r.summary.objects).toBe(0);expect(r.dispositions[0].status).toBe("unresolved");expect(fs.existsSync(path.join(f.root,r.sources[0].path))).toBe(true);
});
it("keeps historical source snapshots and only processes changed source versions",async()=>{
 const f=fixture(),first=await runIntake(f.root,f.manifest,generator,{key:f.key}),before=first.items.map((n:any)=>[n.path,sha256(fs.readFileSync(path.join(f.root,n.path)))]);fs.writeFileSync(path.join(f.input,"new.txt"),"# Supplemental\n\n新材料仍不足以确认结论。\n");let packets=0;const second=await runIntake(f.root,f.manifest,async r=>{if(r.phase==="extract"){packets+=r.packets!.length;return {items:[],dispositions:r.packets!.map(p=>({packetId:p.packetId,status:"skipped",reason:"暂未形成重要独立知识"}))};}return {relations:[]};},{key:f.key});expect(second.status).toBe("complete");expect(second.reusedSources).toBe(1);expect(packets).toBe(1);for(const [p,hash]of before)expect(sha256(fs.readFileSync(path.join(f.root,p)))).toBe(hash);
});
it("GitHub collection pins commits, retains rc.2 and history, and excludes symlink blobs",async()=>{
 const f=fixture(),sha="a".repeat(40),tree="b".repeat(40),blob="c".repeat(40),requests:string[]=[];const fake=async(url:any)=>{requests.push(url);if(url.includes("/commits/"))return Response.json({sha,commit:{tree:{sha:tree}}});if(url.includes("/git/trees/"))return Response.json({tree:[{path:"README.md",type:"blob",mode:"100644",sha:blob,size:5},{path:"link.md",type:"blob",mode:"120000",sha:blob,size:5}],truncated:false});if(url.includes("/git/blobs/"))return Response.json({encoding:"base64",content:Buffer.from("hello").toString("base64")});return Response.json([{tag_name:"v0.6.0-rc.2",html_url:"https://github.com/example/repo/releases/tag/v0.6.0-rc.2",prerelease:true},{tag_name:"v0.6.0-rc.1",html_url:"https://github.com/example/repo/releases/tag/v0.6.0-rc.1",prerelease:true}]);};const c=await collectIntake({...f.manifest,sources:[{type:"github",repository:"example/repo",include:["*.md"],historyRefs:["v0.6.0-rc.1"]}]},f.dir,f.root,{fetch:fake as typeof fetch});expect(c.materials).toHaveLength(3);expect(c.materials.filter(m=>m.origin.commit===sha)).toHaveLength(2);expect(c.materials.find(m=>m.origin.originalPath==="{published-releases}")!.markdown).toMatch(/rc\.2[\s\S]*rc\.1/);expect(c.skipped.some(s=>s.source.endsWith("link.md"))).toBe(true);expect(requests.every(u=>u.startsWith("https://api.github.com/repos/example/repo/"))).toBe(true);
});
it("rejects scope typos and ignores directory junctions rather than escaping the selected material root",async()=>{
 const f=fixture(),other=path.join(f.dir,"outside");fs.mkdirSync(other);fs.writeFileSync(path.join(other,"private.md"),"MUST NOT COLLECT");fs.symlinkSync(other,path.join(f.input,"jump"),process.platform==="win32"?"junction":"dir");
 const c=await collectIntake(f.manifest,f.dir,f.root);expect(JSON.stringify(c.materials)).not.toContain("MUST NOT COLLECT");expect(c.skipped.some(s=>s.reason.includes("junction"))).toBe(true);
 await expect(collectIntake({...f.manifest,sources:[{type:"local",path:f.input,excludes:["*.md"]}]},f.dir,f.root)).rejects.toMatchObject({code:"INVALID_SCOPE"});
});
it("preserves repeated visible messages and follows the selected conversation branch",()=>{
 const text=transcriptText(JSON.stringify({current_node:"c",mapping:{a:{parent:null,message:{role:"user",content:"repeat"}},b:{parent:"a",message:{role:"assistant",content:"WRONG BRANCH"}},c:{parent:"a",message:{role:"user",content:"repeat"}}}}),false);expect(text.match(/repeat/g)).toHaveLength(2);expect(text).not.toContain("WRONG BRANCH");
 expect(()=>transcriptText(JSON.stringify({mapping:{a:{message:{role:"user",content:"unknown branch"}}}}),false)).toThrow("current_node");
});
it("long original lines are fully packetized with stable original line numbers",async()=>{
 const f=fixture(),text="原".repeat(45001);fs.writeFileSync(path.join(f.input,"long.txt"),text);const c=await collectIntake({...f.manifest,sources:[{type:"local",path:path.join(f.input,"long.txt")}]},f.dir,f.root),packets=intakePackets(c.materials[0]);expect(packets.map(p=>p.quote).join("")).toBe(text);expect(packets).toHaveLength(4);expect(new Set(packets.map(p=>p.startLine)).size).toBe(1);expect(new Set(packets.map(p=>p.packetId)).size).toBe(4);
});
it("rechecks saved source versions after Agent generation and blocks stale knowledge writes",async()=>{
 const f=fixture();let modified=false;await expect(runIntake(f.root,f.manifest,async r=>{const d=await generator(r);if(r.phase==="extract"&&!modified){modified=true;fs.appendFileSync(path.join(f.root,r.packets![0].path),"EXTERNAL EDIT\n");}return d;},{key:f.key})).rejects.toMatchObject({code:"STALE_EVIDENCE"});
 const s=new KnowledgeService(f.root,f.key);try{expect((await s.execute("status")).counts.objects).toBe(0);}finally{await s.close();}
});
it("retains old snapshots when the original file changes instead of replacing historical evidence",async()=>{
 const f=fixture(),first=await runIntake(f.root,f.manifest,generator,{key:f.key});fs.appendFileSync(path.join(f.input,"record.md"),"后续版本仍有边界。\n");const second=await runIntake(f.root,f.manifest,generator,{key:f.key});expect(second.status).toBe("complete");expect(second.sources[0].path).not.toBe(first.sources[0].path);expect(fs.existsSync(path.join(f.root,first.sources[0].path))).toBe(true);expect(fs.existsSync(path.join(f.root,second.sources[0].path))).toBe(true);expect(second.reusedSources).toBe(0);
});
it("keeps byte-distinct line-ending versions even when normalized text is identical",async()=>{
 const f=fixture();fs.writeFileSync(path.join(f.input,"record.md"),"same\r\ntext\r\n");const a=await collectIntake(f.manifest,f.dir,f.root);fs.writeFileSync(path.join(f.input,"record.md"),"same\ntext\n");const b=await collectIntake(f.manifest,f.dir,f.root);expect(a.materials[0].contentHash).toBe(b.materials[0].contentHash);expect(a.materials[0].path).not.toBe(b.materials[0].path);
});
it("repairs a bad relation batch as a whole and refuses source declarations hidden in generated prose",async()=>{
 const f=fixture();let repaired=false;const r=await runIntake(f.root,f.manifest,async req=>{const d:any=await generator(req);if(req.phase==="relate"&&req.round===0)d.relations[0].target="invented";if(req.phase==="relate"&&req.round===1)repaired=true;return d;},{key:f.key});expect(repaired).toBe(true);expect(r.summary.formalRelations).toBe(1);
 const other=fixture();const bad=await runIntake(other.root,other.manifest,async req=>{const d:any=await generator(req);if(req.phase==="extract")d.items[0].body+="\nrepeats_in: [[Knowledge/other]]\n";return d;},{key:other.key});expect(bad.status).toBe("partial");expect(bad.summary.objects).toBe(0);
});
it("uses the same exact-substring citation contract at review and journal write time",async()=>{
 const f=fixture();const r=await runIntake(f.root,f.manifest,async req=>{const d:any=await generator(req);if(req.phase==="relate")for(const relation of d.relations)relation.evidence=relation.evidence.map((c:any)=>({...c,quote:c.quote.slice(0,6)}));return d;},{key:f.key});expect(r.status).toBe("complete");expect(r.summary.formalRelations).toBe(1);
});
it("pins an existing relation target interpretation and preserves a concurrent edit",async()=>{
 const f=fixture();await runIntake(f.root,f.manifest,generator,{key:f.key});fs.appendFileSync(path.join(f.input,"record.md"),"新版本记录。\n");let targetPath="";
 await expect(runIntake(f.root,f.manifest,async req=>{
  if(req.phase==="extract")return generator(req);
  if(req.phase==="relate"){const source=req.objects!.find(n=>!n.existing)!,target=req.objects!.find(n=>n.existing)!;targetPath=target.path;return {relations:[{source:source.key,target:target.id,predicate:"complements",state:"declared",reason:"补充旧解释的文档边界",missingEvidence:"",evidence:[...source.citations,...target.citations]}]};}
  fs.appendFileSync(path.join(f.root,targetPath),"Concurrent target edit.\n");return {reviews:[{index:0,decision:"confirm",reason:"Review completed against previously supplied text",missingEvidence:""}]};
 },{key:f.key})).rejects.toMatchObject({code:"STALE_EVIDENCE"});expect(fs.readFileSync(path.join(f.root,targetPath),"utf8")).toContain("Concurrent target edit.");
});

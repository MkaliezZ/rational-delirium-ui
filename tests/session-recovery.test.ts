// @vitest-environment node
import {expect,it} from "vitest";
import {sessionClient} from "../web/session";
import {KnowledgeService} from "../standalone/service";
import {startServer} from "../standalone/http";
import * as fs from "node:fs";
import * as path from "node:path";
import {tmpdir} from "node:os";

it("renews a stale tab against an actual restarted HTTP service and opens its source",async()=>{
 const dir=fs.mkdtempSync(path.join(tmpdir(),"rd-session-"));fs.writeFileSync(path.join(dir,"note.md"),"# source\n原文仍在。\n");
 let app=await startServer(new KnowledgeService(dir),{port:0,assets:path.resolve("web")});
 const url=app.url,port=Number(new URL(url).port),html=await(await fetch(url,{headers:{connection:"close"}})).text(),token=html.match(/content="([a-f0-9]{64})"/)![1];
 const client=sessionClient(token,((url:any,init:any)=>fetch(app.url+url,{...init,headers:{...init?.headers,connection:"close"}})) as typeof fetch);
 try{expect((await client("status")).ok).toBe(true);await app.close();app=await startServer(new KnowledgeService(dir),{port,assets:path.resolve("web")});expect((await client("get",{path:"note.md"})).data.body).toContain("原文仍在");const rejected=await(await fetch(url+"/api",{method:"POST",headers:{"content-type":"application/json","x-rd-token":token},body:JSON.stringify({command:"status"})})).json();expect(rejected.error.code).toBe("UNAUTHORIZED");}
 finally{await app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
it("coalesces renewal and refuses to replay a write into another workspace",async()=>{
 let current="a",expired=false,renewals=0,writes=0;
 const request=async(url:any,init:any)=>{if(url==="/"){renewals++;return new Response('<meta name="rd-token" content="'+"a".repeat(64)+'">');}const body=JSON.parse(init.body);if(expired&&init.headers["x-rd-token"]!=="a".repeat(64))return Response.json({ok:false,error:{code:"UNAUTHORIZED"}});if(body.command==="save")writes++;return Response.json({ok:true,data:{root:current,workspaceId:current}});};
 const client=sessionClient("old",request as typeof fetch);await client("status");expired=true;current="b";
 await expect(Promise.all([client("save",{}),client("get",{})])).rejects.toThrow("其他工作区");expect(renewals).toBe(1);expect(writes).toBe(0);
});

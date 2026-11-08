import {afterEach,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {overviewMarkup,readingParts} from "../web/workspace-ui";
import {setupWorkbench} from "../web/workbench-ui";
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML="";});
it("folds only a recognized intake wrapper and keeps the original source untouched",()=>{
    const text="文本来源：F:\\原稿.md\n\n原始文件 SHA-256：abc\n\n## 原始文档正文\n\n---\ntitle: 原稿\n---\n# 原稿\n\n正文依据。";
    const parts=readingParts(text);expect(parts.metadata).toContain("title: 原稿");expect(parts.body.trim()).toBe("# 原稿\n\n正文依据。");expect(text).toContain("---\ntitle: 原稿\n---");
    const ordinary="说明\n\n## 原始文档正文\n\n---\n自定义内容";expect(readingParts(ordinary)).toEqual({metadata:"",body:ordinary});
});
it("renders real overview counts and escapes source titles and paths",()=>{
    const esc=(v:unknown)=>String(v).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
    document.body.innerHTML=overviewMarkup([{path:'Notes/"example.md',title:"<script>unsafe</script>",roles:["case"]}],{case:1,evidence:3,hypothesis:0,loop:0},esc,1);
    expect(document.querySelectorAll("script")).toHaveLength(0);expect(document.querySelector('.entry-card strong')?.textContent).toBe("<script>unsafe</script>");expect(document.querySelector('.entry-card')?.getAttribute('data-path')).toBe('Notes/"example.md');expect(document.querySelector('.overview-roles [data-view=evidence] strong')?.textContent).toBe("3");
});
it("keeps every counted related entry reachable beyond the initial five",async()=>{
    const related=Array.from({length:8},(_,i)=>({id:"e"+i,path:`Evidence/${i}.md`,title:"依据"+i,roles:["evidence"],body:"原始记录"}));
    const focus={id:"case",path:"Case/a.md",title:"案例",roles:["case"]};
    const api=vi.fn().mockResolvedValue({objects:[focus,...related],edges:related.map(o=>({source:o.id,target:focus.id,relation:"related"})),unresolved:[],truncated:false});
    const ui=setupWorkbench({api,esc:v=>String(v),notify:vi.fn(),refresh:vi.fn(),open:vi.fn(),note:()=>null,view:()=>"case",settled:vi.fn()});
    const host=document.createElement("div");host.innerHTML=await ui.rolePanel({id:"case"},"case");
    expect(host.querySelectorAll('[data-action="atlas-focus"]')).toHaveLength(8);expect(host.querySelector(".atlas-more summary")?.textContent).toBe("展开其余 4 条补充路径");expect(host.querySelector('.atlas-more [data-atlas-id="e7"]')).not.toBeNull();
});
it("keeps reading, relations, provenance and overview navigation distinct in the actual app",async()=>{
    vi.resetModules();
    const html=readFileSync(join(dirname(fileURLToPath(import.meta.url)),"../web/index.html"),"utf8");document.body.innerHTML=html.split("<body>")[1].split("</body>")[0];document.head.innerHTML='<meta name="rd-token" content="test-token">';
    history.replaceState(null,"","/#view=case&path=Notes%2Fcase.md");
    vi.spyOn(window,"matchMedia").mockReturnValue({matches:true} as MediaQueryList);vi.spyOn(window,"scrollTo").mockImplementation(()=>{});vi.spyOn(globalThis,"setInterval").mockReturnValue(0 as any);
    const makeNote=(id:string,roles:string[],title:string)=>({id,roles,title,path:`Notes/${id}.md`,kind:"concept",status:"candidate",revision:"a".repeat(64),body:`# ${title}\n\n## 情境\n阅读正文。\n\n## 记录\n原始依据。\n\n## 下一步\n继续核对。`,markdown:"原始材料",bodyStartLine:1,frontmatter:{},provenance:{},diagnostics:[],citations:[]});
    const notes=[makeNote("case",["case"],"测试案例"),makeNote("evidence",["evidence"],"对应证据")];
    const counts={case:1,evidence:1,hypothesis:0,loop:0,unclassified:0};
    vi.stubGlobal("fetch",vi.fn(async(_url,init)=>{const {command,args}=JSON.parse(init.body);let data:any;
        if(command==="status")data={root:"F:\\KB",revision:"r1",counts:{files:2},readOnly:false};
        else if(command==="boards"){const rows=notes.filter(n=>!args.role||n.roles.includes(args.role));data={counts,total:rows.length,items:rows,hits:rows};}
        else if(command==="get")data=notes.find(n=>n.path===args.path);
        else if(command==="relations")data={relations:[]};
        else if(command==="context")data={objects:notes,edges:[],unresolved:[],truncated:false};
        else throw Error("Unexpected command "+command);
        return {json:async()=>({ok:true,data})};
    }));
    await import("../web/app");
    await vi.waitFor(()=>expect(document.querySelector("#main h1")?.textContent).toBe("测试案例"));
    const click=async(action:string)=>{document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();await vi.waitFor(()=>expect(document.querySelector(`[data-action="${action}"]`)).not.toBeNull());};
    const source=document.querySelector<HTMLElement>("#source")!;
    expect(source.hidden).toBe(false);expect(source.inert).toBe(false);expect(source.textContent).toContain("知识角色");expect(document.querySelectorAll("[data-directory-role]")).toHaveLength(4);expect(document.querySelector("#relation-atlas")).toBeNull();
    await click("show-source");await vi.waitFor(()=>expect(source.hidden).toBe(false));expect(document.querySelector('[data-action="show-source"]')?.getAttribute("aria-expanded")).toBe("true");
    await click("close-source");expect(source.hidden).toBe(true);expect(document.activeElement?.getAttribute("data-action")).toBe("show-source");
    await click("related-content");await vi.waitFor(()=>expect(document.querySelector("#relation-atlas")).not.toBeNull());expect(document.querySelector("#main .article")).toBeNull();
    await click("read-content");await vi.waitFor(()=>expect(document.querySelector("#main .article")).not.toBeNull());expect(document.querySelector("#relation-atlas")).toBeNull();
    document.querySelector<HTMLAnchorElement>(".brand")!.click();await vi.waitFor(()=>expect(document.querySelector("#main h1")?.textContent).toBe("知识总览"));expect(location.hash).toBe("#view=overview");expect(document.querySelector("#main")?.textContent).toContain("测试案例");expect(source.hidden).toBe(true);
    document.querySelector<HTMLButtonElement>(".entry-card")!.click();await vi.waitFor(()=>expect(document.querySelector("#main h1")?.textContent).toBe("测试案例"));expect(document.querySelector("#main .article")).not.toBeNull();
});

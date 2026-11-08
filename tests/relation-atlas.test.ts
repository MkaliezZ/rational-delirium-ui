import {afterEach,expect,it,vi} from "vitest";
import {atlasMarkup,buildAtlas,filteredPaths,type AtlasNode,type AtlasEdge} from "../web/relation-atlas";
import {caseGroups,caseIndexMarkup,type CaseFacet} from "../web/case-index";
import {setupWorkbench} from "../web/workbench-ui";
const node=(id:string,roles:AtlasNode["roles"]):AtlasNode=>({id,path:id+".md",title:id,roles,body:"原始记录",status:"candidate"});
const edge=(source:string,target:string,relation:string):AtlasEdge=>({source,target,relation,assertions:[{path:source+".md",line:7,revision:"a".repeat(64)}]});
const esc=(v:unknown)=>String(v).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
const context=(objects:AtlasNode[],edges:AtlasEdge[])=>({objects,edges,unresolved:[],truncated:false});
afterEach(()=>{document.body.innerHTML="";vi.restoreAllMocks();});
it("shows supplements as context and keeps escaped candidates apart from graph claims",async()=>{
    const m=buildAtlas("c",context([node("c",["case"]),node("e",["evidence"])],[edge("e","c","complements")]));
    expect(m.paths[0].stance).toBe("context");expect(atlasMarkup(m,esc)).toContain("补充");
    const hooks={api:vi.fn(),esc,notify:vi.fn(),refresh:vi.fn(),open:vi.fn(),note:()=>node("c",["case"]),view:()=>"case",settled:vi.fn()};
    const ui=setupWorkbench(hooks),html=ui.candidates({relationCandidates:[{state:"candidate",predicate:"supports",target:"h",targetTitle:'<script>bad</script>',reason:"仍缺真实结果",acceptance:"补充原文",evidence:[{path:"Materials/a.md",startLine:3,endLine:3,quote:"来源段落",revision:"a".repeat(64),availability:"changed"}]}]});
    const host=document.createElement("div");host.innerHTML=html;expect(host.querySelector("script")).toBeNull();expect(host.textContent).toContain("尚未进入正式关系");expect(host.textContent).toContain("原文已更新");expect(host.querySelector("[data-citation-path]")?.getAttribute("data-citation-line")).toBe("3");
});
it("retains direction and counterevidence across a case-evidence-hypothesis path",()=>{
    const model=buildAtlas("c",context([node("c",["case"]),node("e",["evidence"]),{...node("h",["hypothesis"]),status:"refuted"}],[edge("e","c","related"),edge("e","h","contradicts")]));
    const path=model.paths.find(p=>p.stance==="counter")!;expect(path.nodes).toEqual(["c","e","h"]);expect(path.kind).toBe("via");
    expect(model.edges.map(e=>[e.source,e.relation,e.target])).not.toContainEqual(["c","contradicts","h"]);
    const host=document.createElement("div");host.innerHTML=atlasMarkup(model,esc);const connectors=host.querySelectorAll(".counter .atlas-connector");
    expect(connectors[0].getAttribute("aria-label")).toBe("核对关系：e 相关 c");expect(connectors[0].querySelector("img")?.getAttribute("src")).toContain("arrow-left");expect(connectors[1].querySelector("img")?.getAttribute("src")).toContain("arrow-right");expect(host.textContent).toContain("已有反驳记录");expect(host.textContent).toContain("不合并为直接支持或反驳");
});
it("preserves opposing and supporting declarations for the same pair",()=>{
    const model=buildAtlas("h",context([node("h",["hypothesis"]),node("e",["evidence"])],[edge("e","h","supports"),edge("e","h","contradicts"),edge("h","e","derived_from")]));
    expect(model.paths.map(p=>p.stance)).toEqual(["counter","support","context"]);expect(new Set(model.paths.flatMap(p=>p.edges)).size).toBe(3);
});
it("keeps declarations between related units reachable without inventing a shorter path",()=>{
    const objects=[node("c",["case"]),node("e1",["evidence"]),node("e2",["evidence"]),node("h",["hypothesis"]),node("l",["loop"])];
    const edges=[edge("c","e1","related"),edge("c","e2","related"),edge("e1","h","supports"),edge("l","e2","related"),edge("h","l","supports")];
    const model=buildAtlas("c",context(objects,edges));expect(model.paths.find(p=>p.kind==="between")?.nodes).toEqual(["h","l"]);expect(new Set(model.paths.flatMap(p=>p.edges)).size).toBe(edges.length);expect(model.paths.filter(p=>p.nodes[0]==="c").every(p=>p.nodes.length<=3)).toBe(true);
});
it("filters by the roles of related units, preserving overlapping roles and honest truncation",()=>{
    const ctx={...context([node("c",["case"]),node("e",["evidence","hypothesis"]),node("l",["loop"])],[edge("e","c","supports")]),truncated:true,unresolved:[{}],omittedRelations:2};
    const model=buildAtlas("c",ctx);expect(model.roleCounts).toEqual({case:0,evidence:1,hypothesis:1,loop:1});expect(filteredPaths(model,{role:"hypothesis",stance:"support"})).toHaveLength(1);expect(filteredPaths(model,{role:"case",stance:"all"})).toHaveLength(0);expect(model.detached.map(n=>n.id)).toEqual(["l"]);
    const html=atlasMarkup(model,esc);expect(html).toContain("当前上下文有截断");expect(html).toContain("1 条目标待解析");expect(html).toContain("2 条关系未载入");
});
it("escapes relation and knowledge text without relying on colors to identify counterevidence",()=>{
    const model=buildAtlas("c",context([node("c",["case"]),{...node("e",["evidence"]),title:'<img src=x onerror="bad">'}],[edge("e","c",'related\"><script>bad</script>')]));
    const host=document.createElement("div");host.innerHTML=atlasMarkup(model,esc);expect(host.querySelector("script")).toBeNull();expect(host.querySelector('img[onerror]')).toBeNull();expect(host.textContent).toContain('<img src=x onerror="bad">');
});
it("groups case volumes only by authored grouping or priority, never by title inference",()=>{
    const rows=[node("人工智能教育",["case"]),node("无标签案例",["case"]),node("重点",["case"])];
    const facet=(importance:string|null,group:string|null):CaseFacet=>({importance,group,summary:"原始说明",roles:{evidence:1,hypothesis:0,loop:0},relations:1,supports:0,contradicts:0});
    const facets={重点:facet("A",null),无标签案例:facet(null,"自定分卷")};
    const groups=caseGroups(rows,facets);expect(groups.map(g=>g.title)).toEqual(["重点案例","自定分卷","案例档案"]);expect(groups[2].rows[0].id).toBe("人工智能教育");
    const host=document.createElement("div");host.innerHTML=caseIndexMarkup(rows,facets,"无标签案例.md",esc,new Set());expect(host.querySelector<HTMLDetailsElement>('[data-case-group="group:自定分卷"]')?.open).toBe(true);expect(host.querySelector('[aria-current=true]')?.textContent).toContain("原始说明");
});
it("opens exact assertion sources and continues navigation around a related unit",async()=>{
    const nodes=[node("c",["case"]),node("e",["evidence"])],edges=[edge("e","c","supports")];
    const hooks={api:vi.fn().mockResolvedValue(context(nodes,edges)),esc,notify:vi.fn(),refresh:vi.fn(),open:vi.fn(),inspect:vi.fn(),note:()=>nodes[0],view:()=>"case",settled:vi.fn()},ui=setupWorkbench(hooks);
    document.body.insertAdjacentHTML("beforeend",await ui.rolePanel(nodes[0],"case"));
    const button=document.querySelector<HTMLElement>('[data-action="atlas-inspect"]')!;await ui.action("atlas-inspect",button);expect(hooks.inspect).toHaveBeenCalledWith("e.md",edges[0],7);
    await ui.action("atlas-focus",document.querySelector<HTMLElement>('[data-atlas-id="e"]')!);expect(hooks.open).toHaveBeenCalledWith("e.md",true);
    const filter=document.querySelector<HTMLElement>('[data-action="atlas-role"][data-role="evidence"]')!;await ui.action("atlas-role",filter);expect(document.activeElement?.getAttribute("data-role")).toBe("evidence");expect(document.querySelector('[data-role="evidence"]')?.getAttribute("aria-pressed")).toBe("true");
});
it("does not bind a late context response to the currently visible atlas",async()=>{
    let resolveOld!:(value:any)=>void;const old=new Promise(r=>resolveOld=r),a=node("a",["case"]),b=node("b",["case"]),e=node("e",["evidence"]);
    const hooks={api:vi.fn().mockImplementation((_command,args)=>args.id==="a"?old:Promise.resolve(context([b,e],[edge("e","b","supports")]))),esc,notify:vi.fn(),refresh:vi.fn(),open:vi.fn(),note:()=>b,view:()=>"case",settled:vi.fn()},ui=setupWorkbench(hooks);
    const stale=ui.rolePanel(a,"case");document.body.insertAdjacentHTML("beforeend",await ui.rolePanel(b,"case"));resolveOld(context([a],[]));expect(await stale).toBe("");
    await ui.action("atlas-focus",document.querySelector<HTMLElement>('[data-atlas-id="e"]')!);expect(hooks.open).toHaveBeenCalledWith("e.md",true);
});

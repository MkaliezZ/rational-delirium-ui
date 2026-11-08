import { fromMarkdown } from "mdast-util-from-markdown";
import { KNOWLEDGE_ROLES, ROLE_LABELS, isRole, type KnowledgeRole } from "../src/knowledge-roles";
import { setupWorkbench } from "./workbench-ui";
import { enter } from "./motion";
import {assetLabel,overviewMarkup,readingParts,setInspectorOpen} from "./workspace-ui";
import {caseIndexMarkup,type CaseFacets} from "./case-index";
type View = "overview" | "inbox" | "library" | "investigate" | "proposals" | "history" | KnowledgeRole;
type Note = {
    id: string | null;
    path: string;
    title: string;
    kind: string | null;
    status: string | null;
    revision: string;
    markdown: string;
    body: string;
    bodyStartLine: number;
    frontmatter: Record<string, unknown>;
    provenance: Record<string, unknown>;
    diagnostics: any[];
    roles: KnowledgeRole[];
    citations: any[];
};
type Row = {
    id: string | null;
    path: string;
    title: string;
    kind: string | null;
    status: string | null;
    excerpt?: string;
    revision: string;
    roles: KnowledgeRole[];
};
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const main = $("#main"), source = $("#source"), index = $("#index-list"), search = $<HTMLInputElement>("#search");
const token = $<HTMLMetaElement>('meta[name="rd-token"]').content;
const workbench=setupWorkbench({api,esc:v=>esc(v),notify:message=>notify(message),refresh:()=>refresh(),open:async(path,related)=>{const note=await api("get",{path});state.view=note.roles[0]??"library";state.path=path;state.query="";search.value="";if(related){window.scrollTo(0,0);await loadIndex();await openNote(path,true,"related");main.focus({preventScroll:true});}else await go(state.view);},inspect:async(path,edge,line)=>inspect(path,undefined,line,edge),note:()=>state.note,view:()=>state.view,settled:()=>{if(pendingEditorRefresh){pendingEditorRefresh=false;void refresh().catch(e=>notify(e.message));}}});
const state = { view: "overview" as View, path: "", query: "", note: null as Note | null, source: null as Note | null, relations: [] as any[], rows: [] as Row[], proposals: [] as any[], recordMore:false, review:null as any, proposalId: "", noteTab:"content", counts:{} as Record<string,number>, caseFacets:{} as CaseFacets, offset: 0, total: 0, revision: "", status: null as any };
let sourceTrigger:HTMLElement|null=null;
function showSource(open:boolean,focus=false){setInspectorOpen(source,$(".workspace"),open);if(focus){if(open)source.querySelector<HTMLButtonElement>(".close-source")?.focus();else (sourceTrigger?.isConnected?sourceTrigger:main).focus();}}
let indexGeneration = 0, noteGeneration = 0, sourceGeneration = 0, searchTimer: ReturnType<typeof setTimeout>, toastTimer: ReturnType<typeof setTimeout>;
let storageKey="rd:last-view";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const icon = (name: string) => `<img src="/icons/${name}.svg" alt="">`;
const button = (label: string, action: string, cls = "", attrs = "") => `<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const kind = (v: string | null) => ({ concept: "概念", hypothesis: "假设", observation: "观察", reference: "参考", process: "流程", fact: "事实声明", decision: "决定", evidence: "证据", case: "案例", loop: "模式", note: "笔记" }[v ?? "note"] ?? v);
const status = (v: string | null) => ({ candidate: "候选", reviewed: "已审阅", active: "当前使用", superseded: "已被修订", archived: "已归档", verified: "已核对", pending: "待处理", unverified: "未核对", refuted: "已有反驳记录", open: "待检验", closed: "已结束", supported: "已有支持记录" }[v ?? ""] ?? v ?? "未声明");
const predicate = (v: string) => ({ supports: "支持", contradicts: "反驳", complements: "补充", derived_from: "派生自", depends_on: "依赖", related: "相关", revises: "修订", supersedes: "替代", observed_in: "观察于", repeats_in: "重复于" }[v] ?? v);
const stamp = (v: string) => new Date(v).toLocaleString("zh-CN", { hour12: false });
const errorLabels: Record<string, string> = { STALE_SOURCE: "文件已被修改。草稿已保留，请先核对磁盘版本。", STALE_EVIDENCE: "引用的证据已发生变化，请重新提出并审阅修改。", STALE_PROPOSAL: "提案版本已变化，请重新打开核对。", AMBIGUOUS_ID: "这个 ID 对应多个文件，请通过路径核对。", INVALID_OBJECT: "笔记的身份或元数据格式有问题，请检查内容。", IDENTITY_CHANGE: "请保留原对象身份；新的解释可以创建后继对象。", RECOVERY_REQUIRED: "上次写入未完成，需要核对并恢复。", RECOVERY_CONFLICT: "文件已有外部修改，恢复没有覆盖它。请先核对原文。", NOT_APPROVED: "提案尚未获得当前版本的批准。", READ_ONLY: "当前以只读模式运行。", NOT_FOUND: "来源已不存在、被排除或无法读取。", NO_CHANGE: "内容没有变化。", ALREADY_EXECUTED: "这份提案已有执行记录，请查看历史。", DECISION_EXISTS: "这份提案已有决定，修改内容需要提交新提案。" };
class ApiError extends Error {
    constructor(readonly code: string, message: string, readonly details?: unknown) { super(errorLabels[code] ?? message); }
}
async function api(command: string, args: Record<string, unknown> = {}): Promise<any> {
    let response: Response;
    try {
        response = await fetch("/api", { method: "POST", headers: { "content-type": "application/json", "x-rd-token": token }, body: JSON.stringify({ command, args }) });
    }
    catch {
        connection("本地服务连接中断，已读内容仍保留。恢复连接后可重新读取。", true);
        throw Error("无法连接本地知识服务");
    }
    const result = await response.json();
    if (!result.ok)
        throw new ApiError(result.error.code, result.error.message, result.error.details);
    return result.data;
}
function notify(message: string) { const el = $("#toast"); el.textContent = message; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, 5500); }
function connection(message: string, show: boolean) { $("#connection").textContent = message; $("#connection").hidden = !show; }
function remember(push = true) { const params = new URLSearchParams({ view: state.view }); if (state.path){params.set("path", state.path);params.set("tab",state.noteTab);} if (state.proposalId)
    params.set("proposal", state.proposalId); if (state.query)
    params.set("q", state.query); const hash = "#" + params; if (push && location.hash !== hash)
    history.pushState(null, "", hash);
else if (!push)
    history.replaceState(null, "", hash); try {
        localStorage.setItem(storageKey, hash);
}
catch { } }
function navigation() { document.querySelectorAll<HTMLElement>("[data-view]").forEach(b => { b.classList.toggle("active", b.dataset.view === state.view); b.setAttribute("aria-current", b.dataset.view === state.view ? "page" : "false"); }); $("#index-title").textContent = state.query ? "搜索结果" : state.view === "overview"?"案例入口":state.view === "proposals" ? "待核对的提案" : state.view === "history" ? "修订记录" : state.view==="inbox"?"待整理材料":isRole(state.view) ? ROLE_LABELS[state.view]+"索引" : state.view === "investigate" ? "研究线索" : "资产索引"; $("#index-count").textContent=["history","proposals"].includes(state.view)?"":String(state.total); }
async function go(view: View, push = true,tab?:string) { state.view = view;window.scrollTo(0,0);state.noteTab=tab??(["hypothesis","investigate","loop"].includes(view)?"related":"content");if(view==="overview"){state.path="";state.note=null;state.proposalId="";state.query="";search.value="";} showSource(false);noteGeneration++; sourceGeneration++; navigation(); remember(push); await loadIndex();if(view!==state.view)return; if(view==="overview"){welcome();return;} if (view === "proposals" || view === "history")
    await renderRecords();
else if (isRole(view)||view==="inbox") {
    const selected=state.rows.find(r=>r.path===state.path)??state.rows[0];
    if(selected) await openNote(selected.path,false,tab); else { state.path="";state.note=null;welcome(); }
}
else if (state.path)
    await openNote(state.path, false,tab);
else
    welcome(); }
function welcome() {
    showSource(false);
    if(state.view==="overview") {main.innerHTML=overviewMarkup(state.rows,state.counts,esc,state.total,state.caseFacets);enter(main);return;}
    if(state.rows.length){main.innerHTML=`<div class="page-heading"><span class="eyebrow">RATIONAL DELIRIUM / LIBRARY</span><h1>${state.query?"搜索结果":"全部资产"}</h1><p class="muted">${state.total} 则${state.query?"匹配内容":"笔记与来源材料"} · 选择标题开始阅读。</p></div><div class="entry-grid">${state.rows.slice(0,24).map(row=>`<button data-path="${esc(row.path)}" class="entry-card"><span class="small muted">${esc(assetLabel(row))}</span><strong>${esc(row.title)}</strong></button>`).join("")}</div>`;return;}
    const label=isRole(state.view)?ROLE_LABELS[state.view]:"知识";
    const descriptions={case:"还原发生过什么，留下情境与经过。",evidence:"保留能核对的依据，也容纳相反的记录。",hypothesis:"让解释与支持、反驳一起出现。",loop:"比较多个案例，检验重复现象及其边界。"};
    main.innerHTML=`<div class="empty role-welcome"><span class="eyebrow">RATIONAL DELIRIUM / ${isRole(state.view)?state.view.toUpperCase():"ARCHIVE"}</span><h1>允许思想游移，<br>让依据留下。</h1><p>${isRole(state.view)?descriptions[state.view]:"从一份材料开始，逐步连接经历、依据、解释与模式。"}</p>${button("收集第一份材料","kb-capture","primary")}<div class="role-intro-grid">${KNOWLEDGE_ROLES.map(r=>`<button data-view="${r}"><span class="eyebrow">${r.toUpperCase()}</span><strong>${ROLE_LABELS[r]}</strong><span class="small muted">${descriptions[r]}</span></button>`).join("")}</div><p class="small muted">当前${label}板块没有匹配内容。未分类的原文始终保留在「全部资产」。</p></div>`;renderSource();enter(main);
}
async function loadIndex(append = false) {
    const generation = ++indexGeneration;
    state.offset = append ? state.rows.length : 0;
    if (state.view === "proposals" || state.view === "history") {
        const records=await api("proposals",{limit:50,offset:append?state.proposals.length:0});
        if (generation !== indexGeneration)return;
        state.proposals=append?[...state.proposals,...records]:records;state.recordMore=records.length===50;
        state.rows = [];
        renderIndex();
        return;
    }
    const data = await api("boards", { ...(state.query ? {query:state.query,includeNotes:true}:{}), ...(isRole(state.view)?{role:state.view}:state.view==="overview"&&!state.query?{role:"case"}:state.view==="inbox"?{role:"unclassified"}:{}),limit:100,offset:state.offset });
    for(const role of KNOWLEDGE_ROLES){const tab=document.querySelector<HTMLElement>(`[data-view="${role}"]`);if(tab)tab.title=`${ROLE_LABELS[role]} · ${data.counts[role]} 则`;}
    if (generation !== indexGeneration)
        return;
    state.counts=data.counts;
    state.caseFacets=append?{...state.caseFacets,...data.caseIndex}:(data.caseIndex??{});
    const rows = state.query ? data.hits : data.items;
    state.rows = append ? [...state.rows, ...rows] : rows;
    state.total = data.total;
    renderIndex();
}
function recordState(r: any) { if (r.transaction)
    return ({ committed: "已应用", rolled_back: "已恢复", execution_uncertain: "需要恢复", prepared: "准备写入", applying: "写入中" } as Record<string, string>)[r.transaction.status] ?? r.transaction.status; return r.decision?.decision === "approved" ? "已批准 · 待应用" : r.decision?.decision === "rejected" ? "已拒绝" : "待审阅"; }
function renderIndex() {
    navigation();
    if (state.view === "proposals" || state.view === "history") {
        index.innerHTML = state.proposals.length ? state.proposals.map(r => `<button class="index-row ${state.proposalId === r.proposal.id ? "selected" : ""}" data-proposal="${esc(r.proposal.id)}"><span class="row-meta">${esc(recordState(r))}</span><strong>${esc(r.proposal.reason)}</strong><span class="mono">${esc(r.proposal.actor)}</span></button>`).join("")+(state.recordMore?button("继续加载记录","more","load-more"):"") : `<p class="muted small">尚无提案或修订记录。直接编辑笔记也会留下变更历史。</p>`;
        return;
    }
    if(["case","overview"].includes(state.view)&&!state.query){
        const oldGroups=[...index.querySelectorAll<HTMLDetailsElement>("[data-case-group]")];
        const expanded=oldGroups.length?new Set(oldGroups.filter(g=>g.open).map(g=>g.dataset.caseGroup!)):undefined;
        index.innerHTML=caseIndexMarkup(state.rows,state.caseFacets,state.path,esc,expanded)+(state.rows.length<state.total?button("继续加载案例","more","load-more"):"");
        return;
    }
    index.innerHTML = state.rows.map(row => `<button class="index-row ${row.path === state.path ? "selected" : ""}" data-path="${esc(row.path)}" ${row.path===state.path?'aria-current="true"':""} title="${esc(row.title)}"><strong>${esc(row.title)}</strong><span class="row-meta">${esc(assetLabel(row))}${row.status&&["superseded","archived","refuted"].includes(row.status)?` · ${esc(status(row.status))}`:""}</span>${row.excerpt && state.query ? `<span class="excerpt">${esc(row.excerpt)}</span>` : ""}</button>`).join("") + (state.rows.length < state.total ? button("继续加载", "more", "load-more") : "") + (state.rows.length ? `<p class="muted small index-caption">${state.query ? "按检索相关性排列" : "按标题排列"} · ${state.total} 则</p>` : `<p class="muted small">${state.query ? "没有找到匹配内容。试试标题中的关键词、ID 或清除筛选。" : "还没有笔记。可以先收集一份材料。"}</p>`);
}
async function openNote(path: string, push = true,tab?:string) {
    const fromOverview=state.view==="overview";
    if(tab)state.noteTab=tab;else if(path!==state.note?.path)state.noteTab=["hypothesis","investigate","loop"].includes(state.view)?"related":"content";
    showSource(false);
    if (path !== state.path)
        window.scrollTo(0, 0);
    state.path = path;
    const generation = ++noteGeneration;
    sourceGeneration++;
    try {
        const note: Note = await api("get", { path });
        if (generation !== noteGeneration)
            return;
        state.note = note;
        if(fromOverview){state.view=note.roles[0]??"library";navigation();}
        state.path = path;
        state.source = null;
        let relations: any[] = [];
        try {
            relations = note.id ? (await api("relations", { id: note.id })).relations : [];
        }
        catch (error) {
            if (generation === noteGeneration)
                notify((error as Error).message);
        }
        if (generation !== noteGeneration)
            return;
        state.relations = relations;
        remember(push);
        renderIndex();
        await renderNote();
        $(".index").classList.remove("open");
        $("#toggle-index").setAttribute("aria-expanded","false");
    }
    catch (error) {
        if (generation !== noteGeneration)
            return;
        main.innerHTML = `<div class="empty"><h1>暂时无法打开来源</h1><p>${esc((error as Error).message)}</p><p class="mono">${esc(path)}</p>${button("重新读取", "refresh")}</div>`;
        state.note = null;
        renderSource();
    }
}
function markdown(text: string, outline=false) {
    let section=0;const headings:{id:string;text:string}[]=[];
    const children = (n: any): string => (n.children ?? []).map(walk).join("");
    const inlineText = (text: string) => esc(text).replace(/\[\[([^\]\n]+)\]\]/g, (_all, inner) => { const [ref, label] = inner.split("|"); return button(esc(label ?? ref), "wiki", "wiki", `data-ref="${esc(ref)}"`); });
    function walk(n: any): string { switch (n.type) {
        case "root": return children(n);
        case "text": return inlineText(n.value);
        case "paragraph": return `<p>${children(n)}</p>`;
        case "heading": {const id="reading-section-"+section++,label=(n.children??[]).map((c:any)=>c.value??"").join("");if(outline)headings.push({id,text:label});return `<h${Math.min(3, n.depth)}${outline?` id="${id}" tabindex="-1"`:""}>${children(n)}</h${Math.min(3, n.depth)}>`;}
        case "strong": return `<strong>${children(n)}</strong>`;
        case "emphasis": return `<em>${children(n)}</em>`;
        case "inlineCode": return `<code>${esc(n.value)}</code>`;
        case "code": return `<pre><code>${esc(n.value)}</code></pre>`;
        case "blockquote": return `<blockquote>${children(n)}</blockquote>`;
        case "list": return `<${n.ordered ? "ol" : "ul"}>${children(n)}</${n.ordered ? "ol" : "ul"}>`;
        case "listItem": return `<li>${children(n)}</li>`;
        case "thematicBreak": return "<hr>";
        case "break": return "<br>";
        case "link": {
            if (/^https?:\/\//i.test(n.url))
                return `<a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${children(n)} ${icon("arrow-square-out")}</a>`;
            return button(children(n), "wiki", "wiki", `data-ref="${esc(n.url)}"`);
        }
        case "image": return `<span class="muted">[附件：${esc(n.alt ?? n.url)}]</span>`;
        case "html": return `<code>${esc(n.value)}</code>`;
        default: return children(n);
    } }
    const html=walk(fromMarkdown(text));
    return (outline&&headings.length>2?`<details class="reading-outline"><summary>本文目录 · ${headings.length} 节</summary><nav aria-label="本文目录">${headings.map(h=>`<button data-section="${h.id}">${esc(h.text)}</button>`).join("")}</nav></details>`:"")+html;
}
function heading(note: Note) {
    const viewLabel=isRole(state.view)?ROLE_LABELS[state.view]+"板块":state.view==="investigate"?"推演":"全部资产";
    const chips=(note.roles.length?note.roles.map(r=>`<span class="role-chip">${ROLE_LABELS[r]}</span>`).join(""):'<span class="role-chip muted">未分类材料</span>')+(typeof note.frontmatter.rd_material_type==="string"?`<span class="kind-label">${esc(note.frontmatter.rd_material_type)}</span>`:"");
    return `<div class="page-heading"><span class="eyebrow">${viewLabel} / ${esc(assetLabel(note))}</span><h1>${esc(note.title)}</h1><div class="knowledge-labels">${chips}${note.status?`<span class="kind-label">${esc(status(note.status))}</span>`:""}</div><div class="heading-actions">${button("核对来源", "show-source", "source-toggle",`aria-controls="source" aria-expanded="${!source.hidden}"`)}${button(`${icon("pencil-simple")} 编辑原文`, "edit", "quiet")}${!note.id?button("整理知识","kb-organize", "quiet"):""}<details class="note-tools"><summary>更多操作</summary><div>${note.id?button("调整角色","kb-roles")+button("建立关系","kb-link"):""}${button(`${icon("copy")} 复制引用`, "copy")}${note.id?button("比较解释", "investigate"):""}</div></details></div></div><nav class="reading-tabs" aria-label="内容视角"><button data-action="read-content" aria-pressed="${state.noteTab==="content"}">正文</button><button data-action="related-content" aria-pressed="${state.noteTab==="related"}">关联知识 <span>${state.relations.length}</span></button></nav>`;
}
function neighbor(r: any) { return r.direction === "incoming" ? r.source : r.target; }
function relationLabel(r: any) { const word = predicate(r.predicate); if (r.predicate === "supports" || r.predicate === "contradicts")
    return r.direction === "incoming" ? `${word}当前观点` : `当前观点${word}`; return r.direction === "incoming" ? `对方${word}当前观点` : `当前观点${word}`; }
function relationRows(rows: any[]) { return rows.map(r => { const n = neighbor(r), found = n.objectId ? state.rows.find(row => row.id === n.objectId) : undefined, title = found?.title ?? n.objectId ?? n.raw; return `<div class="relation-row ${esc(r.predicate)}"><span class="predicate">${esc(relationLabel(r))}</span><button data-evidence="${esc(n.path ?? "")}" data-edge="${esc(state.relations.indexOf(r))}"><strong>${esc(title)}</strong><span class="mono muted">${esc(n.path ?? n.raw)}${n.resolution !== "RESOLVED" ? " · 来源待核对" : ""}</span></button></div>`; }).join(""); }
async function renderNote() {
    const generation=++noteGeneration;
    const note = state.note;
    if (!note)
        return welcome();
    const diagnostics = note.diagnostics.length ? `<div class="notice">此文件有 ${note.diagnostics.length} 项身份或格式问题。可按路径阅读原文，请先核对再按 ID 引用。${esc(note.diagnostics.map(d => d.type).join("、"))}</div>` : "";
    const body = note.body.replace(new RegExp(`^\\s*# ${note.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n`), "");
    const parts=readingParts(body);
    main.innerHTML = heading(note) + diagnostics + (state.noteTab==="content"?`<article class="article">${parts.metadata?`<details class="material-metadata"><summary>来源信息与原文元数据</summary>${markdown(parts.metadata)}</details>`:""}${markdown(parts.body.replace(/^(?:observed_in|repeats_in|derived_from):.*$/gm,""),true)}</article>`:"");
    if(generation!==noteGeneration)return;
    if(state.noteTab==="related"){
        const panel=await workbench.rolePanel(note,note.roles.includes(state.view as KnowledgeRole)?state.view:note.roles[0]??state.view);
        if(generation!==noteGeneration)return;
        main.insertAdjacentHTML("beforeend",panel+`<details class="section raw-relations"><summary>核对关系声明 · ${state.relations.length}</summary>${state.relations.length ? relationRows(state.relations) : '<p class="muted small">这则笔记尚未声明语义关系。普通链接仍可从正文打开。</p>'}</details>`);
    }
    main.insertAdjacentHTML("beforeend",workbench.candidates(note));
    state.source = note;
    renderSource();enter(main);
}
function renderSource(note = state.source, edge?: any, line?: number) {
    source.innerHTML = `<button class="icon-button close-source" data-action="close-source" aria-label="关闭来源面板">${icon("x")}</button><h2>来源核对</h2>`;
    if (!note) {
        source.innerHTML += '<p class="muted">选择一则笔记或证据，查看出处与原文。</p>';
        return;
    }
    const declared = edge?.assertions?.[0];
    const excerpt = line ? note.markdown.split(/\r?\n/).slice(Math.max(0, line - 3), line + 8).map((l, i) => `${Math.max(1, line - 2) + i}  ${l}`).join("\n") : note.body.replace(/^\s*# [^\n]+\n/, "").trim().slice(0, 1000);
    const preview=line?`<div class="source-lines">${esc(excerpt)}</div>`:`<details class="source-preview"><summary>查看笔记摘录</summary><div class="source-copy">${esc(excerpt)}${note.body.length>1000?"\n…（摘录，打开原文查看全文）":""}</div></details>`;
    source.innerHTML += `<span class="eyebrow">${esc(kind(note.kind))} · ${esc(status(note.status))}</span><h3>${esc(note.title)}</h3>${preview}<dl><dt>文件路径</dt><dd class="mono">${esc(note.path)}</dd><dt>${line ? "定位行" : "正文起始行"}</dt><dd class="mono">L${line ?? note.bodyStartLine}</dd><dt>文件版本</dt><dd class="mono">${esc(note.revision.slice(0, 16))}…</dd>${declared ? `<dt>关系声明出处</dt><dd class="mono">${esc(declared.path)} · ${esc(declared.field ?? "正文")}${declared.line ? ` · L${declared.line}` : ""}</dd>` : ""}</dl>${button(`${icon("arrow-square-out")} 打开原文`, "open-source", "primary")}${declared ? button("定位关系声明", "open-declaration", "quiet", `data-path="${esc(declared.path)}" data-line="${declared.line ?? 1}"`) : ""}<p class="small muted section">关系由笔记声明；来源可用不等于内容已被验证。</p>`;
    if(declared?.basis?.length)source.insertAdjacentHTML("beforeend",`<section class="section"><h3>这条关系的原文依据</h3>${declared.basis.map((b:any)=>`<p class="small">${esc(b.reason)}</p>${b.scope?`<p class="small muted">适用边界：${esc(b.scope)}</p>`:""}${workbench.citations({citations:b.evidence??[]})}`).join("")}</section>`);
    source.insertAdjacentHTML("beforeend",workbench.citations(note));
}
async function inspect(path: string, edgeIndex?: number, line?: number,declaredEdge?:any) {
    const generation = ++sourceGeneration;
    if (!path) {
        const edge = state.relations[edgeIndex ?? -1];
        source.innerHTML = `<button class="icon-button close-source" data-action="close-source" aria-label="关闭来源面板">${icon("x")}</button><h2>来源待核对</h2><p>未能定位此声明的目标文件。</p><pre class="mono">${esc(edge ? JSON.stringify(edge.assertions, null, 2) : "")}</pre>`;
        showSource(true,true);
        return;
    }
    try {
        const note = await api("get", { path });
        if (generation !== sourceGeneration)
            return;
        state.source = note;
        renderSource(note, declaredEdge??(edgeIndex === undefined ? undefined : state.relations[edgeIndex]), line);
        showSource(true,true);
        document.querySelectorAll(".evidence-card").forEach(e => e.classList.toggle("selected", (e as HTMLElement).dataset.evidence === path));
    }
    catch (e) {
        notify((e as Error).message);
    }
}
async function renderRecords() {
    const rows = state.proposals;
    if (state.view === "history") {
        main.innerHTML = `<div class="page-heading"><span class="eyebrow">RATIONAL DELIRIUM / HISTORY</span><h1>每一次改写，都有来处。</h1><p class="muted">查看提案、决定和实际变更。</p></div><div class="timeline">${rows.length ? rows.map(r => `<section class="record-row"><span class="eyebrow">${esc(stamp(r.proposal.createdAt))} · ${esc(recordState(r))}</span><button data-proposal="${esc(r.proposal.id)}"><span class="serif">${esc(r.proposal.reason)}</span></button><p class="small muted">${esc(r.proposal.actor)} · ${r.proposal.changes.length} 个文件</p>${r.transaction?.status === "committed" ? button("提出恢复此改动", "restore", "quiet", `data-id="${esc(r.proposal.id)}"`) : ""}</section>`).join("") : '<p class="muted">第一次编辑或 Agent 提案会从这里留下记录。</p>'}</div>`;
        renderSource(null);
        return;
    }
    if (state.proposalId) {
        const generation=++noteGeneration;
        try{const record=await api("proposal",{id:state.proposalId});if(generation!==noteGeneration)return;await renderProposal(record);return;}catch(error){notify((error as Error).message);}
    }
    main.innerHTML = `<div class="page-heading"><span class="eyebrow">RATIONAL DELIRIUM / REVIEW</span><h1>让新的解释，<br>经得起核对。</h1><p class="muted">从具体改动开始，看清依据，再作决定。</p></div>${rows.length ? rows.map(r => `<section class="record-row"><span class="eyebrow">${esc(recordState(r))} · ${esc(r.proposal.actor)}</span><button data-proposal="${esc(r.proposal.id)}"><span class="serif">${esc(r.proposal.reason)}</span></button><p class="mono muted">${esc(r.proposal.changes.map((c: any) => c.path).join(" · "))}</p></section>`).join("") : '<p class="muted">还没有待审阅的提案。Agent 可通过 CLI 或 MCP 提出修改，现有知识会继续保留。</p>'}`;
    renderSource(null);
}
async function renderProposal(r: any) {
    const p = r.proposal, generation = ++noteGeneration;
    const before = new Map<string, Note | null>();
    for (const c of p.changes) {
        try {
            before.set(c.path, await api("get", { path: c.path }));
        }
        catch {
            before.set(c.path, null);
        }
        if (generation !== noteGeneration)
            return;
    }
    state.review=r;
    const stale = p.changes.some((c: any) => (before.get(c.path)?.revision ?? null) !== c.beforeSha256), finished = !!r.transaction;
    main.innerHTML = `<div class="page-heading"><span class="eyebrow">AGENT 提案 / ${esc(p.id.slice(0, 14))}</span><h1>${esc(p.reason)}</h1><p class="muted">${esc(p.actor)} · ${esc(stamp(p.createdAt))}</p><span class="kind-label">${esc(recordState(r))}</span><div class="heading-actions">${button("核对修改依据", "show-source", "source-toggle")}</div></div>${stale && !finished ? '<div class="notice">原文件已发生变化，这份提案不能直接批准或应用。下方保留提案内容，当前磁盘版本供核对。</div>' : ""}${p.changes.map((c: any) => { const old = finished ? r.transaction.before[c.path] ?? "" : before.get(c.path)?.markdown ?? ""; const next = c.afterMarkdown ?? "（恢复操作：移除此事务创建的文件）"; return `<section class="section"><h2 class="mono">${esc(c.path)}</h2><div class="diff"><div><h3>${stale && !finished ? "当前磁盘版本" : "修改前"}</h3><pre>${diffLines(old, next, false)}</pre></div><div><h3>拟修改${finished ? "（原提案）" : ""}</h3><pre>${diffLines(next, old, true)}</pre></div></div></section>`; }).join("")}<div class="decision-bar">${!r.decision && !finished ? `${button("批准此版本", "approve", "primary", stale ? "disabled" : "")}${button("拒绝此提案", "reject", "", stale ? "disabled" : "")}<span class="small muted">批准记录决定，应用才写入文件。</span>` : r.decision?.decision === "approved" && !finished ? `${button("应用更改", "apply", "primary", stale ? "disabled" : "")}<span class="small muted">执行前再次核对文件与依据版本。</span>` : ""}${r.transaction?.status === "committed" ? button("提出恢复此改动", "restore", "", `data-id="${esc(p.id)}"`) : ""}</div>${r.transaction?.failure ? `<div class="notice">${esc(r.transaction.failure)}</div>` : ""}`;
    source.innerHTML = `<button class="icon-button close-source" data-action="close-source" aria-label="关闭来源面板">${icon("x")}</button><h2>修改依据</h2><p class="small muted">${esc(p.evidenceSources.length ? "核对提案引用的来源与版本。" : "此提案未附来源引用，请结合修改目的审阅。")}</p>${p.evidenceSources.map((e: any) => `<div class="review-evidence"><button data-evidence="${esc(e.path)}"><strong>${esc(e.id ?? e.path)}</strong><span class="mono muted">${esc(e.path)}</span></button><p class="mono muted">版本 ${esc(e.revision.slice(0, 12))}…</p></div>`).join("")}<section class="section"><h3>变更范围</h3><p>${p.changes.length} 个文件</p><p class="small muted">批准和执行绑定此提案内容。资料改变后需要重新审阅。</p></section>`;
}
function diffLines(text: string, other: string, added: boolean) { const otherLines = new Set(other.split(/\r?\n/)); return text.split(/\r?\n/).map(line => `<span class="diff-line ${otherLines.has(line) ? "" : added ? "added" : "removed"}">${!otherLines.has(line) ? (added ? "+ " : "− ") : "  "}${esc(line)}</span>`).join(""); }
const editor = $<HTMLDialogElement>("#editor"), editPath = $<HTMLInputElement>("#edit-path"), editText = $<HTMLTextAreaElement>("#edit-markdown");
let editing: Note | null = null, originalDraft = "", isNew = false;
let pendingEditorRefresh=false;
editor.addEventListener("close",()=>{if(pendingEditorRefresh){pendingEditorRefresh=false;void refresh().catch(e=>notify(e.message));}});
function openEditor(create = false) { isNew = create; editing = create ? null : state.note; if (!create && !editing)
    return; $("#editor-title").textContent = create ? "记录新的想法" : "编辑笔记"; editPath.value = editing?.path ?? "Notes/新的笔记.md"; editPath.readOnly = !create; editText.value = editing?.markdown ?? "# 新的想法\n\n"; originalDraft = editText.value; $<HTMLInputElement>("#edit-title").value = "新的想法"; $("#new-fields").hidden = !create; $("#editor-message").textContent = ""; $("#reload-editor").hidden = true; editor.showModal(); editText.focus(); }
function closeEditor() { if (editText.value !== originalDraft) {
    $("#editor-message").textContent = "草稿仍在这里。保存后关闭，或明确放弃本次草稿。";
    return;
} editor.close(); }
editor.addEventListener("cancel", e => { e.preventDefault(); closeEditor(); });
$("#close-editor").onclick = closeEditor;
$("#discard-editor").onclick = () => { editor.close(); };
$("#reload-editor").onclick = async () => { if (!editing)
    return; const current: Note = await api("get", { path: editing.path }); editing = current; originalDraft = current.markdown; editText.value = current.markdown; $("#editor-message").textContent = "已载入磁盘版本。"; $("#reload-editor").hidden = true; };
$("#editor-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submit = editor.querySelector<HTMLButtonElement>('[type="submit"]')!;
    submit.disabled = true;
    try {
        let text = editText.value;
        if (isNew) {
            const type = $<HTMLSelectElement>("#edit-kind").value, title = $<HTMLInputElement>("#edit-title").value.trim();
            if (type !== "note") {
                const id = "ko-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + Math.floor(Math.random() * 1e12);
                text = `---\nobject_id: ${id}\nkind: ${type}\nstatus: candidate\ntitle: ${JSON.stringify(title || "未命名")}\n---\n${text}`;
            }
        }
        await api("save", { path: editPath.value, revision: editing?.revision ?? null, markdown: text });
        editor.close();
        state.view = "library";
        state.path = editPath.value;
        state.query = "";
        search.value = "";
        await go("library");
        notify("笔记已保存，变更历史已记录。");
    }
    catch (error) {
        $("#editor-message").textContent = (error as Error).message;
        if (error instanceof ApiError && error.code === "STALE_SOURCE")
            $("#reload-editor").hidden = false;
    }
    finally {
        submit.disabled = false;
    }
});
window.addEventListener("beforeunload", event => { if (editor.open && editText.value !== originalDraft) {
    event.preventDefault();
    event.returnValue = "";
} });
async function refresh() { const status = await api("status"); state.status = status; state.revision = status.revision; $("#workspace-name").textContent = status.root.split(/[\\/]/).pop() ?? "本地工作区"; connection(status.recoveryRequired ? "上次写入尚未完成，请在工作区信息中核对并恢复。" : "", status.recoveryRequired); await loadIndex(); if (state.view === "overview" || state.view === "library" || state.view === "investigate" || state.view==="inbox" || isRole(state.view)) {
    if (state.path)
        await openNote(state.path, false);
    else
        welcome();
}
else
    await renderRecords(); }
async function settings() { const s = await api("status"); state.status = s; $("#workspace-info").innerHTML = `<dl><dt>本地资料目录</dt><dd class="mono">${esc(s.root)}</dd><dt>索引</dt><dd>${s.counts.files} 个文件 · ${s.counts.objects} 个对象 · ${s.counts.unresolved} 条未解析关系</dd><dt>Agent 连接示例</dt><dd>在支持 MCP 的客户端中启动下列本地进程。默认只读；增加 <code>--write</code> 后可提出及应用已批准的提案。</dd></dl><pre>node /path/to/dist-agent/rd.mjs mcp --root ${esc(JSON.stringify(s.root))}</pre><p class="small muted">Agent 不提供批准工具。笔记内容作为资料处理，不能提升为运行指令。</p>${button("查看修订历史", "history")}${s.errors.length ? `<div class="notice">${s.errors.map((d: any) => esc(d.type) + " · " + esc(d.paths.join("、"))).join("<br>")}</div>` : ""}${s.recoveryRequired ? button("核对并恢复中断写入", "recover", "primary") : ""}${!s.initialized ? '<div class="notice">此目录尚未初始化。可阅读；启用修订需先运行 init 命令。</div>' : ""}`; $<HTMLDialogElement>("#workspace-dialog").showModal(); }
async function wiki(ref: string) {
    const raw = decodeURIComponent(ref).split("#")[0];
    if (!raw)
        return;
    try {
        const data: Note = await api("get", { id: raw });
        await openNote(data.path);
        return;
    }
    catch { }
    const normalized = raw.replace(/\.md$/i, "");
    const listed = await api("list", { limit: 500 });
    const hits = listed.items.filter((r: Row) => r.path.replace(/\.md$/i, "") === normalized || r.title === raw || r.path.split("/").pop()?.replace(/\.md$/i, "") === normalized);
    if (hits.length === 1) {
        await openNote(hits[0].path);
    }
    else {
        state.query = raw;
        search.value = raw;
        await loadIndex();
        notify(hits.length > 1 ? "有多个可能的来源，请通过路径选择。" : "请从检索结果核对来源。");
    }
}
document.addEventListener("click", e => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("button,a.brand");
    if (!target)
        return;
    void (async () => {
        if (target.classList.contains("brand")) {
            e.preventDefault();
            await go("overview");
            return;
        }
        if (target.dataset.view) {
            await go(target.dataset.view as View);
            return;
        }
        if (target.dataset.path !== undefined && !target.dataset.action) {
            state.proposalId = "";
            if (state.view === "proposals" || state.view === "history")
                state.view = "library";
            navigation();
            await openNote(target.dataset.path);
            return;
        }
        if(target.dataset.section){const section=document.getElementById(target.dataset.section);section?.scrollIntoView({block:"start"});section?.focus({preventScroll:true});return;}
        if (target.dataset.proposal) {
            state.proposalId = target.dataset.proposal;
            await go("proposals");
            return;
        }
        if(target.dataset.citationPath){sourceTrigger=target;await inspect(target.dataset.citationPath,undefined,Number(target.dataset.citationLine));return;}
        if (target.dataset.evidence !== undefined) {
            sourceTrigger=target;
            await inspect(target.dataset.evidence, target.dataset.edge === undefined ? undefined : Number(target.dataset.edge));
            return;
        }
        const action = target.dataset.action;
        if((action?.startsWith("kb-")||action?.startsWith("atlas-"))){if(action==="atlas-inspect")sourceTrigger=target;if(await workbench.action(action,target))return;}
        switch (action) {
            case "history":
                $<HTMLDialogElement>("#workspace-dialog").close();
                await go("history");
                break;
            case "new-note":
                openEditor(true);
                break;
            case "edit":
                openEditor();
                break;
            case "refresh":
                await refresh();
                break;
            case "more":
                await loadIndex(true);
                break;
            case "investigate":
                await go("investigate");
                break;
            case "read-content":case "related-content":
                state.noteTab=action==="read-content"?"content":"related";
                remember();
                await renderNote();
                main.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.focus();
                break;
            case "show-source":
                sourceTrigger=target;showSource(source.hidden,true);
                break;
            case "close-source":
                showSource(false,true);
                break;
            case "open-source":
                if (state.source) {
                    const path = state.source.path;
                    state.view = "library";
                    navigation();
                    showSource(false);
                    await openNote(path);
                }
                break;
            case "open-declaration":
                await inspect(target.dataset.path!, undefined, Number(target.dataset.line));
                break;
            case "wiki":
                await wiki(target.dataset.ref!);
                break;
            case "copy":
                if (state.note) {
                    const n = state.note;
                    await navigator.clipboard.writeText(`${n.id ?? n.title} · ${n.path}:L${n.bodyStartLine} · sha256:${n.revision}`);
                    notify("已复制包含文件版本的引用。");
                }
                break;
            case "approve":
            case "reject": {
                const r = state.review;
                target.setAttribute("disabled", "");
                await api("decide", { id: r.proposal.id, digest: r.proposal.digest, decision: action === "approve" ? "approved" : "rejected", reviewer: "local-operator" });
                await refresh();
                notify(action === "approve" ? "已记录批准，尚未写入文件。" : "已记录拒绝。");
                break;
            }
            case "apply":
                target.setAttribute("disabled", "");
                await api("apply", { id: state.proposalId });
                await refresh();
                notify("更改已写入，历史已记录。");
                break;
            case "restore": {
                const p = await api("restore", { id: target.dataset.id, actor: "local-operator", reason: "恢复此前的改动" });
                state.proposalId = p.id;
                await go("proposals");
                notify("恢复提案已生成，请核对具体差异。");
                break;
            }
            case "recover":
                await api("recover");
                $<HTMLDialogElement>("#workspace-dialog").close();
                await refresh();
                notify("已核对并恢复中断写入。");
                break;
        }
    })().catch(error => { notify((error as Error).message); if (target.hasAttribute("disabled"))
        target.removeAttribute("disabled"); });
});
$("#new-note").onclick = () => openEditor(true);
$("#refresh").onclick = () => { void refresh().then(() => notify("已重新读取本地文件。")).catch(e => notify(e.message)); };
$("#settings").onclick = () => { void settings().catch(e => notify(e.message)); };
$("#close-settings").onclick = () => $<HTMLDialogElement>("#workspace-dialog").close();
$("#toggle-index").onclick = () => {const open=$(".index").classList.toggle("open");$("#toggle-index").setAttribute("aria-expanded",String(open));};
search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.query = search.value.trim(); if(state.view==="overview")state.view="library";remember(false); void loadIndex().then(()=>{if(!state.path)welcome();}).catch(e => notify(e.message)); }, 220); });
document.addEventListener("keydown", e => { if (!editor.open && !workbench.isBusy() && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    search.focus();
    search.select();
} if (e.key === "Escape" && !editor.open && !workbench.isBusy()) {
    showSource(false,true);
    $(".index").classList.remove("open");
    $("#toggle-index").setAttribute("aria-expanded","false");
} });
async function restoreHash() { const p = new URLSearchParams(location.hash.slice(1)); state.view = ["overview", "inbox", "library", "investigate", "proposals", "history", ...KNOWLEDGE_ROLES].includes(p.get("view") ?? "") ? p.get("view") as View : "overview"; state.path = p.get("path") ?? ""; state.query = p.get("q") ?? ""; state.proposalId = p.get("proposal") ?? ""; search.value = state.query; await go(state.view, false,["content","related"].includes(p.get("tab")??"")?p.get("tab")!:undefined); }
window.addEventListener("popstate", () => { void restoreHash().catch(e => notify(e.message)); });
async function start() {
    const initialStatus=await api("status");storageKey="rd:last-view:"+initialStatus.root;
    if (!location.hash) {
        try {
            const old = localStorage.getItem(storageKey);
            if (old)
                history.replaceState(null, "", old);
        }
        catch { }
    }
    await restoreHash();
    const s = initialStatus;
    state.status = s;
    document.body.classList.toggle("read-only", s.readOnly === true);
    state.revision = s.revision;
    $("#workspace-name").textContent = s.root.split(/[\\/]/).pop() ?? "本地工作区";
    setInterval(() => { void api("status").then(async (s) => { state.status = s; connection(s.recoveryRequired ? "上次写入未完成，请在工作区信息中核对并恢复。" : "", s.recoveryRequired); if (s.revision !== state.revision) {
        state.revision = s.revision;
        if (editor.open || workbench.isBusy()) {
            pendingEditorRefresh=true;
            $("#editor-message").textContent = "本地文件有更新，草稿已保留。保存时将再次核对版本。";
            return;
        }
        await refresh();
        notify("本地文件已更新。");
    } }).catch(() => { }); }, 4000);
}
void start().catch(error => { main.innerHTML = `<div class="empty"><h1>暂时无法读取工作区</h1><p>${esc(error.message)}</p>${button("重新读取", "refresh")}</div>`; });

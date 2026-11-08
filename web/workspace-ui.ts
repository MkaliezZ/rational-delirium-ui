import {KNOWLEDGE_ROLES,ROLE_LABELS,type KnowledgeRole} from "../src/knowledge-roles";
import {caseIndexMarkup,type CaseFacets} from "./case-index";
type Entry={path:string;title:string;roles:KnowledgeRole[];kind?:string|null};
export const assetLabel=(entry:Entry)=>entry.roles.length?entry.roles.map(r=>ROLE_LABELS[r]).join(" / "):entry.path.startsWith("Materials/")?"来源材料":"普通笔记";
export function overviewMarkup(rows:(Entry&{id?:string|null})[],counts:Record<string,number>,esc:(v:unknown)=>string,total:number,facets:CaseFacets={}){
    return `<div class="overview"><header class="overview-heading"><span class="eyebrow">RATIONAL DELIRIUM / WORKSPACE</span><h1>知识总览</h1><p class="muted">从经历出发，用依据连接解释，在不同案例中辨认模式。</p><button data-action="kb-capture" class="primary">收集材料</button><button data-view="library" class="quiet">浏览全部资产</button></header><nav class="overview-roles" aria-label="知识板块概览">${KNOWLEDGE_ROLES.map(role=>`<button data-view="${role}"><span>${ROLE_LABELS[role]}</span><strong>${counts[role]??0}</strong><small>${({case:"情境与经过",evidence:"依据与反例",hypothesis:"解释与检验记录",loop:"跨案例的重复现象"})[role]}</small></button>`).join("")}</nav><section class="overview-cases"><div class="section-title"><div><span class="eyebrow">START WITH A CASE</span><h2>从案例进入</h2></div><button data-view="case" class="quiet">全部 ${total} 个案例</button></div>${rows.length?caseIndexMarkup(rows.map(r=>({...r,id:r.id??null})),facets,"",esc,undefined,true):'<p class="muted">还没有案例。可以先收集材料，再从具体经历中整理。</p>'}</section></div>`;
}
/** Display-only separation of the intake wrapper. Never changes the stored source or line references. */
export function readingParts(body:string){
    const wrapper=/^## 原始文档正文\s*$/m.exec(body);
    if(!wrapper)return {metadata:"",body};
    const metadata=body.slice(0,wrapper.index).trim();
    // Only our explicit intake wrapper is folded; a user's similarly named heading alone is ordinary content.
    if(!/^文本来源：/m.test(metadata)||!/^原始文件 SHA-256：/m.test(metadata))return {metadata:"",body};
    let content=body.slice(wrapper.index+wrapper[0].length).trimStart();
    const frontmatter=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
    if(frontmatter)content=`\n\n${content.slice(frontmatter[0].length)}`;
    return {metadata:metadata+(frontmatter?`\n\n原文元数据：\n\n\`\`\`yaml\n${frontmatter[1]}\n\`\`\``:""),body:content};
}
/** An optional inspector should not remain keyboard-accessible while closed. */
export function setInspectorOpen(source:HTMLElement,workspace:HTMLElement,open:boolean){
    source.hidden=!open;source.inert=!open;source.classList.toggle("open",open);workspace.classList.toggle("has-source",open);
    document.querySelectorAll('[data-action="show-source"]').forEach(button=>button.setAttribute("aria-expanded",String(open)));
}

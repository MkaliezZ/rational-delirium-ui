import {ROLE_LABELS,type KnowledgeRole} from "../src/knowledge-roles";
export type CaseEntry={id:string|null;path:string;title:string;roles:KnowledgeRole[]};
export type CaseFacet={group:string|null;importance:string|null;summary:string;roles:Record<string,number>;relations:number;supports:number;contradicts:number};
export type CaseFacets=Record<string,CaseFacet>;
export function caseGroups(rows:CaseEntry[],facets:CaseFacets){
    const groups=new Map<string,{key:string;title:string;order:number;rows:CaseEntry[]}>();
    for(const row of rows){const f=facets[row.id??""],custom=f?.group?.trim()||undefined,priority=f?.importance;
        const key=custom?"group:"+custom:priority==="A"?"priority:A":priority==="B"?"priority:B":"other";
        if(!groups.has(key))groups.set(key,{key,title:custom??(priority==="A"?"重点案例":priority==="B"?"参考案例":"案例档案"),order:custom?1:priority==="A"?0:priority==="B"?2:3,rows:[]});
        groups.get(key)!.rows.push(row);
    }
    return [...groups.values()].sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title,"zh"));
}
const roles:KnowledgeRole[]=["evidence","hypothesis","loop"];
export function caseCoverage(f:CaseFacet|undefined,esc:(v:unknown)=>string){
    return f?`<span class="case-coverage" aria-label="直接关联构成">${roles.map(role=>`<span title="${ROLE_LABELS[role]} · ${f.roles[role]??0} 个已连接单元"><b>${role.toUpperCase()[0]}</b> ${f.roles[role]??0}</span>`).join("")}${f.contradicts?`<span class="case-counter">反驳 ${esc(f.contradicts)}</span>`:""}</span>`:"";
}
export function caseIndexMarkup(rows:CaseEntry[],facets:CaseFacets,selected:string,esc:(v:unknown)=>string,expanded?:Set<string>,shelf=false){
    return `<div class="case-volumes ${shelf?"case-shelf":""}">${caseGroups(rows,facets).map((group,i)=>{
        const open=expanded?expanded.has(group.key):i===0;
        return `<details class="case-volume" data-case-group="${esc(group.key)}" ${open||group.rows.some(r=>r.path===selected)?"open":""}><summary><span class="volume-number">${String(i+1).padStart(2,"0")}</span><strong>${esc(group.title)}</strong><span class="volume-count">${group.rows.length}</span></summary><div class="volume-pages">${group.rows.map((row,j)=>{const facet=facets[row.id??""],active=row.path===selected;return `<button class="case-file ${active?"selected":""} ${shelf?"entry-card":""}" data-path="${esc(row.path)}" ${active?'aria-current="true"':""} title="${esc(row.title)}"><span class="file-number">${String(j+1).padStart(2,"0")}</span><span class="file-content"><strong>${esc(row.title)}</strong>${shelf||active?`<span class="case-abstract">${esc(facet?.summary??"打开案例，查看情境与原始记录。")}</span>`:""}${caseCoverage(facet,esc)}</span></button>`;}).join("")}</div></details>`;
    }).join("")}<p class="case-index-help">按已标注的分组 / 重要性分卷<br>E 证据 · H 假设 · L 模式 · 计数为直接关联</p></div>`;
}

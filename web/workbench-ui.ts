import { KNOWLEDGE_ROLES, ROLE_LABELS, isRole, type KnowledgeRole } from "../src/knowledge-roles";
import {buildAtlas,atlasMarkup,RELATION_LABELS,type AtlasModel,type AtlasFilter} from "./relation-atlas";
type Hooks={api:(command:string,args?:Record<string,unknown>)=>Promise<any>;esc:(v:unknown)=>string;notify:(message:string)=>void;refresh:()=>Promise<void>;open:(path:string,related?:boolean)=>Promise<void>;inspect?:(path:string,edge:any,line?:number)=>Promise<void>;note:()=>any;view:()=>string;settled:()=>void};
export function setupWorkbench(h:Hooks){
    const {api,esc}=h;
    document.body.insertAdjacentHTML("beforeend",'<dialog id="knowledge-dialog" aria-labelledby="knowledge-dialog-title"><div class="dialog-heading"><h2 id="knowledge-dialog-title"></h2><button type="button" data-action="kb-close" aria-label="关闭对话框">×</button></div><div id="knowledge-dialog-body"></div><p id="knowledge-message" role="status"></p></dialog>');
    const dialog=document.querySelector<HTMLDialogElement>("#knowledge-dialog")!,body=document.querySelector<HTMLElement>("#knowledge-dialog-body")!,message=document.querySelector<HTMLElement>("#knowledge-message")!;
    let submitting=false,stageId="",upload="",lookup=0;
    let atlas:AtlasModel|null=null,atlasFilter:AtlasFilter={role:"all",stance:"all"},atlasGeneration=0;
    const captureDraft={title:"",material:""};
    window.addEventListener("beforeunload",event=>{if(captureDraft.title||captureDraft.material){event.preventDefault();event.returnValue="";}});
    const roles=(values:string[]=[],name="role",disabled:string[]=[])=>KNOWLEDGE_ROLES.map(r=>`<label class="role-choice"><input type="checkbox" name="${name}" value="${r}" ${values.includes(r)?"checked":""} ${disabled.includes(r)?"disabled":""}>${ROLE_LABELS[r]}</label>`).join("");
    function show(title:string,html:string,submit?:(form:HTMLFormElement)=>Promise<void>){
        document.querySelector("#knowledge-dialog-title")!.textContent=title;body.innerHTML=html;message.textContent="";
        dialog.onsubmit=e=>{e.preventDefault();if(submitting)return;submitting=true;const form=e.target as HTMLFormElement;form.querySelectorAll<HTMLButtonElement>('[type="submit"]').forEach(b=>b.disabled=true);message.textContent="正在保存并核对版本…";void submit?.(form).catch(e=>{message.textContent=e.message;}).finally(()=>{submitting=false;form.querySelectorAll<HTMLButtonElement>('[type="submit"]').forEach(b=>b.disabled=false);});};
        if(!dialog.open)dialog.showModal();
    }
    async function close(){if(submitting)return;dialog.close();lookup++;if(stageId){void api("discard_import",{id:stageId});stageId="";}upload="";}
    dialog.addEventListener("cancel",e=>{e.preventDefault();void close();});
    dialog.addEventListener("close",()=>{lookup++;h.settled();});
    const chosen=(container:ParentNode,name:string)=>[...container.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map(i=>i.value);
    async function saved(text:string,path?:string){dialog.close();h.notify(text);await h.refresh();if(path)await h.open(path);}
    function capture(){
        show("收集一份材料",`<form><p class="muted">先保留完整原文，再从中整理案例、证据、假设和重复模式。</p><label>材料标题<input name="title" required maxlength="160" placeholder="这份材料记录了什么"></label><label class="file-control">载入 Markdown / TXT<input id="material-file" type="file" accept=".md,.txt,text/plain,text/markdown"></label><label>原文<textarea name="material" rows="12" required placeholder="粘贴记录、摘抄或研究材料…"></textarea></label><p class="small muted">文字材料保存在本地 Markdown。每份最多 2 MiB。</p><div class="dialog-actions"><button type="button" data-action="kb-discard-capture">放弃草稿</button><button type="submit" class="primary">保存原文并整理</button></div></form>`,async form=>{
            const title=(form.elements.namedItem("title") as HTMLInputElement).value.trim(),text=(form.elements.namedItem("material") as HTMLTextAreaElement).value,path="Materials/asset-"+crypto.randomUUID()+".md";
            const markdown=`---\nrd_material: true\nrd_asset_id: asset-${crypto.randomUUID()}\n---\n# ${title.replace(/[\r\n]/g," ")}\n\n${text}`;
            await api("save",{path,revision:null,markdown,reason:"收集文字材料，保留原文"});captureDraft.title="";captureDraft.material="";await saved("原文已保存。",path);await organize(path);
        });
        const titleInput=body.querySelector<HTMLInputElement>('input[name="title"]')!,materialInput=body.querySelector<HTMLTextAreaElement>('textarea[name="material"]')!;
        titleInput.value=captureDraft.title;materialInput.value=captureDraft.material;
        const retain=()=>{captureDraft.title=titleInput.value;captureDraft.material=materialInput.value;};
        body.querySelector("form")!.addEventListener("input",retain);
        materialInput.closest("label")!.insertAdjacentHTML("afterend",'<p class="small muted">关闭对话框后，草稿保留在本页；保存原文后清除。</p>');
        body.querySelector<HTMLInputElement>("#material-file")!.onchange=async e=>{try{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;if(file.size>2*1024*1024||!/[.](md|txt)$/i.test(file.name))throw Error("请选择 2 MiB 以内的 Markdown / TXT。");const bytes=await file.arrayBuffer(),text=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes);body.querySelector<HTMLTextAreaElement>('textarea[name="material"]')!.value=text;const title=body.querySelector<HTMLInputElement>('input[name="title"]')!;if(!title.value)title.value=file.name.replace(/\.(md|txt)$/i,"");retain();}catch(e){message.textContent=(e as Error).message;}};
    }
    async function organize(path=h.note()?.path){
        if(!path)throw Error("先选择或收集一份材料。");
        const data=await api("analyze",{path});
        show("从原文整理知识",`<p class="muted">段落规则建议 · 可调整角色，也可保留未分类。相同摘录只建立一个可承担多个角色的单元。</p><p class="mono">${esc(path)} · ${esc(data.revision.slice(0,12))}…</p><form><div class="organize-units">${data.units.map((u:any,i:number)=>`<section class="organize-unit" data-unit="${i}"><label class="unit-select"><input type="checkbox" name="unit" value="${i}" ${u.roles.length?"checked":""}>整理这段 · L${u.startLine}–L${u.endLine}</label><blockquote>${esc(u.quote)}</blockquote><label>单元标题<input name="unit-title" value="${esc(u.title)}" maxlength="160" required></label><div class="role-choices">${roles(u.roles,"unit-role")}</div><p class="small muted">${esc(u.reasons.join("；"))}</p></section>`).join("")||'<p class="notice">没有可建议的文字段落。可先编辑材料，或继续保留原文。</p>'}</div><p class="small muted">每次最多展示 24 段；超长段落和代码块保留在原文。建议不代表事实已核实。</p><div class="dialog-actions"><button type="submit" class="primary" ${data.units.length?"":"disabled"}>采纳所选知识单元</button></div></form>`,async form=>{
            const selections=chosen(form,"unit").map(i=>{const box=form.querySelector<HTMLElement>(`[data-unit="${i}"]`)!;return {...data.units[Number(i)],roles:chosen(box,"unit-role"),title:box.querySelector<HTMLInputElement>('input[name="unit-title"]')!.value};});
            if(!selections.length||selections.some(s=>!s.roles.length))throw Error("请选择段落，并为每个所选段落至少指定一个角色。");
            const result=await api("organize",{path:data.path,revision:data.revision,selections});await saved(`已整理 ${result.paths.length} 个知识单元，原文和引用已保留。`,result.paths[0]);
        });
    }
    function editRoles(){
        const note=h.note();if(!note?.id)throw Error("请先从材料整理出知识单元。");
        const inherent=isRole(note.kind)?[note.kind]:[];
        show("这份知识承担什么角色",`<form><p>${esc(note.title)}</p><div class="role-choices">${roles(note.roles,"role",inherent)}</div><p class="small muted">可同时承担多个角色。原类型自带的角色保留；补充角色不会改变 ID、原类型或正文。</p><div class="dialog-actions"><button type="submit" class="primary">保存角色</button></div></form>`,async form=>{await api("set_roles",{path:note.path,revision:note.revision,roles:chosen(form,"role")});await saved("知识角色已更新。");});
    }
    async function links(){
        const note=h.note();if(!note?.id)throw Error("普通材料可先整理为知识单元，再声明关系。");
        const suggestions=await api("suggestions",{id:note.id}),items=suggestions.suggestions.length?suggestions.suggestions:(await api("list",{limit:100})).items.filter((r:any)=>r.id&&r.id!==note.id);
        const options=(rows:any[])=>rows.map(r=>`<option value="${esc(r.id)}">${esc(r.title)} · ${esc(r.id)}</option>`).join("");
        show("建立一条有方向的关系",`<form><p class="relation-preview">从 <strong>${esc(note.title)}</strong> 出发</p><label>关系<select name="predicate"><option value="related">相关于</option><option value="complements">补充 → 对方内容或适用边界</option><option value="supports">支持 → 对方观点</option><option value="contradicts">反驳 → 对方观点</option><option value="derived_from">派生自 → 对方来源</option><option value="observed_in">观察于 → 对方案例</option><option value="repeats_in">重复于 → 对方案例</option></select></label><label>查找目标<input id="relation-search" placeholder="输入标题关键词或完整 ID"></label><label>目标知识<select name="target" required>${options(items)}</select></label><label>关系依据<textarea name="reason" rows="3" required placeholder="为什么建立这条关系？保留支持或反驳的具体理由。"></textarea></label><p class="small muted">${suggestions.suggestions.length?"初始列表来自标题相似线索。":"初始列表为知识索引。"}相关性不能证明支持、反驳或重复模式，需核对原文后选择。</p><div class="dialog-actions"><button type="submit" class="primary">保存这条声明</button></div></form>`,async form=>{const data=new FormData(form);await api("link",{id:note.id,revision:note.revision,target:data.get("target"),predicate:data.get("predicate"),reason:data.get("reason")});await saved("关系已保存，来源版本已记录。");});
        let timer:ReturnType<typeof setTimeout>;body.querySelector<HTMLInputElement>("#relation-search")!.oninput=e=>{clearTimeout(timer);const query=(e.target as HTMLInputElement).value.trim(),generation=++lookup;timer=setTimeout(()=>{void api(query?"search":"list",query?{query,limit:100}:{limit:100}).then(data=>{if(generation!==lookup||!dialog.open)return;const rows=(data.hits??data.items).filter((r:any)=>r.id&&r.id!==note.id);body.querySelector<HTMLSelectElement>('[name="target"]')!.innerHTML=options(rows);}).catch(e=>{message.textContent=e.message;});},200);};
    }
    async function download(format:string,scoped=false){
        message.textContent="正在整理导出文件…";
        const result=await api("export_assets",{format,...(scoped&&h.note()?.id?{id:h.note().id}:{})});
        const bytes=result.base64?Uint8Array.from(atob(result.base64),(c:string)=>c.charCodeAt(0)):result.text;
        const url=URL.createObjectURL(new Blob([bytes],{type:result.mime})),a=document.createElement("a");a.href=url;a.download=result.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message.textContent="导出已生成。";
    }
    function assets(){
        show("带走你的知识",`<p class="muted">身份、角色、来源版本和已声明关系随内容一起保存。</p><section class="section"><h3>关系文件</h3><label class="role-choice"><input type="checkbox" id="export-scope" ${h.note()?.id?"":"disabled"}>只导出当前知识的两跳关系（最多 32 个对象）</label><div class="export-actions">${[["json","完整关系 JSON"],["nodes-csv","节点 CSV"],["edges-csv","关系 CSV"],["markdown","关系说明 Markdown"],["mermaid","Mermaid 关系图"]].map(([v,label])=>`<button data-action="kb-download" data-format="${v}">${label}</button>`).join("")}</div></section><section class="section"><h3>知识内容包</h3><p class="small muted">包含全部可索引 Markdown、引用与关系。不包含附件、本机批准密钥和执行历史。最多 1000 份文件、32 MiB 文字和 6 MiB ZIP。</p><button class="primary" data-action="kb-download" data-format="zip">导出知识 ZIP</button></section><section class="section"><h3>导入知识内容包</h3><label>选择 Rational Delirium ZIP<input id="package-file" type="file" accept=".zip,application/zip"></label><p class="small muted">先核对新增、同名及身份冲突。原文件不会因选择文件而被覆盖。</p><div id="import-preview"></div></section>`);
        body.querySelector<HTMLInputElement>("#package-file")!.onchange=async e=>{try{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;if(file.size>6*1024*1024)throw Error("请选择 6 MiB 以内的知识包。");if(stageId)await api("discard_import",{id:stageId});stageId="";message.textContent="正在检查内容与哈希…";const bytes=new Uint8Array(await file.arrayBuffer());let raw="";for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));upload=btoa(raw);await previewImport();}catch(e){message.textContent=(e as Error).message;}};
    }
    async function previewImport(){
        const data=await api("preview_import",{base64:upload});stageId=data.id;
        const labels:Record<string,string>={new:"新增",same:"内容相同",conflict:"同名内容不同",'identity-conflict':"身份冲突，先人工处理"};
        const target=body.querySelector<HTMLElement>("#import-preview")!;target.innerHTML=`<form><p class="small muted">每次事务最多 32 个文件 / 8 MiB；可分批选择。身份冲突保持原样，10 分钟后需重新预览。</p><div class="import-files">${data.files.map((f:any)=>`<label class="import-file"><input type="checkbox" name="import-path" value="${esc(f.path)}" ${["same","identity-conflict"].includes(f.state)?"disabled":""}><span><strong>${esc(labels[f.state])}</strong> <span class="mono">${esc(f.path)}</span>${f.conflicts.length?`<small>${esc(f.conflicts.join("、"))}</small>`:""}</span></label>`).join("")}</div><label class="role-choice"><input type="checkbox" name="replace">允许用所选包内版本替换同名冲突文件</label><button type="submit" class="primary" ${document.body.classList.contains("read-only")?"disabled":""}>导入所选文件</button></form>`;
        dialog.onsubmit=e=>{e.preventDefault();if(submitting)return;submitting=true;const form=e.target as HTMLFormElement,paths=chosen(form,"import-path");void api("import_package",{id:stageId,paths,replace:chosen(form,"replace").length>0}).then(async result=>{h.notify(`已导入 ${result.paths.length} 个文件。`);await api("discard_import",{id:stageId});stageId="";await previewImport();await h.refresh();}).catch(e=>{message.textContent=e.message;}).finally(()=>{submitting=false;});};message.textContent="预览完成。请选择需要导入的文件。";
    }
    function citations(note:any){
        return (note.citations??[]).map((c:any)=>`<section class="citation-card"><span class="eyebrow">摘录来源 · ${c.availability==="current"?"原文版本一致":c.availability==="changed"?"原文已更新，保留旧摘录":"来源暂不可用"}</span><blockquote>${esc(c.quote)}</blockquote><button data-citation-path="${esc(c.path)}" data-citation-line="${esc(c.startLine)}">${esc(c.path)} · L${esc(c.startLine)}–L${esc(c.endLine)}</button><p class="mono muted">${esc(c.revision)}</p></section>`).join("");
    }
    function candidates(note:any){
        const rows=Array.isArray(note.relationCandidates)?note.relationCandidates:[];
        return rows.length?`<section class="section candidate-relations"><h2>候选关联 · ${rows.length}</h2><p class="small muted">等待核对，尚未进入正式关系和 Agent 关系上下文。</p>${rows.map((c:any)=>`<details><summary>候选 · ${esc(RELATION_LABELS[c.predicate]??c.predicate)} · ${esc(c.targetTitle??c.target)}</summary><p class="small">${esc(c.reason)}</p>${c.acceptance?`<p class="small muted">需要核对：${esc(c.acceptance)}</p>`:""}${c.targetPath?`<button data-path="${esc(c.targetPath)}">查看目标知识</button>`:""}${citations({citations:c.evidence??[]})}</details>`).join("")}</section>`:"";
    }
    async function rolePanel(note:any,role:string){
        const generation=++atlasGeneration;
        if(!note.id){atlas=null;return `<section class="section"><h2>材料还可以长成什么</h2><p class="muted">这份原文尚未声明知识身份。整理时保留原文，并为摘录指定一个或多个角色。</p><button data-action="kb-organize" class="primary">从原文整理知识</button></section>`;}
        const context=await api("context",{id:note.id,depth:2,maxObjects:32,budget:160000});
        if(generation!==atlasGeneration)return "";
        if(atlas?.focus!==note.id)atlasFilter={role:"all",stance:"all"};
        atlas=buildAtlas(note.id,context);
        const cases=context.objects.filter((o:any)=>o.id!==note.id&&o.roles?.includes("case"));
        const comparison=role==="loop"?`<details class="section atlas-comparison"><summary>跨案例对照 · ${cases.length} 个案例</summary><p class="small muted">回到情境和原始记录，比较模式的适用边界。</p>${cases.length?`<div class="comparison-scroll"><table><thead><tr><th>案例</th><th>来源中的情境记录</th><th>与当前模式的直接声明</th></tr></thead><tbody>${cases.map((o:any)=>`<tr><td><button data-path="${esc(o.path)}">${esc(o.title)}</button></td><td>${esc((o.body??"").replace(/^\s*# [^\n]+\n/,"").trim().slice(0,240))}</td><td>${context.edges.filter((e:any)=>(e.source===note.id&&e.target===o.id)||(e.target===note.id&&e.source===o.id)).map((e:any)=>esc((e.source===note.id?"当前模式 → ":"案例 → ")+(RELATION_LABELS[e.relation]??e.relation))).join("<br>")||"经由其他知识连接"}</td></tr>`).join("")}</tbody></table></div>`:'<p class="notice">当前范围还没有已连接的案例，可继续补充实例或反例。</p>'}</details>`:"";
        return atlasMarkup(atlas,esc,atlasFilter)+comparison;
    }
    return {isBusy:()=>dialog.open,roles,citations,candidates,rolePanel,action:async(action:string,target:HTMLElement)=>{
        if(submitting)return true;
        if(action.startsWith("atlas-")){
            if(!atlas)return true;
            if(action==="atlas-role"||action==="atlas-stance"){
                if(action==="atlas-role"&&(target.dataset.role==="all"||isRole(target.dataset.role)))atlasFilter.role=target.dataset.role;
                if(action==="atlas-stance"&&["all","support","counter","context"].includes(target.dataset.stance??""))atlasFilter.stance=target.dataset.stance as AtlasFilter["stance"];
                const host=document.querySelector("#relation-atlas"),value=action==="atlas-role"?atlasFilter.role:atlasFilter.stance,attribute=action==="atlas-role"?"role":"stance";
                if(host){host.outerHTML=atlasMarkup(atlas,esc,atlasFilter);document.querySelector<HTMLButtonElement>(`#relation-atlas [data-action="${action}"][data-${attribute}="${value}"]`)?.focus();}
            }else if(action==="atlas-focus"){
                const node=atlas.nodes.get(target.dataset.atlasId??"");if(node)await h.open(node.path,true);
            }else if(action==="atlas-inspect"){
                const index=Number(target.dataset.atlasEdge),edge=Number.isInteger(index)?atlas.edges[index]:null;
                if(edge){const assertion=edge.assertions?.[0],path=assertion?.path??atlas.nodes.get(edge.source)?.path;if(path){if(h.inspect)await h.inspect(path,edge,assertion?.line);else await h.open(path);}}
            }
            return true;
        }
        switch(action){case"kb-discard-capture":captureDraft.title="";captureDraft.material="";await close();break;case"kb-close":await close();break;case"kb-capture":capture();break;case"kb-organize":await organize();break;case"kb-roles":editRoles();break;case"kb-link":await links();break;case"kb-assets":assets();break;case"kb-download":target.setAttribute("disabled","");try{await download(target.dataset.format!,target.dataset.format!=="zip"&&!!body.querySelector<HTMLInputElement>("#export-scope")?.checked);}finally{target.removeAttribute("disabled");}break;default:return false;}return true;
    }};
}

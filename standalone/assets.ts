import { randomUUID } from "node:crypto";
// Synchronous portable entry avoids Node worker setup in the single-file runtime.
import { zipSync, unzipSync } from "fflate/browser";
import { parseObject } from "../src/parsers/object-parser";
import { MAX_FILE_BYTES } from "./types";
import { sha256 } from "./files";
import { record, requireValue, string } from "./errors";
import type { FolderKnowledge } from "./knowledge";
import type { MutationEngine } from "./mutations";

const MAX_ZIP=6*1024*1024,MAX_TOTAL=32*1024*1024;
const csvCell=(value:unknown)=>{let text=typeof value==="object"?JSON.stringify(value):String(value??"");if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
const csv=(columns:string[],rows:Record<string,unknown>[])=>"\uFEFF"+[columns,...rows.map(row=>columns.map(key=>row[key]))].map(row=>row.map(csvCell).join(",")).join("\r\n");
const safeText=(text:string)=>text.replace(/[\[\]{}<>"`|\\]/g," ").replace(/[\r\n]/g," ").slice(0,140);
type Staged={expires:number;files:{path:string;markdown:string;revision:string;before:string|null;state:string;id:string|null;conflicts:string[]}[]};
export class KnowledgeAssets {
    private staged=new Map<string,Staged>();
    constructor(readonly kb:FolderKnowledge,readonly mutations:MutationEngine){}
    graph(args:Record<string,unknown>={}) {
        const full=this.kb.index.semanticSnapshot(),context=args.id?this.kb.context({id:args.id,depth:2,budget:200000,maxObjects:32}):null;
        const ids=context?new Set(context.objects.map(o=>o.id)):null;
        const sources=[...this.kb.sources.keys()].map(path=>this.kb.get({path})).filter(o=>!ids||ids.has(o.id));
        const nodes=sources.map(o=>({id:o.id,key:o.id??o.assetId??"note:"+o.path,assetId:o.assetId,path:o.path,title:o.title,kind:o.kind,roles:o.roles,status:o.status,revision:o.revision,citations:o.citations}));
        const edges=full.edges.filter(e=>!ids||(ids.has(e.source)&&ids.has(e.target))).map(e=>({...e,assertions:this.kb.index.relations.filter(r=>r.source.objectId===e.source&&r.target.objectId===e.target&&r.predicate===e.relation).flatMap(r=>r.assertions.map(a=>this.kb.assertion(a)))}));
        return {schema:"rd-role-graph/1",workspaceId:this.kb.files.config()?.workspaceId??null,revision:this.kb.revision,scope:args.id??"all",truncated:context?.truncated??false,nodes,edges,unresolved:full.unresolved.filter(e=>!ids||ids.has(e.source)||ids.has(e.target)),diagnostics:full.diagnostics,meaning:"Declared roles and relations with source versions. Not a truth or causal validation."};
    }
    export(args:Record<string,unknown>) {
        const graph=this.graph(args),format=String(args.format??"json"),stem=args.id?"rational-delirium-context":"rational-delirium-knowledge";
        let text="",type="application/json",extension="json";
        switch(format){
            case "json":text=JSON.stringify(graph,null,2);break;
            case "nodes-csv": text=csv(["id","key","assetId","path","title","kind","roles","status","revision","citations"],graph.nodes);type="text/csv";extension="nodes.csv";break;
            case "edges-csv":text=csv(["source","target","relation","assertions"],graph.edges);type="text/csv";extension="edges.csv";break;
            case "mermaid":case "markdown":{
                const keys=new Map(graph.nodes.filter(n=>n.id).map((n,i)=>[n.id,"n"+i]));
                const diagram="flowchart LR\n"+graph.nodes.filter(n=>n.id).map(n=>`  ${keys.get(n.id)}["${safeText(n.title)}"]`).join("\n")+"\n"+graph.edges.filter(e=>keys.has(e.source)&&keys.has(e.target)).map(e=>`  ${keys.get(e.source)} -->|${e.relation}| ${keys.get(e.target)}`).join("\n");
                text=format==="mermaid"?diagram:`# 理性失序 · 知识关系\n\n版本：${graph.revision}\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\n`+graph.nodes.map(n=>`## ${safeText(n.title)}\n\n- ID：${n.id??"普通材料"}\n- 角色：${n.roles.join("、")||"未分类"}\n- 状态：${n.status??"未声明"}\n- 路径：${n.path}\n- 版本：${n.revision}\n\n`+n.citations.map(c=>`> ${String(c.quote).replace(/\n/g,"\n> ")}\n\n来源：${c.path} L${c.startLine}–L${c.endLine} · ${c.revision}\n`).join("\n")).join("\n")+"\n## 关系声明\n\n"+graph.edges.map(e=>`${e.source} → ${e.relation} → ${e.target}\n\n`+e.assertions.map(a=>`- ${a.path} · ${a.field??"正文"} · ${a.line??"未标行"} · ${a.revision}`).join("\n")).join("\n\n")+`\n\n未解析关系：${graph.unresolved.length}。这是已声明关系的导出。完整机器可读元数据请同时保存 JSON。\n`;
                type="text/plain";extension=format==="mermaid"?"mmd":"md";break;
            }
            case "zip":{
                requireValue(!args.id,"INVALID_ARGUMENT","Content packages export the whole workspace");
                requireValue(!this.kb.scanDiagnostics.length,"INCOMPLETE_INDEX","Resolve unreadable sources before exporting a content package");
                requireValue(this.kb.sources.size<=1000,"FILE_LIMIT","Content packages support up to 1000 Markdown files");
                const entries:Record<string,Uint8Array>={};let total=0;
                const files=[...this.kb.sources.values()].map(f=>{const bytes=Buffer.from(f.markdown);total+=bytes.length;entries["content/"+f.path]=bytes;return {path:f.path,revision:f.revision,bytes:bytes.length};});
                entries["relations.json"]=Buffer.from(JSON.stringify(graph));
                entries["manifest.json"]=Buffer.from(JSON.stringify({schema:"rd-knowledge-package/1",workspaceId:graph.workspaceId,revision:graph.revision,files,relationsSha256:sha256(Buffer.from(entries["relations.json"])),notes:"Markdown content and declared relations. No approval keys or operational history."}));
                total+=entries["relations.json"].length+entries["manifest.json"].length;
                requireValue(total<=MAX_TOTAL&&entries["manifest.json"].length<=MAX_FILE_BYTES&&entries["relations.json"].length<=MAX_FILE_BYTES,"FILE_LIMIT","Content package exceeds 32 MiB total or 2 MiB metadata limit");
                const zipped=zipSync(entries,{level:6});requireValue(zipped.length<=MAX_ZIP,"FILE_LIMIT","Compressed content package exceeds 6 MiB; export the folder directly");
                return {filename:stem+".zip",mime:"application/zip",base64:Buffer.from(zipped).toString("base64")};
            }
            default:requireValue(false,"INVALID_ARGUMENT","Unknown export format");
        }
        return {filename:stem+"."+extension,mime:type+"; charset=utf-8",text};
    }
    preview(args:Record<string,unknown>) {
        const encoded=string(args.base64,"base64");requireValue(encoded.length<=MAX_ZIP*4/3+4&&encoded.length%4===0&&!/[^A-Za-z0-9+/=]/.test(encoded)&&!/=/.test(encoded.slice(0,-2))&&/^[A-Za-z0-9+/]*={0,2}$/.test(encoded.slice(-2)),"FILE_LIMIT","Use a ZIP package up to 6 MiB");
        const seen=new Set<string>();let total=0;
        const entries=unzipSync(Buffer.from(encoded,"base64"),{filter:file=>{
            requireValue(!seen.has(file.name)&&seen.size<1002,"INVALID_PACKAGE","Duplicate or too many ZIP entries");seen.add(file.name);
            requireValue(["manifest.json","relations.json"].includes(file.name)||file.name.startsWith("content/"),"INVALID_PACKAGE","Unexpected ZIP entry");
            if(file.name.startsWith("content/"))this.kb.files.absolute(file.name.slice(8));
            total+=file.originalSize;requireValue(file.originalSize<=MAX_FILE_BYTES&&total<=MAX_TOTAL,"FILE_LIMIT","Expanded package exceeds content limits");return true;
        }});
        const decode=(bytes:Uint8Array)=>new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(bytes);
        requireValue(entries["manifest.json"]&&entries["relations.json"],"INVALID_PACKAGE","Manifest and relations are required");
        const manifest=record(JSON.parse(decode(entries["manifest.json"])));
        requireValue(manifest.schema==="rd-knowledge-package/1"&&Array.isArray(manifest.files)&&manifest.files.length<=1000,"INVALID_PACKAGE","Unsupported package manifest");
        requireValue(Object.keys(entries).length===manifest.files.length+2,"INVALID_PACKAGE","ZIP and manifest entries differ");
        requireValue(sha256(Buffer.from(entries["relations.json"]))===manifest.relationsSha256,"INVALID_PACKAGE","Relation snapshot hash mismatch");
        const names=new Set<string>();
        const files=manifest.files.map(value=>{
            const f=record(value),path=string(f.path,"path");this.kb.files.absolute(path);const key=path.toLowerCase();requireValue(!names.has(key),"INVALID_PACKAGE","Case-colliding or duplicate paths");names.add(key);
            const bytes=entries["content/"+path];requireValue(bytes&&bytes.length===f.bytes&&sha256(Buffer.from(bytes))===f.revision,"INVALID_PACKAGE","Content hash or size mismatch",{path});
            const markdown=decode(bytes),parsed=parseObject(path,markdown,0,1),current=this.kb.sources.get(path),collisions=parsed.declaredId?(this.kb.index.snapshot().pathsById.get(parsed.declaredId)??[]).filter(p=>p!==path):[];
            return {path,markdown,revision:String(f.revision),before:current?.revision??null,state:collisions.length?"identity-conflict":current?(current.revision===f.revision?"same":"conflict"):"new",id:parsed.declaredId,conflicts:collisions};
        });
        // Preview never rewrites IDs or decides which conflicting content to keep.
        for(const [id,paths] of new Map(files.filter(f=>f.id).map(f=>[f.id,files.filter(x=>x.id===f.id).map(x=>x.path)])))if(paths.length>1) for(const f of files.filter(f=>f.id===id)){f.state="identity-conflict";f.conflicts=paths;}
        for(const [id,s] of this.staged)if(s.expires<Date.now())this.staged.delete(id);
        requireValue(this.staged.size<3,"IMPORT_LIMIT","Close or finish earlier import previews before opening another");
        const id=randomUUID();this.staged.set(id,{expires:Date.now()+10*60*1000,files});
        return {id,expiresInSeconds:600,workspaceId:manifest.workspaceId,files:files.map(({markdown,...f})=>f),maxChanges:32,maxBytes:8*1024*1024};
    }
    discard(id:string){this.staged.delete(id);return {discarded:true};}
    import(args:Record<string,unknown>) {
        const id=string(args.id,"id"),staged=this.staged.get(id);requireValue(staged&&staged.expires>Date.now(),"STALE_IMPORT","Import preview expired; open the package again");
        requireValue(Array.isArray(args.paths)&&args.paths.length>0&&args.paths.length<=32&&new Set(args.paths).size===args.paths.length,"INVALID_ARGUMENT","Select 1–32 unique paths per transaction");
        const changes=args.paths.map(path=>{const f=staged.files.find(f=>f.path===path);requireValue(f&&f.state!=="same"&&f.state!=="identity-conflict","INVALID_ARGUMENT","Select new or conflicting Markdown files");requireValue(f.state!=="conflict"||args.replace===true,"IMPORT_CONFLICT","Explicitly choose replacement for conflicting files");requireValue((this.kb.sources.get(f.path)?.revision??null)===f.before,"STALE_SOURCE","Import destination changed; preview the package again");return {path:f.path,beforeSha256:f.before,afterMarkdown:f.markdown};});
        return this.mutations.propose({actor:"local-operator",reason:"导入知识内容包",changes});
    }
}

import { randomUUID } from "node:crypto";
import { parseDocument, stringify } from "yaml";
import { splitFrontmatter } from "../src/parsers/frontmatter-parser";
import { KNOWLEDGE_ROLES, isRole, type KnowledgeRole } from "../src/knowledge-roles";
import { canonical, sha256 } from "./files";
import { integer, record, requireValue, string } from "./errors";
import type { FolderKnowledge } from "./knowledge";
import type { MutationEngine } from "./mutations";

export function patchFields(markdown: string, updates: Record<string, unknown>) {
    const block=splitFrontmatter(markdown);
    requireValue(block,"INVALID_OBJECT","An object needs frontmatter before changing roles or relations");
    const raw=block.text.replace(/^\uFEFF?---\r?\n/,"").replace(/---\r?\n?$/,"");
    const doc=parseDocument(raw); requireValue(!doc.errors.length,"INVALID_OBJECT","Invalid frontmatter");
    for(const [key,value] of Object.entries(updates)) doc.set(key,value);
    const nl=markdown.includes("\r\n")?"\r\n":"\n", bom=markdown.startsWith("\uFEFF")?"\uFEFF":"";
    return bom+"---"+nl+doc.toString().replace(/\r?\n/g,nl)+"---"+nl+markdown.slice(block.end);
}
function selectedRoles(value: unknown): KnowledgeRole[] {
    requireValue(Array.isArray(value)&&value.length>0&&value.length<=4&&value.every(isRole)&&new Set(value).size===value.length,"INVALID_ARGUMENT","Select 1–4 unique knowledge roles");
    return KNOWLEDGE_ROLES.filter(r=>value.includes(r));
}
function newId() { return "ko-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+BigInt("0x"+randomUUID().replace(/-/g,"")).toString(); }

export class KnowledgeWorkbench {
    constructor(readonly kb: FolderKnowledge, readonly mutations: MutationEngine) {}
    boards(args: Record<string,unknown>={}) {
        const counts:Record<string,number>={case:0,evidence:0,hypothesis:0,loop:0,unclassified:0};
        let offset=0;const all:ReturnType<FolderKnowledge["list"]>["items"]=[];
        do { const page=this.kb.list({limit:500,offset});all.push(...page.items); for(const row of page.items) { if(!row.roles.length) counts.unclassified++; for(const role of row.roles) counts[role]++; } offset+=page.items.length; if(offset>=page.total) break; } while(true);
        const listing=args.query?this.kb.search(args):this.kb.list(args),rows="hits" in listing?listing.hits:listing.items;
        const caseIndex:Record<string,{group:string|null;importance:string|null;summary:string;roles:Record<string,number>;relations:number;supports:number;contradicts:number}>=Object.create(null);
        const graph=this.kb.index.semanticSnapshot(),byId=new Map(all.filter(o=>o.id).map(o=>[o.id,o]));
        for(const row of rows.filter(o=>o.id&&byId.get(o.id)?.roles.includes("case"))){
            const note=this.kb.get({path:row.path}),fields=note.frontmatter,edges=graph.edges.filter(e=>e.source===row.id||e.target===row.id),ids=new Set(edges.map(e=>e.source===row.id?e.target:e.source).filter(id=>id!==row.id));
            const roles=Object.fromEntries(KNOWLEDGE_ROLES.map(role=>[role,[...ids].filter(id=>byId.get(id)?.roles.includes(role)).length]));
            const summary=note.body.split(/\r?\n/).map(l=>l.trim()).find(l=>l&&!/^(?:#|>|[-*] |observed_in:|repeats_in:|derived_from:)/.test(l))??"";
            caseIndex[row.id!]={group:typeof fields.rd_case_group==="string"?fields.rd_case_group.slice(0,80):null,importance:typeof fields.rd_importance==="string"?fields.rd_importance:null,summary:summary.slice(0,240),roles,relations:edges.length,supports:edges.filter(e=>e.relation==="supports").length,contradicts:edges.filter(e=>e.relation==="contradicts").length};
        }
        return {revision:this.kb.revision,counts,...listing,caseIndex,meaning:"Roles can overlap; counts do not sum to the number of files. Case groups and priority come from declared metadata; relation counts are direct declarations, not confidence."};
    }
    analyze(args: Record<string,unknown>) {
        const source=this.kb.get(args.id?{id:args.id}:{path:args.path});
        const lines=source.markdown.split(/\r\n|\r|\n/), units:{startLine:number;endLine:number;quote:string;title:string;roles:KnowledgeRole[];reasons:string[]}[]=[];
        let heading="", sectionRoles:KnowledgeRole[]=[], start=-1, fenced=false;
        const flush=(end:number)=>{
            if(start<0) return;
            const quote=lines.slice(start,end).join("\n");
            if(quote.trim()&&quote.length<=8000&&units.length<24) {
                const roles=new Set<KnowledgeRole>(sectionRoles), reasons=sectionRoles.length?["来自明确的段落标题"]:[];
                if(/(?:假设|可能|也许|推测|我认为|hypothesis|might|perhaps)/i.test(quote)) {roles.add("hypothesis"); reasons.push("包含试探性解释或假设措辞");}
                if(/(?:观察到|实测|记录显示|访谈|测量|数据|\d+(?:\.\d+)?\s*(?:%|次|分钟|小时)|observed|measured)/i.test(quote)) {roles.add("evidence");reasons.push("包含观察、记录或数据线索；尚未核实真实性");}
                if(/(?:\d{4}[-年/]\d{1,2}|这次|那天|当时|案例|case study)/i.test(quote)) {roles.add("case");reasons.push("包含具体事件或情境线索");}
                if(/(?:反复出现|每次.+(?:都会|就)|多次.+相似|重复模式|recurring pattern)/i.test(quote)&&!/(?:没有|未能|并未|不能|尚未).{0,8}(?:反复|重复|模式)|不(?:是|构成).{0,4}(?:重复|模式)/.test(quote)) {roles.add("loop");reasons.push("原文声称有重复现象；仍需跨案例与反例检验");}
                const genericHeading=/^(?:案例(?:与情境)?|证据(?:与依据)?|假设(?:与解释)?|重复模式|循环模式|case|evidence|hypothesis|loop)$/i.test(heading);
                units.push({startLine:start+1,endLine:end,quote,title:((heading&&!genericHeading)?heading:quote.split(/[。.!！\n]/)[0]).slice(0,100),roles:KNOWLEDGE_ROLES.filter(r=>roles.has(r)),reasons:reasons.length?reasons:["缺少足够的角色线索，保留为未分类材料"]});
            }
            start=-1;
        };
        for(let i=source.bodyStartLine-1;i<lines.length;i++) {
            const line=lines[i];
            if(/^\s*(```|~~~)/.test(line)){flush(i);fenced=!fenced;continue;} if(fenced)continue;
            const h=/^#{1,6}\s+(.+)/.exec(line);
            if(h){flush(i);heading=h[1]; sectionRoles=KNOWLEDGE_ROLES.filter(role=>({case:/案例|情境|case/i,evidence:/证据|依据|evidence/i,hypothesis:/假设|解释|hypothesis/i,loop:/重复模式|循环模式|loop/i}[role]).test(heading));continue;}
            if(!line.trim())flush(i);else if(start<0)start=i;
        }
        flush(lines.length);
        return {path:source.path,revision:source.revision,method:"paragraph-rules/1",units,limit:24,omitted:source.body.length>0&&!units.length,meaning:"Suggestions from headings and wording, not semantic validation. Review roles and keep original context."};
    }
    organize(args: Record<string,unknown>) {
        const source=this.kb.get({path:args.path}); requireValue(source.revision===args.revision,"STALE_SOURCE","Material changed; analyze it again");
        requireValue(Array.isArray(args.selections)&&args.selections.length>0&&args.selections.length<=24,"INVALID_ARGUMENT","Select 1–24 source spans");
        const lines=source.markdown.split(/\r\n|\r|\n/), seen=new Set<string>();
        const changes=args.selections.map(value=>{
            const s=record(value), startLine=integer(s.startLine,0,source.bodyStartLine,lines.length),endLine=integer(s.endLine,0,startLine,lines.length),roles=selectedRoles(s.roles);
            const quote=lines.slice(startLine-1,endLine).join("\n");requireValue(quote.trim()&&quote.length<=8000,"INVALID_ARGUMENT","Use a non-empty source span up to 8000 characters");
            const extractionKey=sha256(canonical({path:source.path,revision:source.revision,startLine,endLine}));requireValue(!seen.has(extractionKey),"DUPLICATE_EXTRACTION","Select each source span once and assign multiple roles");seen.add(extractionKey);
            const id=newId(),title=string(s.title,"title").trim();requireValue(title.length<=160,"INVALID_ARGUMENT","Title is too long");
            const fields={object_id:id,kind:roles.includes("hypothesis")?"hypothesis":"observation",status:"candidate",title,rd_roles:roles,rd_extraction_key:extractionKey,rd_sources:[{path:source.path,revision:source.revision,startLine,endLine,quote}],...(source.id?{derived_from:[source.id]}:{})};
            return {path:`Knowledge/${id}.md`,beforeSha256:null,afterMarkdown:"---\n"+stringify(fields)+"---\n# "+title+"\n\n"+quote+"\n"};
        });
        return this.mutations.propose({actor:args.actor??"local-operator",reason:args.reason??"从材料整理知识单元",evidence:[source.path],changes});
    }
    roles(args: Record<string,unknown>) {
        const source=this.kb.get({path:args.path}); requireValue(source.id,"INVALID_OBJECT","Extract a knowledge unit from ordinary material first");
        requireValue(source.revision===args.revision,"STALE_SOURCE","Source changed");
        requireValue(Array.isArray(args.roles)&&args.roles.every(isRole)&&new Set(args.roles).size===args.roles.length,"INVALID_ARGUMENT","Invalid roles");
        return this.mutations.propose({actor:args.actor??"local-operator",reason:args.reason??"调整知识角色",changes:[{path:source.path,beforeSha256:source.revision,afterMarkdown:patchFields(source.markdown,{rd_roles:args.roles})}]});
    }
    link(args:Record<string,unknown>) {
        const source=this.kb.get({id:args.id}), target=this.kb.get({id:args.target});
        requireValue(source.id!==target.id,"INVALID_ARGUMENT","Select another object");requireValue(source.revision===args.revision,"STALE_SOURCE","Source changed");
        const predicate=string(args.predicate,"predicate");requireValue(["supports","contradicts","complements","related","derived_from","observed_in","repeats_in"].includes(predicate),"INVALID_ARGUMENT","Unsupported relation");
        const declared=this.kb.relations({id:source.id}).relations;
        requireValue(!declared.some(r=>r.direction==="outgoing"&&r.predicate===predicate&&r.target.objectId===target.id),"NO_CHANGE","This relation already exists");
        const bodyRelation=["observed_in","repeats_in"].includes(predicate)||(source.format==="legacy"&&predicate==="derived_from");
        const existing=source.frontmatter[predicate]??[];requireValue(bodyRelation||Array.isArray(existing),"INVALID_OBJECT","Relation field must be an array");
        // Body declarations use exact paths; KO frontmatter also accepts declared object IDs.
        const ref=source.format==="legacy"?`[[${target.path.replace(/\.md$/,"")}]]`:target.id;
        const declaredAfter=bodyRelation?source.markdown.replace(/\s*$/,"")+`\n\n${predicate}: [[${target.path.replace(/\.md$/,"")}]]\n`:patchFields(source.markdown,{[predicate]:[...(existing as unknown[]),ref]});
        const notes=source.frontmatter.rd_relation_notes??[];requireValue(Array.isArray(notes),"INVALID_OBJECT","Relation notes must be an array");
        const reason=string(args.reason??"人工声明关系","reason");requireValue(reason.length<=2000,"INVALID_ARGUMENT","Relation reason is too long");
        const after=patchFields(declaredAfter,{rd_relation_notes:[...notes,{predicate,target:target.id,targetPath:target.path,reason,sourceRevision:source.revision,targetRevision:target.revision,createdAt:new Date().toISOString()}]});
        return this.mutations.propose({actor:args.actor??"local-operator",reason:args.reason??`声明 ${predicate} 关系`,evidence:[source.path,target.path],changes:[{path:source.path,beforeSha256:source.revision,afterMarkdown:after}]});
    }
    suggestions(args:Record<string,unknown>) {
        const source=this.kb.get({id:args.id});
        const related=new Set(this.kb.relations({id:source.id}).relations.flatMap(r=>[r.source.objectId,r.target.objectId]));
        return {method:"lexical-title/1",suggestions:this.kb.search({query:source.title,limit:12}).hits.filter(h=>h.id&&h.id!==source.id&&!related.has(h.id)).slice(0,6),meaning:"Possible related material only; similarity does not establish support, contradiction or a recurring pattern."};
    }
}

import {randomUUID} from "node:crypto";
import * as path from "node:path";
import {stringify} from "yaml";
import {collectIntake,type IntakeCollection,type IntakeMaterial} from "./intake-sources";
import {RootFiles,canonical,now,sha256,workspaceLock} from "./files";
import {initialize} from "./mutations";
import {KnowledgeService} from "./service";
import {errorData,record,requireValue} from "./errors";
import {isRole,type KnowledgeRole} from "../src/knowledge-roles";
import {extractBodyRelations} from "../src/parsers/body-relations";
import {patchFields} from "./workbench";
import {splitFrontmatter,parseYamlFields} from "../src/parsers/frontmatter-parser";

export interface IntakeCitation {path:string;revision:string;startLine:number;endLine:number;quote:string}
export interface IntakePacket extends IntakeCitation {packetId:string;origin:Record<string,unknown>}
export interface IntakeItem {key:string;title:string;roles:KnowledgeRole[];body:string;citations:IntakeCitation[];uncertainties:string[]}
interface IntakeNode extends IntakeItem {id:string;path:string;markdown:string;existing?:boolean}
export interface IntakeRelation {source:string;target:string;predicate:"supports"|"contradicts"|"complements"|"observed_in"|"repeats_in";state:"declared"|"candidate";reason:string;missingEvidence:string;evidence:IntakeCitation[]}
export interface IntakeRequest {phase:"extract"|"relate"|"verify";batch:number;round:number;purpose:string;packets?:IntakePacket[];objects?:Omit<IntakeNode,"markdown">[];relations?:IntakeRelation[];feedback?:unknown}
export type IntakeGenerator=(request:IntakeRequest)=>Promise<unknown>;
export interface IntakeOptions {base?:string;key?:string;collect?:{fetch?:typeof fetch};onEvent?:(event:any)=>void|Promise<void>}
const RELATIONS=["supports","contradicts","complements","observed_in","repeats_in"];
function json(value:unknown):any{if(typeof value!=="string")return record(value);return record(JSON.parse(value.trim().replace(/^```(?:json)?\s*\n([\s\S]*)\n```$/,"$1")));}
function texts(value:unknown,label:string,max=24):string[]{requireValue(Array.isArray(value)&&value.length<=max&&value.every(t=>typeof t==="string"&&t.trim()&&t.length<=2000),"INVALID_DRAFT","Invalid "+label);return value;}
export function intakePackets(material:IntakeMaterial):IntakePacket[]{
    const lines=material.markdown.split("\n"),packets:IntakePacket[]=[];let start=material.contentStartLine-1;
    while(start<material.contentEndLine){
        if(lines[start].length+1>16000){for(let offset=0;offset<lines[start].length;offset+=15000)packets.push({packetId:material.path+":"+(start+1)+"@"+offset,path:material.path,revision:material.revision,startLine:start+1,endLine:start+1,quote:lines[start].slice(offset,offset+15000),origin:material.origin});start++;continue;}
        let end=start,chars=0;while(end<material.contentEndLine&&end-start<160&&chars+lines[end].length+1<=16000){chars+=lines[end].length+1;end++;}packets.push({packetId:material.path+":"+(start+1),path:material.path,revision:material.revision,startLine:start+1,endLine:end,quote:lines.slice(start,end).join("\n"),origin:material.origin});start=end;
    }
    return packets;
}
function batches<T>(values:T[],size:(v:T)=>number,max:number){const result:T[][]=[];let batch:T[]=[],bytes=0;for(const value of values){const n=size(value);if(batch.length&&(bytes+n>max||batch.length>=12)){result.push(batch);batch=[];bytes=0;}batch.push(value);bytes+=n;}if(batch.length)result.push(batch);return result;}
function node(item:IntakeItem,fingerprint:string):IntakeNode{
    const hash=sha256(canonical({title:item.title,roles:item.roles,citations:item.citations})),id="ko-19700101-"+BigInt("0x"+hash).toString(),file="Knowledge/Intake/"+hash.slice(0,32)+".md";
    const uncertainties=[...item.uncertainties,...(item.roles.includes("loop")?["重复模式是待检验解释；需跨案例与反例，材料条数不等于独立试验次数。"]:[])];
    const fields={object_id:id,kind:item.roles.includes("hypothesis")?"hypothesis":"observation",status:"candidate",title:item.title,rd_roles:item.roles,rd_intake_fingerprint:fingerprint,rd_sources:item.citations,rd_uncertainties:uncertainties};
    const markdown="---\n"+stringify(fields)+"---\n# "+item.title+"\n\n"+item.body+"\n\n"+(uncertainties.length?"## 尚待核对 / Uncertainty\n\n"+uncertainties.map(u=>"- "+u).join("\n")+"\n":"");
    requireValue(!extractBodyRelations(markdown,file,0).assertions.length,"UNREVIEWED_RELATION","Knowledge prose cannot bypass the relation review gate");
    return {...item,uncertainties,id,path:file,markdown};
}
function validateCitations(service:KnowledgeService,value:unknown,allowed?:IntakePacket[]):IntakeCitation[]{
    requireValue(Array.isArray(value)&&value.length>0&&value.length<=8,"INVALID_CITATION","Use 1–8 exact source citations");
    const checked=service.knowledge.checkCitations({citations:value});requireValue(checked.allValid,"INVALID_CITATION","Source citation did not pass exact checks",checked);
    requireValue(value.reduce((n,c)=>n+c.quote.length,0)<=16000,"INVALID_CITATION","Keep total quoted evidence below 16000 characters");
    const citations=value.map(c=>({path:c.path,revision:c.revision,startLine:c.startLine,endLine:c.endLine,quote:c.quote}));
    if(allowed)for(const c of citations)requireValue(allowed.some(p=>c.path===p.path&&c.revision===p.revision&&c.startLine>=p.startLine&&c.endLine<=p.endLine&&p.quote.includes(c.quote)),"OUT_OF_SCOPE","Cite source spans supplied in this extraction batch");
    return citations;
}
async function commit(service:KnowledgeService,changes:{path:string;beforeSha256:string|null;afterMarkdown:string}[],reason:string,transactions:string[]){
    for(const group of batches(changes,c=>Buffer.byteLength(c.afterMarkdown),5*1024*1024)){
        const actual=group.filter(c=>{if(!service.files.exists(c.path))return true;const existing=service.files.read(c.path);if(existing.revision===sha256(c.afterMarkdown))return false;requireValue(c.beforeSha256!==null,"INTAKE_CONFLICT","An intake snapshot already exists with different content; no overwrite",{path:c.path});return true;});
        if(!actual.length)continue;
        const citations=actual.flatMap(c=>{const block=splitFrontmatter(c.afterMarkdown),f=block?parseYamlFields(block.text,c.path).fields:{};return [...(Array.isArray(f.rd_sources)?f.rd_sources:[]),...(Array.isArray(f.rd_relation_notes)?f.rd_relation_notes.flatMap((r:any)=>r.evidence??[]):[]),...(Array.isArray(f.rd_relation_candidates)?f.rd_relation_candidates.flatMap((r:any)=>r.evidence??[]):[])];});
        const pins:Record<string,string>={};for(const c of citations){requireValue(!pins[c.path]||pins[c.path]===c.revision,"STALE_EVIDENCE","Conflicting source versions in intake output");pins[c.path]=c.revision;}
        for(const change of actual){const block=splitFrontmatter(change.afterMarkdown),f=block?parseYamlFields(block.text,change.path).fields:{};for(const r of [...(Array.isArray(f.rd_relation_notes)?f.rd_relation_notes:[]),...(Array.isArray(f.rd_relation_candidates)?f.rd_relation_candidates:[])])if(typeof r.targetPath==="string"&&typeof r.targetRevision==="string"){requireValue(!pins[r.targetPath]||pins[r.targetPath]===r.targetRevision,"STALE_EVIDENCE","Conflicting target versions");pins[r.targetPath]=r.targetRevision;}}
        if(Object.keys(pins).length>64&&actual.length>1){await commit(service,actual.slice(0,Math.ceil(actual.length/2)),reason,transactions);await commit(service,actual.slice(Math.ceil(actual.length/2)),reason,transactions);continue;}
        for(let i=0;i<citations.length;i+=64){const checked=await service.execute("check_citations",{citations:citations.slice(i,i+64)});requireValue(checked.allValid,"STALE_EVIDENCE","Intake citations changed before writing",checked);}
        const p=await service.execute("propose",{actor:"scoped-intake",reason,evidence:Object.keys(pins),sourceRevisions:pins,changes:actual});await service.execute("decide",{id:p.id,digest:p.digest,decision:"approved",reviewer:"scoped-intake-operator"},true);const tx=await service.execute("apply",{id:p.id});requireValue(tx.status==="committed","INTAKE_INCOMPLETE","Intake transaction was not committed");transactions.push(tx.id);
    }
}
/** Local operator entry: a scope manifest authorizes collection and additive
 * knowledge creation. Generated data cannot supply paths, approvals or code.
 * SDK callers must have the same operator authority as the CLI. */
export async function runIntake(root:string,manifest:unknown,generate?:IntakeGenerator,options:IntakeOptions={}){
    const files=new RootFiles(root,true);await workspaceLock(files,async()=>{if(!files.config())initialize(files,options.key);});
    const service=new KnowledgeService(files.root,options.key),id="I-"+randomUUID(),runPath=".rd/intake/"+id+".json",transactions:string[]=[],gaps:string[]=[];
    let collection:IntakeCollection|undefined;
    const report:any={schema:"rd-intake-run/1",id,createdAt:now(),status:"collecting",transactions,root:files.root,items:[],relations:[],dispositions:[],gaps};
    const event=async(type:string,data:any={})=>{Object.assign(report,data);files.writeJson(runPath,report);await options.onEvent?.({event:type,id,...data});};
    try{
        const before=await service.execute("status");requireValue(before.structurallyValid&&!before.recoveryRequired,"INTAKE_PREFLIGHT","Resolve existing structure or recovery errors before intake");
        await event("collecting");collection=await collectIntake(manifest,options.base??process.cwd(),files.root,options.collect);gaps.push(...collection.gaps);
        const completedPath=".rd/intake/completed-"+collection.fingerprint+".json";
        if(files.exists(completedPath,true)){
            const old=files.json<any>(completedPath);await service.execute("status");
            if(old.files?.every((f:any)=>service.knowledge.sources.get(f.path)?.revision===f.revision)){await event("unchanged",{status:"unchanged",previousRun:old.id,fingerprint:collection.fingerprint});return report;}
            gaps.push("A prior intake output was edited or removed; retained edits must be reviewed. No prior output will be overwritten.");
        }
        await event("collected",{status:"collected",fingerprint:collection.fingerprint,manifest:collection.manifest,sources:collection.materials.map(({markdown,...m})=>m),skipped:collection.skipped});
        await commit(service,collection.materials.map(s=>({path:s.path,beforeSha256:null,afterMarkdown:s.markdown})),"保存指定范围的原始资料快照",transactions);
        const pending=collection.materials.filter(s=>{const marker=".rd/intake/source-"+s.revision+".json";if(!files.exists(marker,true))return true;const old=files.json<any>(marker);return !old.files?.every((f:any)=>files.exists(f.path)&&files.read(f.path).revision===f.revision);});
        report.reusedSources=collection.materials.length-pending.length;
        const packets=pending.flatMap(intakePackets);
        // A machine-readable work order for any external Agent; no model bundled.
        const packetPath=".rd/intake/"+id+"-packets.json",packetGroups=batches(packets,p=>p.quote.length,40000),packetFiles=packetGroups.map((group,batch)=>{const file=".rd/intake/"+id+"-packets-"+batch+".json";files.writeJson(file,{schema:"rd-intake-packets/1",id,batch,purpose:collection!.manifest.purpose,packets:group});return file;});
        files.writeJson(packetPath,{schema:"rd-intake-packet-index/1",id,purpose:collection.manifest.purpose,batches:packetFiles});report.packetPath=packetPath;
        if(!generate){await event("awaiting-agent",{status:"awaiting-agent",message:"Sources saved. Supply a DSH adapter or SDK generator to classify and connect them; source collection alone is not semantic organization."});return report;}
        const nodes:IntakeNode[]=[],groups=packetGroups;
        for(let batch=0;batch<groups.length;batch++){
            const group=groups[batch];let accepted=false;
            for(let round=0,feedback:unknown=undefined;round<2;round++){
                try{
                    const draft=json(await generate({phase:"extract",batch,round,purpose:collection.manifest.purpose,packets:structuredClone(group),feedback}));
                    requireValue(Array.isArray(draft.items)&&draft.items.length<=24&&Array.isArray(draft.dispositions)&&draft.dispositions.length===group.length,"INVALID_DRAFT","Return up to 24 items and one disposition for every supplied packet");
                    const local=new Set<string>(),items=draft.items.map((v:any,index:number)=>{
                        requireValue(v&&typeof v.key==="string"&&/^[A-Za-z0-9_-]{1,64}$/.test(v.key)&&!local.has(v.key),"INVALID_DRAFT","Use unique item keys");local.add(v.key);
                        requireValue(typeof v.title==="string"&&v.title.trim()&&v.title.length<=160&&!/[\r\n]/.test(v.title)&&typeof v.body==="string"&&v.body.trim()&&v.body.length<=12000,"INVALID_DRAFT","Item needs a bounded title and body");
                        requireValue(Array.isArray(v.roles)&&v.roles.length>0&&v.roles.length<=4&&v.roles.every(isRole)&&new Set(v.roles).size===v.roles.length,"INVALID_DRAFT","Select 1–4 unique cognitive roles");
                        return node({key:"b"+batch+"_"+v.key,title:v.title,body:v.body,roles:v.roles,citations:validateCitations(service,v.citations,group),uncertainties:texts(v.uncertainties,"uncertainties")},collection!.fingerprint);
                    });
                    requireValue(new Set(draft.dispositions.map((d:any)=>d?.packetId)).size===group.length&&draft.dispositions.every((d:any)=>group.some(p=>p.packetId===d?.packetId)&&["used","skipped"].includes(d.status)&&typeof d.reason==="string"&&d.reason.trim()&&d.reason.length<=1000),"INVALID_DRAFT","Every packet needs a unique used/skipped disposition and reason");
                    for(const d of draft.dispositions){const p=group.find(p=>p.packetId===d.packetId)!;const cited=items.some((n:IntakeNode)=>n.citations.some(c=>c.path===p.path&&c.startLine>=p.startLine&&c.endLine<=p.endLine));requireValue((d.status==="used")===cited,"INVALID_DRAFT","Used dispositions must match cited packet spans");}
                    requireValue(nodes.length+items.length<=128,"INTAKE_LIMIT","Too many extracted items; narrow scope");nodes.push(...items);report.dispositions.push(...draft.dispositions);accepted=true;break;
                }catch(error){feedback=errorData(error);await event("repair-extraction",{lastFeedback:{batch,round,error:feedback}});}
            }
            if(!accepted){gaps.push("Extraction batch "+batch+" did not pass checks; original snapshots remain unclassified.");report.dispositions.push(...group.map(p=>({packetId:p.packetId,status:"unresolved",reason:"Agent extraction did not pass source/format checks"})));}
            await event("extracting",{status:"extracting",extracted:nodes.length,batches:groups.length});
        }
        // Identical extractions in overlapping packets are one object.
        const allNodes=[...new Map(nodes.map(n=>[n.id,n])).values()];
        const unique=allNodes.filter(n=>!files.exists(n.path));
        if(unique.length!==allNodes.length)gaps.push("Existing extraction files were retained. Review earlier outputs before replacing their interpretation or relations.");
        const inventory:IntakeNode[]=[];for(const n of unique){const hits=await service.execute("search",{query:n.title,includeNotes:false,limit:5});for(const hit of hits.hits){if(!hit.id||unique.some(n=>n.id===hit.id)||inventory.some(n=>n.id===hit.id)||inventory.length>=40)continue;const o=await service.execute("get",{path:hit.path});inventory.push({key:o.id,id:o.id,path:o.path,title:o.title,body:o.body.slice(0,2000),roles:o.roles,citations:o.citations.filter((c:any)=>c.availability==="current").map(({availability,...c}:any)=>c),uncertainties:[],markdown:o.markdown,existing:true});}}
        const objects=[...unique,...inventory],byKey=new Map(objects.flatMap(n=>[[n.key,n],[n.id,n]] as [string,IntakeNode][])),relations:IntakeRelation[]=[];
        // Relations are bounded separately; no similarity-to-edge conversion.
        for(let batch=0;batch<Math.ceil(unique.length/24);batch++){
            const seeds=unique.slice(batch*24,(batch+1)*24),other=objects.filter(n=>!seeds.includes(n)).slice(0,64),visible=[...seeds,...other].map(({markdown,...n})=>n);
            let candidates:IntakeRelation[]=[];
            let relationAccepted=false,relationFeedback:unknown;
            for(let round=0;round<2;round++)try{
                const draft=json(await generate({phase:"relate",batch,round,purpose:collection.manifest.purpose,objects:structuredClone(visible),feedback:relationFeedback}));requireValue(Array.isArray(draft.relations)&&draft.relations.length<=64,"INVALID_DRAFT","Return up to 64 relations");
                const visibleIds=new Set(visible.map(n=>n.id));
                candidates=draft.relations.map((r:any)=>{const s=byKey.get(r?.source),t=byKey.get(r?.target);requireValue(s&&t&&s!==t&&seeds.includes(s)&&visibleIds.has(t.id)&&RELATIONS.includes(r.predicate)&&["declared","candidate"].includes(r.state),"INVALID_RELATION","Use exact supplied endpoints, a new source object and a supported directed relation");const missing=r.missingEvidence??"";requireValue(typeof r.reason==="string"&&r.reason.trim()&&r.reason.length<=2000&&typeof missing==="string"&&missing.length<=2000&&(r.state!=="candidate"||missing.trim()),"INVALID_RELATION","Explain the relation and remaining gaps");const evidence=validateCitations(service,r.evidence);requireValue(evidence.every(c=>[...s.citations,...t.citations].some(a=>a.path===c.path&&a.revision===c.revision&&c.startLine>=a.startLine&&c.endLine<=a.endLine)),"OUT_OF_SCOPE","Relation evidence must come from endpoint source spans");requireValue([s,t].every(n=>evidence.some(c=>n.citations.some(a=>a.path===c.path&&a.revision===c.revision))),"MISSING_ENDPOINT_EVIDENCE","Cite original evidence for both endpoints");return {source:s.key,target:t.id,predicate:r.predicate,state:r.state,reason:r.reason,missingEvidence:missing,evidence};});relationAccepted=true;break;
            }catch(error){relationFeedback=errorData(error);await event("repair-relations",{lastRelationError:relationFeedback});}
            if(!relationAccepted){gaps.push("Relation batch "+batch+" unresolved: "+(relationFeedback as any)?.code);continue;}
            if(candidates.length){
                let reviews:any[]=[];try{const result=json(await generate({phase:"verify",batch,round:0,purpose:collection.manifest.purpose,objects:structuredClone(visible),relations:structuredClone(candidates)}));requireValue(Array.isArray(result.reviews)&&result.reviews.length===candidates.length&&new Set(result.reviews.map((r:any)=>r.index)).size===candidates.length&&result.reviews.every((r:any)=>Number.isInteger(r.index)&&r.index>=0&&r.index<candidates.length&&["confirm","candidate","reject"].includes(r.decision)&&typeof r.reason==="string"&&r.reason.trim()&&r.reason.length<=2000&&typeof r.missingEvidence==="string"&&r.missingEvidence.length<=2000),"INVALID_REVIEW","Review every relation exactly once");reviews=result.reviews;}catch(error){gaps.push("Relation verification batch "+batch+" failed; all proposed edges remain candidates.");}
                for(let i=0;i<candidates.length;i++){
                    const r=candidates[i],review=reviews.find(r=>r.index===i);if(review?.decision==="reject"){report.relations.push({...r,state:"rejected",review});continue;}
                    const formal=r.state==="declared"&&review?.decision==="confirm";
                    r.state=formal?"declared":"candidate";r.missingEvidence=formal?"":review?.missingEvidence||r.missingEvidence||"需要进一步核对关系方向、适用范围及原始材料是否足以支持这一关系。";
                    r.reason=(r.reason+"\n核对："+(review?.reason??"语义复核未完成，保留候选。")).slice(0,2000);
                    if(!relations.some(e=>e.source===r.source&&e.target===r.target&&e.predicate===r.predicate)){if(relations.length>=256){gaps.push("Relation limit reached; remaining relations were not adopted.");break;}relations.push(r);}
                }
            }
        }
        for(const n of unique){
            const targetVersion=(r:IntakeRelation)=>{const t=objects.find(n=>n.id===r.target)!;return {targetPath:t.path,...(t.existing?{targetRevision:sha256(t.markdown)}:{})};};
            const outgoing=relations.filter(r=>r.source===n.key),formal=outgoing.filter(r=>r.state==="declared"),candidate=outgoing.filter(r=>r.state==="candidate");const updates:Record<string,unknown>={rd_relation_notes:formal.map(r=>({predicate:r.predicate,target:r.target,...targetVersion(r),reason:r.reason,evidence:r.evidence,reviewedBy:"intake-agent-second-pass"})),rd_relation_candidates:candidate.map(r=>({state:"candidate",predicate:r.predicate,target:r.target,...targetVersion(r),reason:r.reason,acceptance:r.missingEvidence,missingEvidence:r.missingEvidence,evidence:r.evidence}))};
            for(const predicate of ["supports","contradicts","complements"])if(formal.some(r=>r.predicate===predicate))updates[predicate]=formal.filter(r=>r.predicate===predicate).map(r=>r.target);
            n.markdown=patchFields(n.markdown,updates);for(const r of formal.filter(r=>["observed_in","repeats_in"].includes(r.predicate))){const target=objects.find(n=>n.id===r.target)!;n.markdown+=`\n${r.predicate}: [[${target.path.replace(/\.md$/,"")}]]\n`;}
        }
        // All nodes, including cross-batch endpoints, are committed together in
        // bounded journal transactions. Final validation detects partial runs.
        await commit(service,unique.map(n=>({path:n.path,beforeSha256:null,afterMarkdown:n.markdown})),"从指定资料提取四板块知识与已核对的关系",transactions);
        report.items=unique.map(({markdown,...n})=>n);report.relations.push(...relations);
        const valid=await service.execute("validate");requireValue(valid.structurallyValid,"INTAKE_VALIDATION","Knowledge structure invalid after intake; inspect the run and transactions",valid);
        const formal=relations.filter(r=>r.state==="declared");for(let at=0;at<formal.length;at+=64){const checked=await service.execute("check_relations",{relations:formal.slice(at,at+64).map(r=>({source:byKey.get(r.source)!.id,predicate:r.predicate,target:r.target}))});requireValue(checked.allValid,"INTAKE_VALIDATION","Declared graph edges did not pass final checks",checked);}
        const navigation=`Knowledge/Intake/run-${collection.fingerprint.slice(0,24)}.md`,body="---\n"+stringify({rd_navigation:true,rd_review:true,rd_intake_run:id})+"---\n# "+collection.manifest.name+"\n\n"+collection.manifest.purpose+"\n\n## 知识入口 / Knowledge\n\n"+unique.map(n=>`- [[${n.path.replace(/\.md$/,"")}|${n.title}]] · ${n.roles.join(" / ")}`).join("\n")+"\n\n## 不确定性与覆盖 / Coverage\n\n"+(gaps.length?gaps.map(g=>"- "+g).join("\n"):"- 本次检查覆盖指定资料；角色和关系经过 Agent 整理，仍需按原文核对。")+"\n\n原文与历史版本保留在 Materials/Intake；本次记录位于 `"+runPath+"`。采集时间不证明资料中的事件时间或外部最新状态。\n";
        if(!files.exists(navigation))await commit(service,[{path:navigation,beforeSha256:null,afterMarkdown:body}],"建立本次资料整理入口",transactions);
        await event("finished",{status:gaps.length?"partial":"complete",finishedAt:now(),navigation,summary:{sources:collection.materials.length,objects:unique.length,formalRelations:formal.length,candidates:relations.filter(r=>r.state==="candidate").length,skipped:collection.skipped.length},revision:service.knowledge.revision});
        if(!gaps.length){const paths=[...collection.materials.map(s=>s.path),...unique.map(n=>n.path),navigation];files.writeJson(completedPath,{id,files:paths.map(p=>({path:p,revision:files.read(p).revision}))});for(const s of pending){const paths=[s.path,...unique.filter(n=>n.citations.some(c=>c.path===s.path)).map(n=>n.path)];files.writeJson(".rd/intake/source-"+s.revision+".json",{id,files:paths.map(p=>({path:p,revision:files.read(p).revision}))});}}
        return report;
    }catch(error){await event("failed",{status:"failed",finishedAt:now(),error:errorData(error)});throw error;}
    finally{await service.close();}
}

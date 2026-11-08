import type { FolderKnowledge } from "./knowledge";
import { splitFrontmatter,parseYamlFields } from "../src/parsers/frontmatter-parser";
import { words } from "./retrieval";
import { sha256 } from "./files";
import { requireValue } from "./errors";

export interface CoverageQuestion {id:string;question:string;mode?:"current"|"historical"|"general"}
const generic=new Set(["project","case","knowledge","agent","the","与","系统","项目"]);
const versionPattern=/\bv?\d+\.\d+(?:\.\d+)?(?:[-.]?(?:rc|alpha|beta|preview|dev|patch)[.-]?\d+)?\b/gi;
const currentPattern=/当前发布|当前版本|最新发布|最新版本|current\s+(?:release|version)|latest\s+(?:release|version)/i;
const canonicalVersion=(s:string)=>s.toLowerCase().replace(/^v/,"");
export function isCurrentQuestion(q:CoverageQuestion){return q.mode?q.mode==="current":/当前|最新|目前|现在|版本|发布|开源以后|current|latest|release|version/i.test(q.question);}
function repository(value:string){const m=value.match(/(?:https?:\/\/)?github\.com\/([a-z0-9_.-]+)\/([a-z0-9_.-]+)/i);return m?"repository:"+m[1].toLowerCase()+"/"+m[2].replace(/\.git$/,"").toLowerCase():null;}
function fields(markdown:string,path:string){const b=splitFrontmatter(markdown);return b?parseYamlFields(b.text,path).fields:{};}
function labelTokens(text:string){return [...new Set(words(text.replace(/[-_/]/g," ")).filter(w=>w.length>=2&&!generic.has(w)))];}

/** Declared project/source inventory, not semantic inference or a remote freshness check. */
export function sourceCoverage(kb:FolderKnowledge,args:Record<string,unknown>){
    requireValue(typeof args.query==="string"&&args.query.trim()&&args.query.length<=4000,"INVALID_ARGUMENT","Use a nonempty coverage query");
    const query=args.query as string,all=[...kb.sources.values()],notes=all.map(f=>({file:f,fields:fields(f.markdown,f.path),object:kb.index.objectAt(f.path)}));
    const cases=notes.filter(n=>n.object&&((n.fields.rd_roles as any)?.includes?.("case")||n.object.type==="case"));
    const tokens=new Set(labelTokens(query)),named=cases.map(n=>{const labels=[n.object!.title,...(Array.isArray(n.fields.aliases)?n.fields.aliases:[])].filter(v=>typeof v==="string").join(" "),ts=labelTokens(labels),matched=ts.filter(t=>tokens.has(t));return {...n,ts,matched};});
    // Distinctive names outrank incidental words such as “研究” or “验证”.
    const eligible=named.map(n=>{const anchors=n.matched.filter(t=>(/[a-z]/i.test(t)||t.length>=4)&&named.filter(x=>x.ts.includes(t)).length===1),prefix=n.object!.title.split(/[：:]/)[0];return {...n,anchors,phrase:prefix.length>=3&&query.toLowerCase().includes(prefix.toLowerCase())?1:0};}).filter(n=>n.anchors.length||n.phrase||n.matched.length>=3);
    eligible.sort((a,b)=>b.anchors.length-a.anchors.length||b.phrase-a.phrase||b.matched.length-a.matched.length||a.file.path.localeCompare(b.file.path));
    const best=eligible[0],strong=eligible.filter(n=>n.anchors.length||n.phrase),ties=strong.length?strong:best?eligible.filter(n=>n.matched.length===best.matched.length):[],selected=ties.slice(0,2);
    const caseIds=new Set(selected.map(n=>n.object!.id)),graph=kb.index.semanticSnapshot(),members=new Set(caseIds);
    for(const e of graph.edges)if(caseIds.has(e.target)){const node=notes.find(n=>n.object?.id===e.source);if(node&&(node.fields.rd_roles as any)?.includes?.("evidence"))members.add(e.source);}
    const references=new Map<string,Set<string>>(),unavailableSources=new Set<string>();
    const add=(p:unknown,owner:string)=>{if(typeof p!=="string")return;if(!kb.sources.has(p)){unavailableSources.add(p);return;}if(!references.has(p))references.set(p,new Set());references.get(p)!.add(owner);};
    for(const n of notes.filter(n=>n.object&&members.has(n.object.id))){for(const c of Array.isArray(n.fields.rd_sources)?n.fields.rd_sources:[])add(c?.path,n.file.path);for(const r of Array.isArray(n.fields.rd_relation_notes)?n.fields.rd_relation_notes:[])for(const c of Array.isArray(r?.evidence)?r.evidence:[])add(c?.path,n.file.path);}
    // Other snapshots of a declared repository/thread/document must be found even
    // if an older knowledge card did not yet cite them. No semantic edge is added.
    const originOf=(f:Record<string,unknown>):any=>f.rd_origin&&typeof f.rd_origin==="object"?f.rd_origin:{};
    const repositoryOf=(f:Record<string,unknown>)=>{const o=originOf(f);return typeof o.repository==="string"?"repository:"+o.repository.toLowerCase():typeof o.url==="string"?repository(o.url):null;};
    const provenanceOf=(f:Record<string,unknown>,p:string)=>{const o=originOf(f);return String(o.threadId??f.rd_origin_thread??o.originalPath??(typeof o.url==="string"?o.url.replace(/\/blob\/[^/]+\//,"/blob/{revision}/"):p));};
    const initial=notes.filter(n=>references.has(n.file.path)),repos=new Set(initial.map(n=>repositoryOf(n.fields)).filter(Boolean)),provenances=new Set(initial.map(n=>provenanceOf(n.fields,n.file.path)));
    for(const n of notes)if(n.fields.rd_material===true&&(repos.has(repositoryOf(n.fields))||provenances.has(provenanceOf(n.fields,n.file.path))))add(n.file.path,"same declared origin inventory");
    const records:any[]=[];
    for(const[p,owners]of references){
        const n=notes.find(n=>n.file.path===p)!;if(n.fields.rd_review===true||n.fields.rd_navigation===true)continue;
        const f=n.fields,origin=f.rd_origin&&typeof f.rd_origin==="object"?f.rd_origin as any:{},lines=n.file.markdown.split(/\r\n|\r|\n/),block=splitFrontmatter(n.file.markdown),start=block?n.file.markdown.slice(0,block.end).split(/\r\n|\r|\n/).length-1:0;
        const originRepo=typeof origin.repository==="string"?"repository:"+origin.repository.toLowerCase():typeof origin.url==="string"?repository(origin.url):null;
        const explicitFamily=typeof f.rd_version_family==="string"?"declared:"+f.rd_version_family:null;
        const recordKey=provenanceOf(f,p),spans:any[]=[];
        for(let i=start;i<lines.length;i++){
            const line=lines[i],versions=[...new Set((line.match(versionPattern)??[]).map(canonicalVersion))];if(!versions.length)continue;
            const isCurrent=currentPattern.test(line),linkedRepos=[...line.matchAll(/https?:\/\/github\.com\/[^\s)\]]+/gi)].map(m=>repository(m[0])).filter(Boolean),family=explicitFamily??(new Set(linkedRepos).size===1?linkedRepos[0]:originRepo);
            const releaseURL=/github\.com\/[^/\s]+\/[^/\s]+\/releases\/(?:tag|download)\//i.test(line);
            const releaseHeading=/^\s*#{1,6}\s*\[?v?\d+\.\d/i.test(line);
            if(!family||!(isCurrent||releaseURL||releaseHeading))continue;
            for(const version of versions){const role=isCurrent?"current_assertion":"historical_record";if(spans.some(s=>s.family===family&&s.version===version&&s.role===role))continue;const at=Math.max(0,line.toLowerCase().indexOf(version)),quote=line.length>700?line.slice(Math.max(0,at-200),at+version.length+300):line,citation={path:p,revision:n.file.revision,startLine:i+1,endLine:i+1,quote};spans.push({key:sha256(JSON.stringify(citation)).slice(0,20),family,version,role,citation,quoteTruncated:quote.length<line.length});}
        }
        const statusLines=lines.map((line,i)=>({line,i})).filter(({line,i})=>i>=start&&/状态|未解决|修复|验收|not.*(?:proven|verified)|not_executed|冻结|current|status/i.test(line));
        const overview=[...new Set([start,Math.min(start+1,lines.length-1),...statusLines.slice(-2).map(x=>x.i)])].map(i=>({path:p,revision:n.file.revision,startLine:i+1,endLine:i+1,quote:lines[i].slice(0,700),quoteTruncated:lines[i].length>700}));
        records.push({path:p,revision:n.file.revision,title:n.object?.title??lines.find(l=>l.startsWith("# "))?.slice(2)??p,recordKey,genre:f.rd_genre??f.rd_material_type??null,sourceDate:f.rd_source_date??f.rd_event_date??null,capturedAt:f.rd_captured_at??null,sourceCommit:origin.commit??null,owners:[...owners],spans,overview});
    }
    const familyMap=new Map<string,any[]>();for(const r of records)for(const span of r.spans){if(!familyMap.has(span.family))familyMap.set(span.family,[]);familyMap.get(span.family)!.push(span);}
    const families=[...familyMap].flatMap(([family,spans])=>{
        const current=spans.filter(s=>s.role==="current_assertion"),versions=[...new Set(current.map(s=>s.version))];
        const representatives=versions.map(version=>current.find(s=>s.version===version)),history=spans.filter(s=>!versions.includes(s.version)),historical=[...new Set(history.map(s=>s.version))].map(version=>history.find(s=>s.version===version));
        return [{family,status:versions.length===0?"historical_only":versions.length===1?"snapshot_assertion":"conflicting_current_assertions",current:representatives,history:historical.slice(0,8),historyTruncated:historical.length>8}];
    });
    const mustRead=families.flatMap(f=>[...f.current,...f.history]);
    const representativePaths=[...new Set([...mustRead.map(s=>s.citation.path),...records.sort((a,b)=>Number(!!b.spans.length)-Number(!!a.spans.length)||a.path.localeCompare(b.path)).map(r=>r.path)])];
    const minimumRecords=Math.min(2,new Set(records.map(r=>r.recordKey)).size),gaps:string[]=[];
    if(!selected.length)gaps.push("No unambiguous declared project scope matched; provide a more specific entity or retain unknown");
    if(selected.length>1)gaps.push("Several project scopes match; do not merge their versions into one latest version");
    if(!families.some(f=>f.current.length))gaps.push("No explicit current release assertion found; record capture time does not establish the latest real-world state");
    if(families.some(f=>f.status==="conflicting_current_assertions"))gaps.push("Conflicting explicit current assertions remain unordered; no version was chosen merely because its number is larger");
    if(minimumRecords<2)gaps.push("Fewer than two distinct provenance records are available; a newer independent record may be missing");
    const inventoryIncomplete=unavailableSources.size>0||kb.scanDiagnostics.length>0;
    if(inventoryIncomplete)gaps.push("Some declared sources or workspace files could not be read; current source coverage is incomplete");
    const result={query,revision:kb.revision,scopes:selected.map(n=>({id:n.object!.id,path:n.file.path,title:n.object!.title,anchors:n.anchors})),records,families,requiredEvidence:mustRead,minimumRecords,representativePaths:representativePaths.slice(0,12),inventoryTruncated:records.length>24||families.some(f=>f.historyTruncated),inventoryIncomplete,unavailableSources:[...unavailableSources],gaps,meaning:"Latest here means explicit statements in saved sources. Semantic version numbers, capture dates and git hashes do not prove publication order or current remote state. Families never establish semantic graph edges."};
    return {...result,records:records.slice(0,24)};
}

export function coverageForQuestions(kb:FolderKnowledge,questions:CoverageQuestion[]){return questions.filter(isCurrentQuestion).map(q=>({id:q.id,...sourceCoverage(kb,{query:q.question})}));}
export function checkCoverage(plan:any,answer:any){
    const issues:any[]=[],review=answer.sourceReview;
    if(!review||!["snapshot","unknown"].includes(review.status)||!Array.isArray(review.currentVersions)||!Array.isArray(review.historicalVersions)||!Array.isArray(review.limits)||!review.limits.length||review.limits.length>24||review.limits.some((v:any)=>typeof v!=="string"||!v.trim()||v.length>2000))return {valid:false,issues:[{code:"SOURCE_COVERAGE_REQUIRED",field:"sourceReview",details:{plan}}]};
    const combinedLimits=[...new Set<string>([...plan.gaps,...review.limits])];
    const limits=combinedLimits.length<=24?combinedLimits:[...combinedLimits.slice(0,23),"Additional coverage limits omitted; consult the source inventory"];
    if(review.status==="unknown"){
        if(review.currentVersions.length)issues.push({code:"UNKNOWN_CURRENT_VERSION",field:"sourceReview"});
        return {valid:!issues.length,issues,unknown:true,normalized:{status:"unknown",currentVersions:[],historicalVersions:[],limits,snapshotRevision:plan.revision,externalCurrentState:"unknown"}};
    }
    if(plan.scopes.length!==1||plan.inventoryTruncated||plan.inventoryIncomplete||plan.families.some((f:any)=>f.status==="conflicting_current_assertions"))issues.push({code:"CURRENT_STATE_UNRESOLVED",field:"sourceReview",details:{gaps:plan.gaps}});
    const citations=Array.isArray(answer.citations)?answer.citations:[],covered=(s:any)=>citations.some((c:any)=>c?.path===s.citation.path&&c.revision===s.citation.revision&&typeof c.quote==="string"&&c.quote.includes(s.citation.quote));
    for(const s of plan.requiredEvidence)if(!covered(s))issues.push({code:s.role==="current_assertion"?"CURRENT_RECORD_OMITTED":"HISTORICAL_RECORD_OMITTED",field:"citations",details:s});
    const recordKeys=new Set(plan.records.filter((r:any)=>citations.some((c:any)=>c?.path===r.path&&c.revision===r.revision)).map((r:any)=>r.recordKey));
    if(recordKeys.size<plan.minimumRecords)issues.push({code:"SOURCE_RECORD_COVERAGE_INCOMPLETE",field:"citations",details:{minimumRecords:plan.minimumRecords,representativePaths:plan.representativePaths}});
    const current=plan.families.flatMap((f:any)=>f.current.map((s:any)=>({family:f.family,version:s.version}))),history=plan.families.flatMap((f:any)=>f.history.map((s:any)=>({family:f.family,version:s.version}))),key=(v:any)=>typeof v?.family==="string"&&typeof v.version==="string"?v.family+"@"+canonicalVersion(v.version):"invalid";
    for(const[name,expected]of [["currentVersions",current],["historicalVersions",history]] as const)if(JSON.stringify([...new Set(review[name].map(key))].sort())!==JSON.stringify([...new Set(expected.map(key))].sort()))issues.push({code:"VERSION_COMPARISON_INCOMPLETE",field:"sourceReview."+name,details:{expected}});
    for(const v of [...current,...history])if(!(String(answer.answer).toLowerCase().includes(v.version)))issues.push({code:"VERSION_OMITTED_FROM_ANSWER",field:"answer",details:v});
    return {valid:!issues.length,issues,unknown:false,normalized:{status:"snapshot",currentVersions:current,historicalVersions:history,comparedSources:plan.records.filter((r:any)=>citations.some((c:any)=>c?.path===r.path&&c.revision===r.revision)).map((r:any)=>({path:r.path,revision:r.revision,sourceDate:r.sourceDate,capturedAt:r.capturedAt})),limits,snapshotRevision:plan.revision,externalCurrentState:"unknown"}};
}

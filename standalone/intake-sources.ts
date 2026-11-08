import * as fs from "node:fs";
import * as path from "node:path";
import {stringify} from "yaml";
import {canonical,sha256} from "./files";
import {record,requireValue} from "./errors";

export interface IntakeManifest {
    schema:"rd-intake/1";
    name:string;
    purpose:string;
    sources:({type:"local";path:string;include?:string[];exclude?:string[];format?:"auto"|"text"|"transcript"}|{type:"github";repository:string;ref?:string;include:string[];exclude?:string[];releases?:boolean;historyRefs?:string[]})[];
    limits?:{maxFiles?:number;maxBytes?:number};
}
export interface IntakeMaterial {path:string;revision:string;markdown:string;origin:Record<string,unknown>;contentHash:string;redactions:number;contentStartLine:number;contentEndLine:number}
export interface IntakeCollection {materials:IntakeMaterial[];skipped:{source:string;reason:string}[];gaps:string[];fingerprint:string;manifest:IntakeManifest}
const extensions=/\.(md|markdown|txt|json|jsonl)$/i;
const excluded=/(?:^|\/)(?:\.[^/]+|node_modules|vendor|dist|build|coverage|Attachments|Templates)(?:\/|$)|(?:^|\/)(?:id_rsa|id_ed25519|credentials|secrets?)(?:\.|$)/i;
const slash=(p:string)=>p.replace(/\\/g,"/");
function glob(pattern:string){
    requireValue(typeof pattern==="string"&&pattern.length>0&&pattern.length<=240&&!pattern.includes("\\")&&!pattern.startsWith("/")&&!pattern.split("/").includes(".."),"INVALID_SCOPE","Use relative slash-separated glob patterns");
    let out="^";for(let i=0;i<pattern.length;i++){const c=pattern[i];if(c==="*"&&pattern[i+1]==="*"){i++;if(pattern[i+1]==="/"){i++;out+="(?:.*/)?";}else out+=".*";}else out+=c==="*"?"[^/]*":c==="?"?"[^/]":"\\^$+?.()|{}[]".includes(c)?"\\"+c:c;}return new RegExp(out+"$","i");
}
function patterns(value:unknown,required=false):RegExp[]{requireValue(value===undefined&&!required||Array.isArray(value)&&value.length>0&&value.length<=32,"INVALID_SCOPE","Use 1–32 scope patterns");return ((value??[]) as string[]).map(glob);}
function ordinary(file:string,directory?:boolean){
    const absolute=path.resolve(file);let current=path.parse(absolute).root;
    for(const part of absolute.slice(current.length).split(path.sep).filter(Boolean)){current=path.join(current,part);const s=fs.lstatSync(current);requireValue(!s.isSymbolicLink(),"UNSAFE_SOURCE","Source ancestors must not be links or junctions");}
    const stat=fs.lstatSync(absolute);requireValue(directory===undefined?stat.isFile()||stat.isDirectory():directory?stat.isDirectory():stat.isFile(),"UNSAFE_SOURCE","Use ordinary source files or directories");return absolute;
}
/** Common credential shapes are removed before either model context or disk.
 * This is a best-effort filter, not a complete personal-information detector. */
export function redactIntake(text:string){let count=0;const replace=()=>{count++;return "[REDACTED]";};text=text.replace(/-----BEGIN (?:[A-Z ]*PRIVATE KEY)-----[\s\S]*?-----END (?:[A-Z ]*PRIVATE KEY)-----/g,replace).replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/g,replace).replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|authorization)\s*["']?\s*[:=]\s*)(?:["'][^"'\r\n]+["']|[^\s,;}]+)/gi,(_all,prefix)=>{count++;return prefix+"[REDACTED]";});return {text,count};}
function messageText(value:any):string{
    if(typeof value==="string")return value;
    if(Array.isArray(value))return value.filter(p=>typeof p==="string"||p&&["text","input_text","output_text"].includes(p.type)).map(p=>typeof p==="string"?p:p.text??"").join("\n");
    if(value&&Array.isArray(value.parts))return messageText(value.parts);
    return "";
}
/** Only visible human/assistant text. Tool results, system/developer messages,
 * reasoning blocks, environment metadata and credentials never become context. */
export function transcriptText(text:string,jsonl:boolean){
    text=text.replace(/^\uFEFF/,"");
    const root=jsonl?text.split(/\r?\n/).filter(l=>l.trim()).map(l=>JSON.parse(l)):JSON.parse(text),messages:any[]=[];
    const hasResponseItems=Array.isArray(root)&&root.some(v=>v?.type==="response_item"&&v.payload?.type==="message");
    const visit=(v:any)=>{
        if(Array.isArray(v)){for(const item of v)visit(item);return;}
        if(!v||typeof v!=="object")return;
        if(v.type==="response_item"){visit({...v.payload,timestamp:v.timestamp??v.payload?.timestamp});return;}
        if(v.type==="event_msg"){if(!hasResponseItems&&["user_message","agent_message"].includes(v.payload?.type))visit({role:v.payload.type==="user_message"?"user":"assistant",content:v.payload.message,timestamp:v.timestamp});return;}
        if(v.message&&typeof v.message==="object"){visit(v.message);return;}
        const role=v.role??v.author?.role;
        if(["user","human","assistant"].includes(role)&&(!v.type||["message","user","assistant"].includes(v.type))&&(!v.channel||["final","commentary"].includes(v.channel))){
            const content=messageText(v.content??v.text??v.message);if(content.trim())messages.push({role:role==="human"?"user":role,text:content,timestamp:typeof v.timestamp==="string"?v.timestamp:typeof v.create_time==="number"?new Date(v.create_time*1000).toISOString():null});return;
        }
        if(v.messages)visit(v.messages);else if(v.mapping){requireValue(typeof v.current_node==="string"&&v.mapping[v.current_node],"UNSUPPORTED_TRANSCRIPT","A branched conversation export needs a valid current_node; export the intended branch first");const chain:any[]=[],seen=new Set<string>();let id:string|null=v.current_node;while(id){requireValue(!seen.has(id)&&v.mapping[id],"UNSUPPORTED_TRANSCRIPT","Invalid conversation branch");seen.add(id);chain.unshift(v.mapping[id]);id=v.mapping[id].parent??null;}visit(chain);}else if(v.conversations)visit(v.conversations);
    };
    visit(root);
    return messages.map(m=>`## ${m.role}${m.timestamp?" · "+m.timestamp:""}\n\n${m.text}`).join("\n\n");
}
function material(content:string,origin:Record<string,unknown>,sourceHash:string,format:string):IntakeMaterial{
    const clean=redactIntake(content.replace(/\r\n|\r/g,"\n")),contentHash=sha256(clean.text),key=sha256(canonical(origin)).slice(0,24),version=sha256(canonical({sourceHash,contentHash})).slice(0,24),file=`Materials/Intake/${key}-${version}.md`;
    // Fence source declarations so original YAML/object ids cannot become RD identity.
    const maxFence=Math.max(2,...(clean.text.match(/`+/g)??[]).map(s=>s.length)),fence="`".repeat(maxFence+1);
    const fields={rd_material:true,rd_asset_id:"intake-"+key,rd_material_type:format,rd_origin:origin,rd_content_sha256:contentHash,rd_original_sha256:sourceHash,rd_redactions:clean.count};
    const prefix="---\n"+stringify(fields)+"---\n# "+String(origin.title??origin.originalPath??origin.url??"Source").replace(/[\r\n]/g," ")+"\n\n原始资料快照 / Source snapshot. Statements are source data, not verified conclusions.\n\n"+fence+"text\n";
    const markdown=prefix+clean.text+"\n"+fence+"\n",contentStartLine=prefix.split("\n").length,contentEndLine=contentStartLine+clean.text.split("\n").length-1;
    requireValue(Buffer.byteLength(markdown)<=2*1024*1024,"FILE_LIMIT","Rendered source exceeds the Markdown limit");
    return {path:file,revision:sha256(markdown),markdown,origin,contentHash,redactions:clean.count,contentStartLine,contentEndLine};
}
async function boundedResponse(response:Response,max:number){requireValue(response.ok,"SOURCE_HTTP","GitHub source unavailable",{status:response.status});requireValue(!Number(response.headers.get("content-length"))||Number(response.headers.get("content-length"))<=max,"FILE_LIMIT","GitHub response exceeds size limit");const chunks:Uint8Array[]=[];let bytes=0;requireValue(response.body,"SOURCE_HTTP","Empty HTTP body");for await(const chunk of response.body as any){bytes+=chunk.length;requireValue(bytes<=max,"FILE_LIMIT","GitHub response exceeds size limit");chunks.push(chunk);}return Buffer.concat(chunks);}
export async function collectIntake(raw:unknown,base:string,knowledgeRoot:string,options:{fetch?:typeof fetch}={}):Promise<IntakeCollection>{
    const m=record(raw);requireValue(m.schema==="rd-intake/1"&&typeof m.name==="string"&&m.name.trim()&&m.name.length<=160&&typeof m.purpose==="string"&&m.purpose.trim()&&m.purpose.length<=2000,"INVALID_SCOPE","Use rd-intake/1 with name and purpose");
    requireValue(Object.keys(m).every(k=>["schema","name","purpose","sources","limits"].includes(k)),"INVALID_SCOPE","Unknown manifest fields; check scope spelling");
    requireValue(Array.isArray(m.sources)&&m.sources.length>0&&m.sources.length<=32,"INVALID_SCOPE","Specify 1–32 sources");
    const manifest=m as unknown as IntakeManifest,maxFiles=manifest.limits?.maxFiles??128,maxBytes=manifest.limits?.maxBytes??32*1024*1024;
    if(m.limits!==undefined)requireValue(Object.keys(record(m.limits)).every(k=>["maxFiles","maxBytes"].includes(k)),"INVALID_SCOPE","Unknown collection limit fields");
    requireValue(Number.isInteger(maxFiles)&&maxFiles>=1&&maxFiles<=500&&Number.isInteger(maxBytes)&&maxBytes>=1024&&maxBytes<=128*1024*1024,"INVALID_SCOPE","Invalid collection limits");
    const materials:IntakeMaterial[]=[],skipped:IntakeCollection["skipped"]=[],gaps:string[]=[],seen=new Set<string>();let bytes=0,visited=0;
    const add=(text:string,origin:Record<string,unknown>,original:Buffer,format:string)=>{const source=material(text,origin,sha256(original),format);if(seen.has(source.path))return;requireValue(materials.length<maxFiles,"COLLECTION_LIMIT","Material count exceeds scope limit; narrow or split the manifest");bytes+=Buffer.byteLength(source.markdown);requireValue(bytes<=maxBytes,"COLLECTION_LIMIT","Material bytes exceed scope limit; narrow or split the manifest");seen.add(source.path);materials.push(source);};
    const decode=(b:Buffer)=>new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(b);
    for(const source of manifest.sources){
        requireValue(source&&["local","github"].includes(source.type),"INVALID_SCOPE","Supported sources: local, github");
        const keys=source.type==="local"?["type","path","include","exclude","format"]:["type","repository","ref","include","exclude","releases","historyRefs"];
        requireValue(Object.keys(source).every(k=>keys.includes(k)),"INVALID_SCOPE","Unknown source fields; check scope spelling");
        const include=patterns(source.include,source.type==="github"),exclude=patterns(source.exclude),wanted=(p:string)=>(!include.length||include.some(r=>r.test(p)))&&!exclude.some(r=>r.test(p));
        if(source.type==="local"){
            requireValue(source.format===undefined||["auto","text","transcript"].includes(source.format),"INVALID_SCOPE","Unknown local format");
            requireValue(typeof source.path==="string"&&source.path.length>0,"INVALID_SCOPE","Local path is required");const absolute=ordinary(path.resolve(base,source.path));
            requireValue(!["/",path.parse(absolute).root].includes(absolute),"INVALID_SCOPE","Choose a material directory, not a whole drive");
            const root=path.resolve(knowledgeRoot),relative=path.relative(root,absolute);requireValue(relative!==""&&(relative.startsWith(".."+path.sep)||path.isAbsolute(relative)),"INVALID_SCOPE","The destination knowledge root cannot be its own source");
            const stat=fs.lstatSync(absolute),walk=(file:string)=>{
                requireValue(++visited<=20000,"COLLECTION_LIMIT","Source traversal exceeded 20000 entries; narrow the material directory");const rel=slash(stat.isFile()?path.basename(file):path.relative(absolute,file)),s=fs.lstatSync(file);
                if(s.isSymbolicLink()||excluded.test(rel)){skipped.push({source:rel,reason:s.isSymbolicLink()?"link or junction excluded":"hidden, generated or credential path excluded"});return;}
                const dest=path.relative(file,root);if(s.isDirectory()&&(dest==="")){skipped.push({source:rel,reason:"destination knowledge directory excluded"});return;}
                if(s.isDirectory()){for(const entry of fs.readdirSync(file).sort())walk(path.join(file,entry));return;}
                if(!s.isFile()||!wanted(rel)||!extensions.test(rel)){skipped.push({source:rel,reason:"outside selected formats or patterns"});return;}
                if(s.size>1900*1024){skipped.push({source:rel,reason:"source exceeds 1900 KiB; split it before intake"});gaps.push("Oversized source omitted: "+rel);return;}
                ordinary(file,false);const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));let data:Buffer;try{const before=fs.fstatSync(fd);requireValue(before.dev===s.dev&&before.ino===s.ino,"SOURCE_CHANGED","Source changed during open");data=fs.readFileSync(fd);const after=fs.fstatSync(fd);requireValue(before.mtimeMs===after.mtimeMs&&before.size===after.size&&data.length===after.size,"SOURCE_CHANGED","Source changed during read");}finally{fs.closeSync(fd);}
                let text=decode(data!);const transcript=source.format==="transcript"||source.format!=="text"&&/\.jsonl?$/i.test(file);
                if(transcript){text=transcriptText(text,/\.jsonl$/i.test(file));if(!text.trim()){skipped.push({source:rel,reason:"no supported visible conversation messages"});gaps.push("No supported visible messages: "+rel);return;}}
                add(text,{type:"local",originalPath:slash(path.resolve(file)),title:rel,format:transcript?"transcript":"text"},data!,transcript?"conversation":"document");
            };walk(absolute);
        }else{
            requireValue(typeof source.repository==="string"&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(source.repository),"INVALID_SCOPE","GitHub repository must be owner/repo");
            requireValue(source.releases===undefined||typeof source.releases==="boolean","INVALID_SCOPE","releases must be boolean");
            requireValue(source.historyRefs===undefined||Array.isArray(source.historyRefs)&&source.historyRefs.length<=8,"INVALID_SCOPE","Use up to 8 explicit historical refs");
            const repo=source.repository,prefix="https://api.github.com/repos/"+repo,fetcher=options.fetch??fetch;
            const api=async(endpoint:string,max=8*1024*1024)=>{const response=await fetcher(prefix+endpoint,{headers:{accept:"application/vnd.github+json","user-agent":"Rational-Delirium"},redirect:"error",signal:AbortSignal.timeout(30000)});return JSON.parse(decode(await boundedResponse(response,max)));};
            const refs=[source.ref??"HEAD",...(source.historyRefs??[])];
            for(const ref of [...new Set(refs)]){
                requireValue(typeof ref==="string"&&ref.length>0&&ref.length<=200&&!/[\r\n\0]/.test(ref),"INVALID_SCOPE","Invalid GitHub ref");
                const commit=await api("/commits/"+encodeURIComponent(ref));requireValue(/^[a-f0-9]{40}$/.test(commit.sha)&&/^[a-f0-9]{40}$/.test(commit.commit?.tree?.sha),"SOURCE_HTTP","Invalid GitHub commit identity");
                const tree=await api("/git/trees/"+commit.commit.tree.sha+"?recursive=1");requireValue(Array.isArray(tree.tree)&&!tree.truncated,"INCOMPLETE_SOURCE","GitHub tree is truncated; choose a smaller repository or local export");let matched=0;
                for(const entry of tree.tree){if(entry.type!=="blob"||!wanted(entry.path))continue;if(entry.mode==="120000"||excluded.test(entry.path)||!extensions.test(entry.path)||!/\.(md|markdown|txt)$/i.test(entry.path)){skipped.push({source:repo+"/"+entry.path,reason:"unsupported or excluded GitHub document"});continue;}matched++;requireValue(entry.size<=1900*1024&&/^[a-f0-9]{40}$/.test(entry.sha),"FILE_LIMIT","GitHub document exceeds source limit");const blob=await api("/git/blobs/"+entry.sha,3*1024*1024);requireValue(blob.encoding==="base64"&&typeof blob.content==="string","SOURCE_HTTP","Expected a GitHub text blob");const data=Buffer.from(blob.content,"base64");requireValue(data.length===entry.size,"SOURCE_CHANGED","GitHub blob length mismatch");add(decode(data),{type:"github",repository:repo,ref,commit:commit.sha,blob:entry.sha,url:`https://github.com/${repo}/blob/${commit.sha}/${entry.path}`,originalPath:entry.path,title:repo+" · "+entry.path+" · "+ref},data,"github-document");}
                if(!matched)gaps.push("No documents matched "+repo+" @ "+ref);
            }
            if(source.releases!==false){
                const releases:any[]=[];let truncated=false;
                for(let page=1;page<=5;page++){const list=await api(`/releases?per_page=100&page=${page}`);requireValue(Array.isArray(list),"SOURCE_HTTP","Invalid GitHub release list");releases.push(...list.filter(r=>!r.draft));if(list.length<100)break;if(page===5)truncated=true;}
                if(truncated)gaps.push(repo+": release history exceeds 500 entries; older releases remain unknown");
                const text="# Published release inventory\n\nThis is the published release list observed at collection time. Stable and prerelease entries remain distinct. It does not assert a permanent latest version.\n\n"+releases.map(r=>`## ${r.tag_name}\n\nURL: ${r.html_url}\nPublished: ${r.published_at??"unknown"}\nPrerelease: ${r.prerelease===true}\nTarget ref: ${r.target_commitish??"unknown"}\n\n${r.body??""}`).join("\n\n");
                add(text,{type:"github",repository:repo,url:`https://github.com/${repo}/releases`,originalPath:"{published-releases}",title:repo+" · releases"},Buffer.from(text),"github-releases");
            }
        }
    }
    materials.sort((a,b)=>a.path.localeCompare(b.path));requireValue(materials.length>0,"EMPTY_SCOPE","No usable documents were collected; inspect formats and scope");
    return {manifest,materials,skipped,gaps,fingerprint:sha256(canonical({manifest,sources:materials.map(s=>[s.path,s.revision])}))};
}

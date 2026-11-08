import { parseYamlFields, splitFrontmatter } from "../src/parsers/frontmatter-parser";
import type { SourceFile } from "./types";
const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
const stop = new Set(["的", "了", "和", "与", "在", "是", "一个", "如何", "怎么", "怎样", "以后", "之后", "应该", "什么", "是否", "吗", "呢", "是不是", "现在", "已经", "就", "我", "我的", "我们", "这个", "这些", "里面", "里", "到底", "哪些", "只要", "说明", "请问", "可以", "能", "还有", "知道", "能否", "有没有", "请", "the", "a", "an", "of", "to", "is"]);
export function words(text: string): string[] {
    const result:string[]=[];
    for(const part of segmenter.segment(text.toLowerCase()))if(part.isWordLike&&!stop.has(part.segment))result.push(part.segment);
    return result;
}
const strings=(a:unknown)=>Array.isArray(a)?a.filter((s):s is string=>typeof s==="string"):[];
const text=(v:unknown)=>typeof v==="string"?v:"";
const rows=(v:unknown):Record<string,unknown>[]=>Array.isArray(v)?v.filter((s):s is Record<string,unknown>=>!!s&&typeof s==="object"&&!Array.isArray(s)):[];
interface ParsedSource {revision:string;fields:Record<string,unknown>;block:ReturnType<typeof splitFrontmatter>;body:string;lines:string[];offset:number}
interface PreparedDocument {revision:string;identity:string;title:string;scope:string;text:string;lower:string;body:string;block:ReturnType<typeof splitFrontmatter>;aliases:string;metadata:string;relatedText:string;evidenceFor:string;counts:Map<string,number>;length:number;source:ParsedSource}
/** Per-workspace, revision-bound derived data. Source text and object identity remain authoritative. */
export class RetrievalCache {
    private entries=new Map<string,PreparedDocument>();
    private parsed=new Map<string,ParsedSource>();
    retain(paths:ReadonlySet<string>){for(const key of this.entries.keys())if(!paths.has(key.slice(0,key.indexOf("\0"))))this.entries.delete(key);for(const key of this.parsed.keys())if(!paths.has(key))this.parsed.delete(key);}
    source(file:SourceFile){const old=this.parsed.get(file.path);if(old?.revision===file.revision)return old;const block=splitFrontmatter(file.markdown),fields=block?parseYamlFields(block.text,file.path).fields:{};const value={revision:file.revision,fields,block,body:file.markdown.slice(block?.end??0),lines:file.markdown.split(/\r\n|\r|\n/),offset:block?file.markdown.slice(0,block.end).split(/\r\n|\r|\n/).length-1:0};this.parsed.set(file.path,value);return value;}
    prepare(d:SearchDocument,scope:string){
        const key=d.file.path+"\0"+scope,old=this.entries.get(key);
        if(old?.revision===d.file.revision&&old.identity===(d.id??"")&&old.title===d.title&&old.relatedText===(d.relatedText??"")&&old.evidenceFor===(d.evidenceFor??""))return old;
        const source=this.source(d.file),{block,fields,body}=source;
        const aliases=Array.isArray(fields.aliases)?fields.aliases.filter(a=>typeof a==="string").join(" "):typeof fields.aliases==="string"?fields.aliases:"";
        const tags=strings(fields.tags).join(" "),metadata=[text(fields.rd_material_type),text(fields.rd_scope),text(fields.rd_attribution),...rows(fields.rd_relation_notes).flatMap(n=>[text(n.reason),text(n.scope)]),...rows(fields.rd_relation_candidates).flatMap(n=>["候选 待确认",text(n.targetTitle),text(n.reason),text(n.acceptance)])].join("\n"),relatedText=d.relatedText??"";
        const searchable=scope==="title"?d.title:scope==="body"?body:[d.id,d.title,aliases,tags,body,metadata,relatedText].join("\n"),counts=new Map<string,number>();
        let length=0;for(const w of words(searchable)){counts.set(w,(counts.get(w)??0)+1);length++;}
        const next={revision:d.file.revision,identity:d.id??"",title:d.title,scope,text:searchable,lower:searchable.toLowerCase(),body,block,aliases,metadata,relatedText,evidenceFor:d.evidenceFor??"",counts,length,source};this.entries.set(key,next);return next;
    }
}
export interface SearchDocument {
    file: SourceFile;
    id: string | null;
    title: string;
    kind: string | null;
    status: string | null;
    /** Authored relation endpoints and source-citation owners; never inferred relations. */
    relatedText?:string;
    evidenceFor?:string;
}
/** Lexical relevance only. Authored aliases are searchable; no invented synonyms or truth score. */
export function rank(documents: SearchDocument[], query: string, scope: string, cache=new RetrievalCache()) {
    // Pasting a declared id is identity lookup, not an OR query over its date/number fragments.
    if (scope === "all" && (documents.some(d => d.id?.toLowerCase() === query.toLowerCase()) || /^ko-\d{8}-\d+$/i.test(query))) {
        documents = documents.filter(d => d.id?.toLowerCase() === query.toLowerCase());
    }
    const phrase = query.toLowerCase(), terms = [...new Set(words(query))];
    if (!terms.length)
        return [];
    const docs = documents.map(d => ({...cache.prepare(d,scope),d}));
    const avg = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1) || 1;
    const df = new Map(terms.map(t => [t, docs.filter(d => d.counts.has(t) || d.lower.includes(t)).length]));
    return docs.flatMap(doc => {
        const exact = doc.d.id?.toLowerCase() === phrase, lower = doc.lower;
        const matched = terms.filter(t => doc.counts.has(t) || lower.includes(t));
        const coverage=matched.length/terms.length;
        const named=matched.some(t=>(doc.d.title.toLowerCase().includes(t)||doc.aliases.toLowerCase().includes(t)||doc.relatedText.toLowerCase().includes(t))&&(df.get(t)??0)<=Math.max(2,docs.length*.18)&&t.length>=2);
        const symbol=matched.some(t=>/[_-]/.test(t)&&t.length>=5&&(df.get(t)??0)<=Math.max(2,docs.length*.18));
        if (!exact && coverage < (terms.length <= 2 ? 1 : .6)&&!(terms.length>2&&(symbol||named&&matched.length>=2)))
            return [];
        let score = 0;
        for (const t of matched) {
            const f = doc.counts.get(t) ?? .5;
            score += Math.log(1 + (docs.length - (df.get(t) ?? 0) + .5) / ((df.get(t) ?? 0) + .5)) * f * 2.2 / (f + 1.2 * (.25 + .75 * doc.length / avg));
        }
        if (exact)
            score += 1000;
        if (scope !== "body") {
            if (doc.d.title.toLowerCase() === phrase)
                score += 80;
            else if (doc.d.title.toLowerCase().includes(phrase))
                score += 35;
            score += terms.filter(t => doc.d.title.toLowerCase().includes(t)).length * 5;
            if (doc.aliases.toLowerCase().includes(phrase))
                score += 30;
            score+=terms.filter(t=>doc.aliases.toLowerCase().includes(t)).length*3;
        }
        if (lower.includes(phrase))
            score += 4;
        if(scope==="all"){
            score+=query.split(/\s+/).filter(p=>p.length>=4&&doc.metadata.toLowerCase().includes(p.toLowerCase())).length*8;
            const argumentTerms=terms.filter(t=>doc.evidenceFor.toLowerCase().includes(t));
            if(/支持|反驳|依据|证据/.test(query)&&argumentTerms.length>=2)score+=8+argumentTerms.length*3;
        }
        score*=.5+.5*coverage;
        // Reports help navigation; direct material and evidence cards remain easier to find.
        if(scope==="all"&&doc.source.fields.rd_review===true)score*=.65;
        if(scope==="all"&&doc.source.fields.rd_navigation===true)score*=.75;
        // A modest current-version preference; historical versions remain retrievable and explicitly labelled.
        if (["archived", "superseded"].includes(doc.d.status ?? ""))
            score *= .65;
        const {lines,offset}=doc.source;
        let lineIndex = offset, best = -1;
        for (let i = offset; i < lines.length; i++) {
            const n = terms.filter(t => lines[i].toLowerCase().includes(t)).length;
            if (n > best) {
                best = n;
                lineIndex = i;
            }
        }
        return [{ ...doc.d, score, line: lineIndex + 1, excerpt: lines[lineIndex]?.slice(0, 300) ?? doc.d.title, match:{coverage:Number(coverage.toFixed(3)),partial:coverage<1,matchedTerms:matched,unmatchedTerms:terms.filter(t=>!matched.includes(t)),viaDeclaredContext:scope==="all"&&matched.some(t=>doc.relatedText.toLowerCase().includes(t)),candidateCount:rows(doc.source.fields.rd_relation_candidates).filter(c=>c.state==="candidate").length} }];
    }).sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));
}

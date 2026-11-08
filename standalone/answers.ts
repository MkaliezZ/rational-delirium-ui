import type { FolderKnowledge } from "./knowledge";
import { canonical, sha256 } from "./files";
import { requireValue } from "./errors";
import {coverageForQuestions,checkCoverage,type CoverageQuestion} from "./coverage";

export interface AgentQuestion extends CoverageQuestion {}
export interface AgentAnswer {
    id:string; claim:string; answer:string; conclusion:"supported"|"refuted"|"bounded"|"unknown";
    citations:any[]; relations:any[]; candidateRelations:any[]; uncertainties:string[];sourceReview?:any;
}
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const nonempty=(v:unknown,max=24000):v is string=>typeof v==="string"&&!!v.trim()&&v.length<=max;
/** Delivery is source alignment, never a factual or semantic truth certificate. */
export function prepareAnswer(kb:FolderKnowledge,args:Record<string,unknown>){
    requireValue(Array.isArray(args.answers)&&args.answers.length>0&&args.answers.length<=32,"INVALID_ARGUMENT","Use 1–32 answer drafts");
    requireValue(Buffer.byteLength(JSON.stringify(args))<=2*1024*1024,"FILE_LIMIT","Answer batch exceeds 2 MiB");
    if(args.revision!==undefined)requireValue(args.revision===kb.revision,"STALE_WORKSPACE","Recheck against the current knowledge revision");
    const expected=args.expectedIds;
    requireValue(expected===undefined||Array.isArray(expected)&&expected.length>0&&expected.length<=32&&expected.every(v=>nonempty(v,160))&&new Set(expected).size===expected.length,"INVALID_ARGUMENT","expectedIds must be unique ids");
    const ids=args.answers.map((a:any)=>a?.id),globalIssues:any[]=[];
    if(new Set(ids).size!==ids.length)globalIssues.push({code:"DUPLICATE_ANSWER_ID"});
    if(expected&&(expected.some(id=>!ids.includes(id))||ids.some(id=>!expected.includes(id))))globalIssues.push({code:"ANSWER_SCOPE_MISMATCH",expectedIds:expected,receivedIds:ids});
    const questions=args.questions;
    requireValue(Array.isArray(questions)&&questions.length>0&&questions.length<=32&&questions.every(q=>q&&nonempty(q.id,160)&&nonempty(q.question,4000)&&(q.mode===undefined||["current","historical","general"].includes(q.mode)))&&new Set(questions.map(q=>q.id)).size===questions.length,"INVALID_ARGUMENT","Original questions are required, with unique ids, text and optional current/historical/general mode");
    if(questions.some(q=>!ids.includes(q.id))||ids.some(id=>!questions.some(q=>q.id===id)))globalIssues.push({code:"QUESTION_SCOPE_MISMATCH"});
    const coveragePlans=coverageForQuestions(kb,questions as AgentQuestion[]);
    const items=args.answers.map((value:any,index:number)=>{
        const issues:any[]=[],a=object(value)?value:{};
        const issue=(code:string,field:string,details?:unknown)=>issues.push({code,field,...(details===undefined?{}:{details})});
        for(const field of ["id","claim","answer"])if(!nonempty(a[field],field==="id"?160:field==="claim"?2000:24000))issue("INVALID_TEXT",field);
        if(!["supported","refuted","bounded","unknown"].includes(a.conclusion))issue("INVALID_CONCLUSION","conclusion");
        for(const field of ["citations","relations","candidateRelations","uncertainties"])if(!Array.isArray(a[field])||a[field].length>(field==="uncertainties"?24:64))issue("INVALID_ARRAY",field);
        const citations=Array.isArray(a.citations)&&a.citations.length<=64?a.citations:[],relations=Array.isArray(a.relations)&&a.relations.length<=64?a.relations:[],candidates=Array.isArray(a.candidateRelations)&&a.candidateRelations.length<=64?a.candidateRelations:[],uncertainties=Array.isArray(a.uncertainties)&&a.uncertainties.length<=24?a.uncertainties:[];
        if(uncertainties.some(v=>!nonempty(v,2000)))issue("INVALID_UNCERTAINTY","uncertainties");
        if(!citations.length&&(a.conclusion!=="unknown"||!uncertainties.length))issue("EVIDENCE_REQUIRED","citations");
        const citationChecks=citations.length?kb.checkCitations({citations}):{allValid:true,checked:0,checks:[]};
        for(const c of citationChecks.checks)if(!c.valid)issue(c.code,"citations",c);
        const relationChecks=kb.checkRelations({relations});
        for(const r of relationChecks.checks)if(!r.valid)issue(r.code,"relations",r);
        const plan=coveragePlans.find(p=>p.id===a.id),coverage=plan?checkCoverage(plan,a):null;
        if(coverage)issues.push(...coverage.issues);
        const normalizedCandidates:any[]=[];
        for(let i=0;i<candidates.length;i++){
            const c=candidates[i];
            if(!object(c)||c.state!=="candidate"||!nonempty(c.missingEvidence,4000)){issue("INVALID_CANDIDATE","candidateRelations",{index:i});continue;}
            const r=kb.checkRelations({relations:[c]}).checks[0] as any;
            if(r.code!=="CANDIDATE_ONLY"){issue("NOT_DECLARED_CANDIDATE","candidateRelations",{index:i,check:r});continue;}
            normalizedCandidates.push({source:r.source.path,predicate:c.predicate,target:r.target.path,state:"candidate",missingEvidence:nonempty(r.candidate?.acceptance,4000)?r.candidate.acceptance:c.missingEvidence});
        }
        const normalized:AgentAnswer={id:a.id,claim:a.claim,answer:coverage?.unknown?"当前来源或版本覆盖不足，不能确认当前状态。":citations.length?a.answer:"当前没有通过核对的原文依据，暂保留未知。",conclusion:coverage?.unknown?"unknown":a.conclusion,citations:citations.map(c=>({path:c?.path,revision:c?.revision,startLine:c?.startLine,endLine:c?.endLine,quote:c?.quote})),relations:relationChecks.checks.filter(r=>r.valid).map((r:any)=>({source:r.source.id??r.source.path,predicate:r.predicate,target:r.target.id??r.target.path})),candidateRelations:normalizedCandidates,uncertainties:[...uncertainties],...(coverage?{sourceReview:coverage.normalized}:{})};
        return {index,id:typeof a.id==="string"?a.id:null,valid:issues.length===0,alignment:coverage?.unknown?"coverage_unknown":citations.length?"cited":"uncertainty_only",issues,citationChecks,relationChecks,...(coverage?{coverageChecks:coverage}:{}),...(issues.length?{}:{answer:normalized})};
    });
    const ready=!globalIssues.length&&items.every(i=>i.valid),answers=items.filter(i=>i.valid).map(i=>i.answer!);
    const payload={schema:"rd-agent-answer/1",revision:kb.revision,answers};
    return {status:ready?"ready":"needs_revision",revision:kb.revision,globalIssues,items,
        delivery:ready?{...payload,receipt:{id:"A-"+sha256(canonical(payload)),status:items.every(i=>i.alignment==="cited")?"aligned":"uncertain",citationsChecked:answers.reduce((n,a)=>n+a.citations.length,0),formalRelationsChecked:answers.reduce((n,a)=>n+a.relations.length,0),candidatesKeptSeparate:answers.reduce((n,a)=>n+a.candidateRelations.length,0),sourceCoverageChecked:coveragePlans.length,meaning:"Source alignment, declared relations and saved-record coverage only; current remote state and semantic truth remain unverified"}}:null,
        meaning:"Only delivery is consumable. Failed draft text is withheld; correct using feedback or deliver explicit unknown. No source, graph or candidate state is modified."};
}

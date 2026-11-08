import type { KnowledgeService } from "./service";
import type { AgentQuestion } from "./answers";
import { requireValue } from "./errors";
import {isCurrentQuestion} from "./coverage";

export const AGENT_READ_COMMANDS=["status","list","search","get","relations","context","read_source","check_citations","check_relations","source_coverage","prepare_answer"] as const;
export interface AgentDraftRequest {questions:AgentQuestion[];round:number;feedback:unknown;coveragePlans:any[]}
export interface AgentFlowOptions {maxRepairs?:number;onReview?:(event:any)=>void|Promise<void>}
/** The host validates every generated draft; a model's own validation claim is ignored. */
export async function runAgentTask(service:KnowledgeService,questions:AgentQuestion[],generate:(request:AgentDraftRequest)=>Promise<unknown>,options:AgentFlowOptions={}){
    requireValue(Array.isArray(questions)&&questions.length>0&&questions.length<=32&&questions.every(q=>q&&typeof q.id==="string"&&q.id.trim()&&q.id.length<=160&&typeof q.question==="string"&&q.question.trim()&&q.question.length<=4000&&(q.mode===undefined||["current","historical","general"].includes(q.mode)))&&new Set(questions.map(q=>q.id)).size===questions.length,"INVALID_ARGUMENT","Use unique question ids, nonempty questions and a valid optional mode");
    questions=structuredClone(questions);
    const maxRepairs=options.maxRepairs??2;requireValue(Number.isInteger(maxRepairs)&&maxRepairs>=0&&maxRepairs<=3,"INVALID_ARGUMENT","Use 0–3 repair rounds");
    const expectedIds=questions.map(q=>q.id),history:any[]=[];let feedback:unknown=null,last:any=null;
    for(let round=0;round<=maxRepairs;round++){
        let review:any;
        try{
            const coveragePlans=await Promise.all(questions.filter(isCurrentQuestion).map(async q=>({id:q.id,...await service.execute("source_coverage",{query:q.question})})));
            let draft=await generate({questions:structuredClone(questions),round,feedback,coveragePlans});
            if(typeof draft==="string"){const text=draft.trim().replace(/^```(?:json)?\s*\n([\s\S]*)\n```$/,"$1");draft=JSON.parse(text);}
            review=await service.execute("prepare_answer",{answers:(draft as any)?.answers,expectedIds,questions});
        }catch(e){review={status:"needs_revision",delivery:null,globalIssues:[{code:"DRAFT_ERROR",message:e instanceof Error?e.message:String(e)}],items:[]};}
        await options.onReview?.({round,review});history.push({round,status:review.status,globalIssues:review.globalIssues,items:review.items.map((i:any)=>({id:i.id,valid:i.valid,issues:i.issues}))});
        if(review.delivery)return {outcome:review.delivery.receipt.status==="uncertain"?"uncertain":"delivered",attempts:round+1,repairRounds:round,fallbackIds:[],history,delivery:review.delivery};
        last=review;feedback={globalIssues:review.globalIssues,items:review.items.map((i:any)=>({id:i.id,valid:i.valid,issues:i.issues})),instruction:"Revise the complete batch. Do not drop questions. Fix source errors or mark unknown; formal relations require exact identity and declaration. Candidates remain separate. Never claim validation from prose alone."};
    }
    const fallbackIds:string[]=[];
    const answers=questions.map(q=>{
        const candidates=(last?.items??[]).filter((i:any)=>i.id===q.id&&i.valid);
        if(candidates.length===1&&!last?.globalIssues?.some((i:any)=>i.code==="DUPLICATE_ANSWER_ID"))return candidates[0].answer;
        fallbackIds.push(q.id);const issues=(last?.items??[]).filter((i:any)=>i.id===q.id).flatMap((i:any)=>i.issues.map((v:any)=>v.code));
        return {id:q.id,claim:q.question,answer:"当前材料或结构化结果未能通过核对，暂不能给出可靠结论。",conclusion:"unknown",citations:[],relations:[],candidateRelations:[],uncertainties:["需要补充或重新核对来源、版本、引用范围及关系状态。",...(issues.length?["未通过项目："+[...new Set(issues)].join(", ")]:["Agent 未交付可核对的完整草稿。"])],...(isCurrentQuestion(q)?{sourceReview:{status:"unknown",currentVersions:[],historicalVersions:[],limits:["来源与版本覆盖未完成。"]}}:{})};
    });
    const checked=await service.execute("prepare_answer",{answers,expectedIds,questions});
    requireValue(checked.delivery,"DELIVERY_BLOCKED","Fallback did not pass final validation");await options.onReview?.({round:"fallback",review:checked});
    return {outcome:"uncertain",attempts:maxRepairs+1,repairRounds:maxRepairs,fallbackIds,history,delivery:checked.delivery};
}

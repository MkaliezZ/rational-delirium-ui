import {build} from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {pathToFileURL} from 'node:url';
import {stringify} from 'yaml';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'), dir=path.join(root,'.tmp/eval');
fs.mkdirSync(dir,{recursive:true});
const replay=process.argv.includes('--replay-baseline'), baseline=process.argv.includes('--baseline')||replay, name=baseline?'baseline':'current';
const bundle=path.join(dir,name+'.mjs');
if (baseline && !replay && fs.existsSync(path.join(root,'docs/validation/standalone/baseline-eval.json'))) throw Error('Measured baseline is immutable.');
await build({stdin:{contents:baseline?'export {FolderKnowledge,RootFiles} from "./eval/baselines/knowledge-v0.mjs";':'export {FolderKnowledge} from "./standalone/knowledge"; export {RootFiles} from "./standalone/files";',resolveDir:root},bundle:true,platform:'node',format:'esm',target:'node24',banner:{js:'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);'},outfile:bundle,logLevel:'silent'});
const corpus=JSON.parse(fs.readFileSync(path.join(root,'eval/corpus.json'),'utf8'));
const vault=fs.mkdtempSync(path.join(dir,'corpus-'));
for (const f of corpus.files) {
  const fields=f.note?null:f.legacy?{type:'evidence',id:f.id,status:'verified',...f.extra}:{object_id:f.id,kind:'concept',status:f.status??'active',title:f.title,...(f.aliases?{aliases:f.aliases}:{}),...(f.tags?{tags:f.tags}:{}),...f.extra};
  fs.mkdirSync(path.dirname(path.join(vault,f.path)),{recursive:true});
  fs.writeFileSync(path.join(vault,f.path),fields?'---\n'+stringify(fields)+'---\n'+f.body:f.body);
}
const {FolderKnowledge,RootFiles}=await import(pathToFileURL(bundle).href);
const kb=new FolderKnowledge(new RootFiles(vault)); const start=performance.now(); await kb.refresh();
const queries=corpus.queries.map(q=>{const t=performance.now();const result=kb.search({query:q.query,includeNotes:true,limit:5}); const hits=result.hits.map(h=>h.path), relevant=q.relevant; return {...q,hits,recallAt5:relevant.length?relevant.filter(p=>hits.includes(p)).length/relevant.length:Number(hits.length===0),reciprocalRank:relevant.length?(hits.findIndex(p=>relevant.includes(p))<0?0:1/(hits.findIndex(p=>relevant.includes(p))+1)):Number(hits.length===0),ms:performance.now()-t};});
const id='ko-20261107-0142', context=kb.context({id,depth:1,budget:12000});
const checks={seedIncluded:context.objects.some(o=>o.id===id),supportIncluded:context.objects.some(o=>o.id==='ko-20261107-0087'),contradictionIncluded:context.objects.some(o=>o.id==='ko-20261107-0092'),unresolvedVisible:context.unresolved.length>0,encodedBudget:JSON.stringify(context).length<=12000,legacyIdentity:kb.get({id:'E-LEGACY-7'}).path==='EVIDENCE/legacy.md'};
const positive=queries.filter(q=>q.relevant.length), negative=queries.filter(q=>!q.relevant.length);
const mean=(values)=>values.reduce((s,n)=>s+n,0)/(values.length||1);
const report={schema:'rd-task-eval-result/1',run:name,corpus:'eval/corpus.json',queryCount:queries.length,positiveQueryCount:positive.length,expectedEmptyQueryCount:negative.length,corpusSha256:createHash('sha256').update(JSON.stringify(corpus)).digest('hex'),baselineAlgorithmSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'eval/baselines/knowledge-v0.mjs'))).digest('hex'),recallAt5:mean(positive.map(q=>q.recallAt5)),mrrAt5:mean(positive.map(q=>q.reciprocalRank)),strictPrecisionAt5:mean(positive.map(q=>q.hits.length?q.hits.filter(p=>q.relevant.includes(p)).length/q.hits.length:0)),noResultAccuracy:mean(negative.map(q=>Number(q.hits.length===0))),checks,queries,elapsedMs:performance.now()-start,limitations:'Synthetic relevance labels; deterministic retrieval/context evaluation, not real-user acceptance or model answer faithfulness. Baseline is the pre-eval standalone prototype, not a native Obsidian search comparison.'};
fs.mkdirSync(path.join(root,'docs/validation/standalone'),{recursive:true});
const destination=process.argv.includes('--record')?path.join(root,'docs/validation/standalone',name+'-eval.json'):path.join(dir,name+'-result.json');
fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
kb.dispose(); console.log(JSON.stringify({run:name,recallAt5:report.recallAt5,mrrAt5:report.mrrAt5,checks,misses:queries.filter(q=>q.recallAt5<1||q.reciprocalRank<1).map(q=>q.query)},null,2));

if(!baseline&&(report.recallAt5<.95||report.mrrAt5<.9||Object.values(checks).some(v=>!v)))process.exitCode=1;

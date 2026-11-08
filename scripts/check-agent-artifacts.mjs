import * as fs from 'node:fs';
import * as path from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist-agent'),version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const dir=fs.mkdtempSync(path.join(tmpdir(),'rd-portable-'));
try{
  const app=path.join(dir,'app');fs.cpSync(dist,app,{recursive:true});
  const run=(...args)=>{const result=spawnSync(process.execPath,[path.join(app,'rd.mjs'),...args],{cwd:dir,env:{...process.env,NODE_PATH:''},encoding:'utf8'});if(result.status!==0)throw Error(result.stderr+'\n'+result.stdout);return JSON.parse(result.stdout);};
  if(run('help').version!==version)throw Error('Runtime version mismatch');
  const knowledge=path.join(dir,'knowledge');run('demo','--root',knowledge,'--key',path.join(dir,'operator.pem'));
  const status=run('status','--root',knowledge);if(status.data.counts.objects!==15)throw Error('Portable index count mismatch');
  const board=run('boards','--root',knowledge);if(['case','evidence','hypothesis','loop'].some(role=>!board.data.counts[role]))throw Error('Four-role portable board missing');
  const found=run('search','--root',knowledge,'--query','原始来源旧版本相反证据');if(found.data.hits[0]?.id!=='ko-20261107-0142')throw Error('Portable search failed');
  const draft={id:'Q1',claim:'A local check proves actual outcomes',answer:'Unchecked confident body',conclusion:'supported',citations:[],relations:[],candidateRelations:[],uncertainties:[]};
  const blocked=run('prepare_answer','--root',knowledge,'--json',JSON.stringify({answers:[draft],expectedIds:['Q1'],questions:[{id:'Q1',question:'Are real outcomes established?'}]}));if(blocked.data.delivery!==null||blocked.data.status!=='needs_revision')throw Error('Portable delivery gate failed closed');
  const binding=path.join(dir,'reader.json');fs.writeFileSync(binding,JSON.stringify({root:knowledge,trace:path.join(dir,'read.jsonl'),maxCalls:5}));
  const tools=spawnSync(process.execPath,[path.join(app,'agent-read.mjs'),'tools','--binding',binding],{cwd:dir,env:{...process.env,NODE_PATH:''},encoding:'utf8',windowsHide:true});
  const catalog=JSON.parse(tools.stdout);if(tools.status!==0||!catalog.tools.some(t=>t.name==='rd_prepare_answer')||catalog.tools.some(t=>t.annotations.readOnlyHint!==true))throw Error('Portable read-only Agent tools failed');
  for(const name of ['status','rd_status']){const read=spawnSync(process.execPath,[path.join(app,'agent-read.mjs'),name,'--binding',binding],{cwd:dir,encoding:'utf8',windowsHide:true});if(read.status!==0||JSON.parse(read.stdout).counts.objects!==15)throw Error('Advertised MCP tool name not accepted by reader');}
  const denied=spawnSync(process.execPath,[path.join(app,'agent-read.mjs'),'rd_save','--binding',binding],{cwd:dir,encoding:'utf8',windowsHide:true});if(denied.status===0||JSON.parse(denied.stdout).error.code!=='READ_ONLY')throw Error('Reader alias enabled a write command');
  const questions=path.join(dir,'questions.json');fs.writeFileSync(questions,JSON.stringify([{id:'Q1',question:'Are real outcomes established?'}]));
  // Deterministic provider stub tests host rejection only; no real model score is claimed.
  const provider=path.join(dir,'fake-provider.mjs');fs.writeFileSync(provider,'process.stdin.resume();process.stdin.on("end",()=>{process.stdout.write(JSON.stringify({type:"final",text:'+JSON.stringify(JSON.stringify({answers:[draft]}))+'})+"\\n");});');
  const output=path.join(dir,'checked-run'),flow=spawnSync(process.execPath,[path.join(app,'agent-run.mjs'),'--root',knowledge,'--questions',questions,'--output',output,'--dsh-entry',provider,'--max-repairs','0'],{cwd:dir,env:{...process.env,NODE_PATH:''},encoding:'utf8',windowsHide:true});
  if(flow.status!==0)throw Error('Portable Agent host failed: '+flow.stdout+' '+flow.stderr);
  const delivered=JSON.parse(fs.readFileSync(path.join(output,'delivery.json'),'utf8')),record=JSON.parse(fs.readFileSync(path.join(output,'run.json'),'utf8'));
  if(record.outcome!=='uncertain'||record.fallbackIds[0]!=='Q1'||delivered.answers[0].conclusion!=='unknown'||JSON.stringify(delivered).includes('Unchecked confident body'))throw Error('Portable Agent fallback leaked unchecked draft');
  const items=[];const walk=(dir,prefix='')=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name),relative=prefix+e.name;if(e.isDirectory())walk(p,relative+'/');else items.push({path:relative,bytes:fs.statSync(p).size,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')});}};walk(dist);
  fs.writeFileSync(path.join(root,`docs/validation/v${version}/artifacts.json`),JSON.stringify({version,portableSmoke:'passed: isolated copy with no runtime node_modules',files:items},null,2)+'\n');
  console.log('AGENT_ARTIFACT_CHECK=PASS; isolated CLI, read-only Agent tools and mandatory delivery rejection/fallback (provider stub), '+items.length+' runtime assets');
}finally{const expected=path.resolve(tmpdir())+path.sep+'rd-portable-';if(!path.resolve(dir).startsWith(expected))throw Error('Unsafe portable-test cleanup');fs.rmSync(dir,{recursive:true,force:true});}

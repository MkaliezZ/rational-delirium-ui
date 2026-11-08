import * as fs from 'node:fs';
import * as path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {RUNTIME_FILES,AGENT_RUNTIME_FILES} from './runtime-files.mjs';

const [archive,plugin]=process.argv.slice(2);
assert(archive&&plugin,'Use check-release-package.mjs <standalone.zip> <plugin.zip>');
const hash=data=>createHash('sha256').update(data).digest('hex');
const checksums=fs.readFileSync(path.join(path.dirname(archive),'SHA256SUMS.txt'),'utf8');
for(const file of [archive,plugin])assert(checksums.split(/\r?\n/).includes(hash(fs.readFileSync(file))+'  '+path.basename(file)),'Archive checksum mismatch');
let expanded=0;
const entries=unzipSync(fs.readFileSync(archive),{filter:file=>{expanded+=file.originalSize;assert(file.originalSize<=16*1024*1024&&expanded<=128*1024*1024,'Release exceeds inspection limits');return true;}});
const names=Object.keys(entries),rootName=names[0]?.split('/')[0];
assert(rootName&&names.every(name=>name.startsWith(rootName+'/')&&!name.includes('\\')&&!name.includes('\0')&&!name.split('/').some(p=>p==='..'||p==='.'||p.includes(':'))),'Unsafe archive path');
assert(!names.some(n=>/(?:^|\/)(?:node_modules|\.git|\.rd|\.env|reader\.json|read-calls\.jsonl|delivery\.json|session[^/]*\.jsonl)(?:\/|$)/i.test(n)),'Private/development material in archive');
const manifest=JSON.parse(new TextDecoder().decode(entries[rootName+'/build-manifest.json']));
assert.match(manifest.sourceCommit,/^[a-f0-9]{40}$/);
assert.equal(new Set(manifest.files.map(f=>f.path)).size,manifest.files.length);
assert.equal(names.length,manifest.files.length+1);
for(const f of manifest.files){const bytes=entries[rootName+'/'+f.path];assert(bytes,'Manifest file missing: '+f.path);assert.equal(bytes.length,f.bytes);assert.equal(hash(bytes),f.sha256);}
for(const name of [...AGENT_RUNTIME_FILES.map(p=>'dist-agent/'+p),'README.md','README_zh-CN.md','QUICKSTART.md','Start-RD.cmd','docs/validation/v'+manifest.version+'/release.md','docs/agent-delivery.md'])assert(entries[rootName+'/'+name],'Required release file missing: '+name);
const pluginEntries=unzipSync(fs.readFileSync(plugin));
assert.deepEqual(Object.keys(pluginEntries).sort(),RUNTIME_FILES.map(f=>'rational-delirium/'+f).sort());
assert.equal(JSON.parse(new TextDecoder().decode(pluginEntries['rational-delirium/manifest.json'])).version,manifest.version);
const temp=fs.mkdtempSync(path.join(tmpdir(),'rd-release-check-'));
let service,server;
try{
  for(const [name,bytes]of Object.entries(entries)){const target=path.resolve(temp,name);assert(target.startsWith(path.resolve(temp)+path.sep));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
  const runtime=path.join(temp,rootName,'dist-agent'),knowledge=path.join(temp,'synthetic-knowledge'),key=path.join(temp,'operator.pem');
  const cli=(...args)=>{const r=spawnSync(process.execPath,[path.join(runtime,'rd.mjs'),...args],{cwd:temp,env:{...process.env,NODE_PATH:''},encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr+r.stdout);return JSON.parse(r.stdout);};
  assert.equal(cli('help').version,manifest.version);
  cli('demo','--root',knowledge,'--key',key);
  assert.equal(cli('status','--root',knowledge,'--key',key).data.counts.objects,15);
  const api=await import(pathToFileURL(path.join(runtime,'index.mjs')).href);
  service=new api.KnowledgeService(knowledge,key);
  server=await api.startServer(service,{port:0,operator:false,assets:path.join(runtime,'web')});
  const html=await(await fetch(server.url)).text(),token=html.match(/name="rd-token" content="([a-f0-9]{64})"/)?.[1];assert(token);
  for(const asset of ['app.js','app.css','icons/books.svg']){const r=await fetch(server.url+'/'+asset);assert.equal(r.status,200);assert((await r.text()).length>20);}
  const call=async(command,args={})=>{const r=await(await fetch(server.url+'/api',{method:'POST',headers:{'content-type':'application/json','x-rd-token':token},body:JSON.stringify({command,args})})).json();assert(r.ok,JSON.stringify(r.error));return r.data;};
  assert.equal((await call('status')).readOnly,true);
  const covered=await call('source_coverage',{query:'unlisted example current version'});assert(covered.gaps.length);
  const answer={id:'Q1',claim:'A real outcome has been established',answer:'This unchecked confident body must be withdrawn.',conclusion:'unknown',citations:[],relations:[],candidateRelations:[],uncertainties:['No verified source was provided.']};
  const delivery=await call('prepare_answer',{answers:[answer],questions:[{id:'Q1',question:'Is the real outcome established?',mode:'general'}]});assert.equal(delivery.status,'ready');assert.equal(delivery.delivery.receipt.status,'uncertain');assert(!delivery.delivery.answers[0].answer.includes('unchecked confident body'));
  console.log(JSON.stringify({releasePackageCheck:'passed',version:manifest.version,sourceCommit:manifest.sourceCommit,files:names.length,checksums:true,manifestHashes:true,bilingualReadmes:true,pluginPackage:true,isolatedNodeRuntime:true,httpAssetsAndReadOnlyGate:true,scope:'Actual ZIP extraction and synthetic smoke checks; not a clean-machine installer, real Obsidian or new semantic model evaluation.'}));
}finally{
  if(server)await server.close();else if(service)await service.close();
  assert(path.resolve(temp).startsWith(path.resolve(tmpdir())+path.sep+'rd-release-check-'));
  fs.rmSync(temp,{recursive:true,force:true});
}

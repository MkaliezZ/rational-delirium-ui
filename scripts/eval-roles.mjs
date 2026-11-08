import * as fs from 'node:fs';
import * as path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..'),{KnowledgeService}=await import(pathToFileURL(path.join(root,'dist-agent/index.mjs')).href);
const corpus=JSON.parse(fs.readFileSync(path.join(root,'eval/roles-corpus.json'),'utf8')),dir=fs.mkdtempSync(path.join(tmpdir(),'rd-role-eval-'));
const service=new KnowledgeService(dir);let correct=0,tp=0,fp=0,fn=0,abstentionCorrect=0,unknown=0,sourceExact=0;const examples=[];
try{
  for(const e of corpus.examples){fs.writeFileSync(path.join(dir,e.id+'.md'),e.markdown);const actual=await service.execute('analyze',{path:e.id+'.md'}),predicted=[...new Set(actual.units.flatMap(u=>u.roles))].sort(),expected=[...e.roles].sort(),exact=JSON.stringify(predicted)===JSON.stringify(expected);if(exact)correct++;for(const r of predicted)e.roles.includes(r)?tp++:fp++;for(const r of expected)if(!predicted.includes(r))fn++;if(!expected.length){unknown++;if(!predicted.length)abstentionCorrect++;}const spans=actual.units.every(u=>u.quote===e.markdown.split(/\r\n|\r|\n/).slice(u.startLine-1,u.endLine).join('\n'));if(spans)sourceExact++;examples.push({id:e.id,expected,predicted,exact,sourceExact:spans});}
  const report={schema:'rd-role-eval-result/1',corpus:'eval/roles-corpus.json',method:'paragraph-rules/1',sampleCount:examples.length,exactMatch:correct/examples.length,rolePrecision:tp/(tp+fp),roleRecall:tp/(tp+fn),unknownAbstention:abstentionCorrect/unknown,sourceSpanAccuracy:sourceExact/examples.length,examples,limitations:corpus.description};
  fs.mkdirSync(path.join(root,'.tmp/eval'),{recursive:true});fs.writeFileSync(path.join(root,'.tmp/eval/roles-current.json'),JSON.stringify(report,null,2)+'\n');if(process.argv.includes('--record'))fs.writeFileSync(path.join(root,'docs/validation/v1.10.0/role-eval.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,examples:undefined},null,2));if(correct<examples.length||sourceExact<examples.length)process.exitCode=1;
}finally{await service.close();fs.rmSync(dir,{recursive:true,force:true});}

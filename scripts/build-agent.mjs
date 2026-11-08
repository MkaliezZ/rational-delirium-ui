import {build} from 'esbuild';
import {AGENT_ICONS} from './runtime-files.mjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist-agent');
fs.mkdirSync(path.join(out,'web/icons'),{recursive:true});
const common={bundle:true,platform:'node',format:'esm',target:'node24',banner:{js:'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);'},logLevel:'info'};
await build({...common,entryPoints:[path.join(root,'standalone/cli.ts')],outfile:path.join(out,'rd.mjs')});
await build({...common,stdin:{contents:'export {KnowledgeService} from "./standalone/service"; export {RootFiles,workspaceLock} from "./standalone/files"; export {initialize} from "./standalone/mutations"; export {startServer} from "./standalone/http"; export {runAgentTask} from "./standalone/agent-flow"; export {runIntake,intakePackets} from "./standalone/intake"; export {collectIntake} from "./standalone/intake-sources"; export {dshIntakeGenerator,intakePrompt} from "./standalone/intake-dsh";',resolveDir:root},outfile:path.join(out,'index.mjs')});
await build({entryPoints:[path.join(root,'web/app.ts')],outfile:path.join(out,'web/app.js'),bundle:true,platform:'browser',format:'esm',target:'es2022',logLevel:'info'});
for(const entry of ['agent-read','agent-run'])await build({...common,entryPoints:[path.join(root,'standalone',entry+'.ts')],outfile:path.join(out,entry+'.mjs')});
for(const file of ['index.html','app.css'])fs.copyFileSync(path.join(root,'web',file),path.join(out,'web',file));
const icons=AGENT_ICONS;
for(const icon of icons)fs.copyFileSync(path.join(root,'node_modules/@phosphor-icons/core/assets/regular',icon+'.svg'),path.join(out,'web/icons',icon+'.svg'));
fs.copyFileSync(path.join(root,'node_modules/@phosphor-icons/core/LICENSE'),path.join(out,'web/icons/LICENSE.txt'));
fs.copyFileSync(path.join(root,'scripts/Start-RD.cmd'),path.join(out,'Start-RD.cmd'));
fs.copyFileSync(path.join(root,'LICENSE'),path.join(out,'LICENSE'));
fs.copyFileSync(path.join(root,'.node-version'),path.join(out,'.node-version'));
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const notices=['Rational Delirium — third-party notices. Node itself is not distributed in this package.'];
for(const [relative,pkg] of Object.entries(lock.packages)){
  if(!relative||pkg.dev)continue;const location=path.join(root,relative);if(!fs.existsSync(location))continue;
  const license=fs.readdirSync(location).find(n=>/^licen[sc]e(?:\.(?:md|txt))?$/i.test(n));
  notices.push(`${relative} @ ${pkg.version} — ${pkg.license??'See upstream license'}`,license?fs.readFileSync(path.join(location,license),'utf8'):'License identifier above; see package metadata.');
}
fs.writeFileSync(path.join(out,'THIRD_PARTY_NOTICES.txt'),notices.join('\n\n')+'\n');
console.log('Independent runtime built: dist-agent/rd.mjs + web/ (Node 24+, no Obsidian/Python/runtime npm install).');

import * as fs from 'node:fs';
import * as path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {zipSync} from 'fflate';
import {AGENT_RUNTIME_FILES as RUNTIME_FILES} from './runtime-files.mjs';

const root=path.resolve(import.meta.dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const flags={};
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i];if(!['--output','--validation-log'].includes(key)||!process.argv[i+1])throw Error('Use --output <new directory> and optional --validation-log <file>');flags[key.slice(2)]=process.argv[i+1];}
const output=flags.output?path.resolve(flags.output):path.resolve(root,'../deliverables',`rational-delirium-${version}`);
const stage=path.join(output,`rational-delirium-${version}`);
const validation=flags['validation-log']?path.resolve(flags['validation-log']):path.join(root,`docs/validation/v${version}/full-validation.log`);
const pluginFiles=['main.js','manifest.json','styles.css','tokens-rational-archive.css'];
const content=['README.md','README_zh-CN.md','examples/intake-scope.json','docs/agent-intake.md','docs/standalone-knowledge.md','docs/agent-delivery.md','docs/agent-source-reading.md','docs/four-role-workspace.md','docs/validation/standalone','docs/design','design-qa.md','skills/rational-delirium-agent-skill.md','skills/legacy-obsidian-agent-skill-v1.7.1.md','eval','LICENSE','docs/architecture',`docs/validation/v${version}`];
// Fail before creating a partial delivery; the package never reads a private vault.
if(fs.existsSync(output))throw Error('Output already exists; preserve earlier deliveries and choose a new --output directory.');
for(const file of [...RUNTIME_FILES.map(f=>'dist-agent/'+f),...content,...pluginFiles.map(f=>'dist/'+f),validation])if(!fs.existsSync(path.resolve(root,file)))throw Error('Required package input missing: '+file);
const hash=data=>createHash('sha256').update(data).digest('hex');
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const generated=new Set([...pluginFiles.map(f=>'dist/'+f),`docs/validation/v${version}/artifacts.json`]);
const changed=execFileSync('git',['diff','--name-only','HEAD','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
if(changed.some(p=>!generated.has(p)))throw Error('Commit source changes before packaging so the manifest identifies the delivered source.');
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
let log=fs.readFileSync(validation,'utf8');
for(const value of new Set([root,root.replaceAll('\\','/'),root.replaceAll('\\','\\\\')]))log=log.split(value).join('<repository>');
if(/(?:[A-Z]:[/\\]+Users[/\\]+|F:[/\\]+Codex Workspace|knowledge-intake[/\\]|-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|(?:ghp_|github_pat_)[A-Za-z0-9_]{30,})/i.test(log))throw Error('Validation log needs privacy review before packaging.');
fs.mkdirSync(stage,{recursive:true});
const copy=(from,to=from)=>{if(fs.lstatSync(path.join(root,from)).isSymbolicLink())throw Error('Package inputs must not contain symlinks');fs.mkdirSync(path.dirname(path.join(stage,to)),{recursive:true});fs.copyFileSync(path.join(root,from),path.join(stage,to));};
for(const file of RUNTIME_FILES)copy('dist-agent/'+file);
for(const source of content){const included=tracked.filter(p=>p===source||p.startsWith(source+'/'));if(!included.length)throw Error('No tracked package content for '+source);for(const file of included)copy(file);}
for(const file of pluginFiles)copy('dist/'+file,'obsidian-plugin/rational-delirium/'+file);
fs.writeFileSync(path.join(stage,'validation.log'),log);
fs.writeFileSync(path.join(stage,'Start-RD.cmd'),'@echo off\r\nsetlocal\r\nset "RD_TARGET=%~1"\r\nif not defined RD_TARGET set "RD_TARGET=%~dp0knowledge"\r\ncall "%~dp0dist-agent\\Start-RD.cmd" "%RD_TARGET%"\r\n');
fs.writeFileSync(path.join(stage,'QUICKSTART.md'),`# 理性失序 · Rational Delirium ${version} 工程预览

本包面向本地文本知识库与 Agent 使用者。运行需要 Node 24+，无需 Obsidian、Python、运行时 npm 安装或数据库。Node 不包含在下载包中。

Windows 解压后双击 Start-RD.cmd，保持服务窗口开启。默认在本包旁创建 knowledge 目录；也可将现有知识目录作为脚本第一个参数传入。重要资料先做完整目录备份。

命令行试用（合成示例）：

\`\`\`text
node dist-agent/rd.mjs demo --root ./example-knowledge
node dist-agent/rd.mjs serve --root ./example-knowledge
\`\`\`

打开打印的本地地址，默认 http://127.0.0.1:4399；端口占用时增加 --port 4400。demo 仅接受空目录。自己的 Markdown 目录使用 init --root <folder>，然后 serve --root <folder>。初始化保留原笔记，只添加工作区元数据及外置审阅密钥。只读查看可加 --read-only。

Agent 接入：

\`\`\`text
node dist-agent/rd.mjs mcp --root /absolute/path/knowledge
node dist-agent/agent-run.mjs --root /absolute/path/knowledge --questions /path/questions.json --output /path/new-run --dsh-entry /path/installed/dsh/lib/bin.js
\`\`\`

从指定资料自动建库：复制 examples/intake-scope.json 并填写资料范围（相对路径按 scope 文件位置解析），或在页面点击“Agent 自动建库”生成范围文件，然后让本机 Agent 执行：

\`\`\`text
node dist-agent/rd.mjs intake --root ./my-knowledge --manifest ./scope.json --dsh-entry /path/to/dsh/lib/bin.js --serve
\`\`\`

也可使用 --adapter /path/to/agent.mjs。未配置 Agent 时仅保存原文并返回 awaiting-agent。完成的采集会保留来源、历史快照和候选缺口；partial 状态表示还有待解决的批次或覆盖问题。重复运行可增量采集，已有知识保留。详见 docs/agent-intake.md。

MCP 默认只读。--write 可提出并应用已批准提案，始终不提供批准工具。DSH 是可选的外部适配器，需自行安装并配置；本包不包含模型或 API 凭据。外部 Agent/模型可能处理所提供的资料，具体数据流向取决于该客户端配置。

- [当前发布与验收](docs/validation/v${version}/release.md)
- [四板块工作流](docs/four-role-workspace.md)
- [使用与恢复](docs/standalone-knowledge.md)
- [Agent 交付与原始 questions 参数](docs/agent-delivery.md)
- [来源和版本覆盖](docs/validation/v${version}/source-coverage.md)
- [三层设计](docs/architecture/three-layer-design-v1.0.md)

可选 Obsidian 插件在 obsidian-plugin/rational-delirium/，四个文件须一起复制；独立运行不需要它。它不是独立界面的完整复制。

知识 ZIP 用于 Markdown 内容迁移，不包含附件、批准密钥与完整执行历史；完整备份需另行保存工作区与外置密钥。PDF/OCR、附件预览、云同步和内置模型问答不在本次预览范围。真实 DSH 评估为既有个人材料上的 14 题，不能代表新用户准确率、长期可靠性或真实世界效果。

build-manifest.json 记录本包源提交与文件哈希，validation.log 保存经路径去敏的构建检查记录。docs/validation 中其他日期的记录为历史阶段证据。重跑源码测试请使用对应 tag 的源码安装依赖；下载运行包无需 node_modules。
`);
const files=[];
function walk(dir,prefix=''){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const absolute=path.join(dir,e.name),relative=prefix+e.name;if(e.isSymbolicLink())throw Error('Package inputs must not contain symlinks');if(e.isDirectory())walk(absolute,relative+'/');else{const data=fs.readFileSync(absolute);files.push({path:relative,bytes:data.length,sha256:hash(data)});}}}
walk(stage);
fs.writeFileSync(path.join(stage,'build-manifest.json'),JSON.stringify({schema:'rd-release/1',version,channel:'engineering-preview',sourceCommit,validationLogSha256:hash(log),generatedTrackedPaths:changed,files},null,2)+'\n');
const entries={};for(const file of [...files,{path:'build-manifest.json'}])entries[`rational-delirium-${version}/`+file.path]=fs.readFileSync(path.join(stage,file.path));
const archive=path.join(output,`rational-delirium-${version}-standalone.zip`);fs.writeFileSync(archive,zipSync(entries,{level:6}));
const plugin=path.join(output,`rational-delirium-${version}-obsidian-plugin.zip`),pluginEntries={};for(const file of pluginFiles)pluginEntries['rational-delirium/'+file]=fs.readFileSync(path.join(root,'dist',file));fs.writeFileSync(plugin,zipSync(pluginEntries,{level:6}));
const sums=[archive,plugin].map(file=>hash(fs.readFileSync(file))+'  '+path.basename(file)).join('\n')+'\n';fs.writeFileSync(path.join(output,'SHA256SUMS.txt'),sums);
console.log(JSON.stringify({stage,archive,plugin,sourceCommit,files:files.length+1,checksums:sums.trim().split('\n')},null,2));

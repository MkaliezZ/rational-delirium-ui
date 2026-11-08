import * as fs from 'node:fs';
import * as path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const output=path.resolve(root,'../deliverables',`rational-delirium-${version}`),stage=path.join(output,`rational-delirium-${version}`);
if(fs.existsSync(stage))throw Error('Delivery already exists; preserve it and choose a new version before packaging.');
fs.mkdirSync(stage,{recursive:true});
const copy=(from,to=from)=>{fs.mkdirSync(path.dirname(path.join(stage,to)),{recursive:true});fs.cpSync(path.join(root,from),path.join(stage,to),{recursive:true});};
copy('dist-agent');copy('docs/standalone-knowledge.md');copy('docs/agent-delivery.md');copy('docs/agent-source-reading.md');copy('docs/four-role-workspace.md');copy('docs/validation/standalone');copy('docs/design');copy('design-qa.md');copy('skills/rational-delirium-agent-skill.md');copy('skills/legacy-obsidian-agent-skill-v1.7.1.md');copy('eval');copy('LICENSE');
for(const file of ['main.js','manifest.json','styles.css','tokens-rational-archive.css'])copy('dist/'+file,'obsidian-plugin/rational-delirium/'+file);
copy(`.tmp/validation/v${version}-full.log`,'validation.log');copy('docs/architecture');copy(`docs/validation/v${version}`);
fs.writeFileSync(path.join(stage,'Start-RD.cmd'),'@echo off\r\nsetlocal\r\nset "RD_TARGET=%~1"\r\nif not defined RD_TARGET set "RD_TARGET=%~dp0knowledge"\r\ncall "%~dp0dist-agent\\Start-RD.cmd" "%RD_TARGET%"\r\n');
fs.writeFileSync(path.join(stage,'README.md'),`# 理性失序 · Rational Delirium ${version}

这是独立运行包，需要 Node 24+，无需启动 Obsidian、Python、模型服务或数据库。

Windows 双击根目录 Start-RD.cmd。默认在本包旁的 knowledge 目录保存知识；保持服务窗口开启。现有知识目录可作为脚本第一个参数传入。初始化不迁移或改写原有笔记，只添加工作区元数据及外置审阅密钥。

命令行启动：

\`\`\`text
node dist-agent/rd.mjs demo --root ./example-knowledge
node dist-agent/rd.mjs serve --root ./example-knowledge
\`\`\`

打开打印的本地地址，默认 http://127.0.0.1:4399。demo 仅接受空目录，内容为合成示例。自己的资料使用 init --root 初始化后再 serve。只读查看可加 --read-only。

Agent 接入：

\`\`\`text
node dist-agent/rd.mjs mcp --root /absolute/path/knowledge
node dist-agent/rd.mjs mcp --root /absolute/path/knowledge --write
\`\`\`

MCP 默认只读。--write 可提出并应用已批准提案，始终不提供批准工具。

- [三层设计](docs/architecture/three-layer-design-v1.0.md)
- [四板块工作流](docs/four-role-workspace.md)
- [本版验收](docs/validation/v${version}/readiness.md)
- [使用与恢复](docs/standalone-knowledge.md)
- [eval 与验收](docs/validation/standalone/readiness.md)
- [Agent 工作流](skills/rational-delirium-agent-skill.md)
- [UI 视觉验收](design-qa.md)

运行包不包含 node_modules。重跑 npm 自动化与 eval 请在完整源码工作区进行；本包的 eval 文件用于核对语料和算法快照。

本版面向文本知识。PDF/OCR、附件预览、模型问答与多设备同步尚未提供。合成测试通过不代表真实资料、长期使用和模型回答质量已通过验收。
`);
const entries=[];const walk=(dir,prefix='')=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const target=path.join(dir,e.name),relative=prefix+e.name;if(e.isDirectory())walk(target,relative+'/');else entries.push({path:relative,bytes:fs.statSync(target).size,sha256:createHash('sha256').update(fs.readFileSync(target)).digest('hex')});}};walk(stage);
fs.writeFileSync(path.join(stage,'build-manifest.json'),JSON.stringify({version,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceBranch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),files:entries},null,2)+'\n');
const zip=path.join(output,`rational-delirium-${version}.zip`);
execFileSync('python',['-c','import pathlib,sys,zipfile; p=pathlib.Path(sys.argv[1]); z=zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED); [z.write(f,f.relative_to(p.parent).as_posix()) for f in p.rglob("*") if f.is_file()]; z.close()',stage,zip]);
fs.writeFileSync(path.join(output,'SHA256SUMS.txt'),createHash('sha256').update(fs.readFileSync(zip)).digest('hex')+'  '+path.basename(zip)+'\n');
console.log(JSON.stringify({stage,zip,files:entries.length+1,bytes:fs.statSync(zip).size},null,2));

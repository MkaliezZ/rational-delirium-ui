/** One installation contract for build verification and deployment. */
export const RUNTIME_FILES = Object.freeze([
  "main.js", "manifest.json", "styles.css", "tokens-rational-archive.css",
]);

/** Explicit standalone inventory also prevents untracked files entering releases. */
export const AGENT_ICONS = Object.freeze(['magnifying-glass','books','tree-structure','git-pull-request','clock-counter-clockwise','file-text','arrow-square-out','caret-right','caret-left','arrow-right','arrow-left','x','plus','pencil-simple','check','warning-circle','arrow-clockwise','sidebar','list','copy','folder-open','git-diff']);
export const AGENT_RUNTIME_FILES = Object.freeze([
  'rd.mjs','index.mjs','agent-read.mjs','agent-run.mjs','Start-RD.cmd','LICENSE','.node-version','THIRD_PARTY_NOTICES.txt',
  'web/index.html','web/app.css','web/app.js','web/icons/LICENSE.txt',
  ...AGENT_ICONS.map(name=>'web/icons/'+name+'.svg'),
]);

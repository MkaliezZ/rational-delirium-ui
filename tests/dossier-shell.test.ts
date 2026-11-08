import {expect,it} from "vitest";
import {roleDirectory,propertyPanel,sourceOrigin,shellArgument} from "../web/dossier-shell";
const esc=(v:unknown)=>String(v).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
it("keeps all four role counts, selected records and overflow entries reachable and escapes imported titles",()=>{
 const rows=Array.from({length:12},(_,i)=>({path:`Notes/${i}.md`,title:i===11?"<script>unsafe</script>":"Record "+i,roles:["case" as const]}));document.body.innerHTML=roleDirectory({case:rows},{case:12,evidence:0,hypothesis:0,loop:0},"case",rows[11].path,esc);expect(document.querySelectorAll("[data-directory-role]")).toHaveLength(4);expect(document.querySelectorAll(".directory-file")).toHaveLength(12);expect(document.querySelector('.directory-file[aria-current="page"]')?.textContent).toBe("<script>unsafe</script>");expect(document.querySelector("script")).toBeNull();expect(document.querySelector(".directory-overflow summary")?.textContent).toBe("展开其余 6 条");
});
it("shows declared metadata and scoped relation direction without inventing confidence or verification dates",()=>{
 const note={roles:["hypothesis"],status:"candidate",citations:[{availability:"current"},{availability:"changed"}],relationCandidates:[{}],revision:"a".repeat(64),path:"Knowledge/a.md",frontmatter:{}};document.body.innerHTML=propertyPanel(note,[{direction:"incoming",predicate:"contradicts",source:{path:"Knowledge/b.md",objectId:"b"}}],new Map([["Knowledge/b.md","反向证据"]]),esc,v=>v);expect(document.body.textContent).toContain("2 条 · 1 条版本匹配");expect(document.body.textContent).toContain("对方 → 当前 · 反驳");expect(document.body.textContent).toContain("反向证据");expect(document.body.textContent).not.toContain("72%");expect(document.body.textContent).not.toContain("最近复核声明");
});
it("retains original source/version details while excluding executable origin URLs",()=>{
 expect(shellArgument("D:/Material's $(literal)")).toBe("'D:/Material''s $(literal)'");expect(shellArgument("/tmp/Agent's $literal")).toBe("'/tmp/Agent'\"'\"'s $literal'");
 document.body.innerHTML=sourceOrigin({frontmatter:{rd_origin:{url:"javascript:alert(1)",originalPath:'<original>.md',ref:"v1.0.0",commit:"a".repeat(40)},rd_original_sha256:"b".repeat(64)}},esc);expect(document.querySelector("a")).toBeNull();expect(document.body.textContent).toContain("<original>.md");expect(document.body.textContent).toContain("v1.0.0");expect(document.querySelector("original")).toBeNull();
});

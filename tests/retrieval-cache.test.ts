// @vitest-environment node
import {expect,it} from "vitest";
import {rank,RetrievalCache} from "../standalone/retrieval";
import {sha256} from "../standalone/files";
const document=(markdown:string,title="资料",id:string|null=null)=>({file:{path:"Notes/source.md",markdown,revision:sha256(markdown),mtime:1},title,id,kind:null,status:null});
it("reuses lexical preparation without leaking a prior source revision or title",()=>{const cache=new RetrievalCache(),old=document("# 资料\n\n旧解释");expect(rank([old],"旧解释","all",cache)).toHaveLength(1);const updated=document("# 资料\n\n新解释");expect(rank([updated],"旧解释","all",cache)).toHaveLength(0);expect(rank([updated],"新解释","all",cache)).toHaveLength(1);expect(rank([{...updated,title:"新的标题"}],"新的标题","title",cache)).toHaveLength(1);});
it("keeps title/body scopes and workspace caches independent",()=>{const cache=new RetrievalCache(),doc=document('---\naliases: [别名检索]\n---\n# 正文\n\n观察记录',"独立标题");expect(rank([doc],"别名检索","all",cache)).toHaveLength(1);expect(rank([doc],"别名检索","body",cache)).toHaveLength(0);expect(rank([doc],"观察记录","title",cache)).toHaveLength(0);expect(rank([document("别人的内容")],"观察记录","all",new RetrievalCache())).toHaveLength(0);cache.retain(new Set());expect(rank([doc],"观察记录","all",cache)).toHaveLength(1);});

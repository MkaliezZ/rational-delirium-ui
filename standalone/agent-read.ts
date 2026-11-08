import * as fs from "node:fs";
import { KnowledgeService } from "./service";
import { toolDefinitions } from "./mcp";
import { AGENT_READ_COMMANDS } from "./agent-flow";
import { errorData,record,requireValue } from "./errors";

async function main(){
    const [requestedCommand="tools",...argv]=process.argv.slice(2),command=requestedCommand.replace(/^rd_/,""),flags:Record<string,string>={};
    for(let i=0;i<argv.length;i+=2){requireValue(argv[i].startsWith("--")&&argv[i+1]!==undefined,"INVALID_ARGUMENT","Use --key value");flags[argv[i].slice(2)]=argv[i+1];}
    requireValue(typeof flags.binding==="string","INVALID_ARGUMENT","--binding is required");
    const binding=JSON.parse(fs.readFileSync(flags.binding,"utf8"));
    let args:Record<string,unknown>={},result:any,error:any=null;const started=Date.now();
    try{
        requireValue(command==="tools"||AGENT_READ_COMMANDS.includes(command as any),"READ_ONLY","Only Agent reading and delivery checks are exposed");
        const count=fs.existsSync(binding.trace)?fs.readFileSync(binding.trace,"utf8").trim().split("\n").filter(Boolean).length:0;
        requireValue(count<(binding.maxCalls??60),"TOOL_BUDGET","Agent reading budget exhausted; retain uncertainty");
        if(flags.json)args=record(JSON.parse(flags.json));
        for(const[key,value]of Object.entries(flags))if(!["binding","json"].includes(key))args[key]=["citations","relations","answers","expectedIds","questions"].includes(key)?JSON.parse(value):["limit","offset","depth","budget","maxObjects","startLine","endLine","maxChars"].includes(key)?Number(value):key==="includeNotes"?value!=="false":value;
        if(command==="tools")result={tools:toolDefinitions(false).filter(t=>AGENT_READ_COMMANDS.includes(t.name.slice(3) as any))};
        else{const service=new KnowledgeService(binding.root);try{result=await service.execute(command,args);}finally{await service.close();}}
    }catch(e){error=errorData(e);result={error};process.exitCode=1;}
    fs.appendFileSync(binding.trace,JSON.stringify({at:new Date().toISOString(),requestedCommand,tool:command==="tools"?"tools/list":"rd_"+command,args,ms:Date.now()-started,error,isError:!!error,result})+"\n");
    process.stdout.write(JSON.stringify(result,null,2)+"\n");
}
main().catch(e=>{process.stdout.write(JSON.stringify({error:errorData(e)})+"\n");process.exitCode=1;});

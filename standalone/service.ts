import * as fs from "node:fs";
import { RootFiles, workspaceLock } from "./files";
import { FolderKnowledge } from "./knowledge";
import { MutationEngine } from "./mutations";
import { requireValue, string } from "./errors";
import { VERSION } from "./types";
import { KnowledgeWorkbench } from "./workbench";
import { KnowledgeAssets } from "./assets";
import { prepareAnswer } from "./answers";
import { sourceCoverage } from "./coverage";
export class KnowledgeService {
    readonly files: RootFiles;
    readonly knowledge: FolderKnowledge;
    readonly mutations: MutationEngine;
    readonly workbench: KnowledgeWorkbench;
    readonly assets: KnowledgeAssets;
    private pending: Promise<unknown> = Promise.resolve();
    private watcher?: fs.FSWatcher;
    private timer?: ReturnType<typeof setInterval>;
    private debounce?: ReturnType<typeof setTimeout>;
    watchError: string | null = null;
    constructor(root: string, keyPath?: string) { this.files = new RootFiles(root); this.knowledge = new FolderKnowledge(this.files); this.mutations = new MutationEngine(this.knowledge, keyPath); this.workbench=new KnowledgeWorkbench(this.knowledge,this.mutations);this.assets=new KnowledgeAssets(this.knowledge,this.mutations); }
    execute(command: string, args: Record<string, unknown> = {}, operator = false): Promise<any> {
        const work = this.pending.catch(() => { }).then(() => workspaceLock(this.files, async () => {
            await this.knowledge.refresh();
            const kb = this.knowledge, m = this.mutations;
            switch (command) {
                case "status": return { version: VERSION, root: this.files.root, initialized: !!this.files.config(), revision: kb.revision, ...kb.validate(), recoveryRequired: this.files.exists(".rd/active.json", true), watchError: this.watchError };
                case "list": return kb.list(args);
                case "get": return kb.get(args);
                case "read_source": return kb.readSource(args);
                case "check_citations": return kb.checkCitations(args);
                case "check_relations": return kb.checkRelations(args);
                case "prepare_answer": return prepareAnswer(kb,args);
                case "source_coverage": return sourceCoverage(kb,args);
                case "search": return kb.search(args);
                case "relations": return kb.relations(args);
                case "context": return kb.context(args);
                case "validate": return kb.validate();
                case "boards": return this.workbench.boards(args);
                case "analyze": return this.workbench.analyze(args);
                case "suggestions": return this.workbench.suggestions(args);
                case "export_assets": return this.assets.export(args);
                case "preview_import": return this.assets.preview(args);
                case "discard_import": return this.assets.discard(string(args.id,"id"));
                case "propose_organize": return this.workbench.organize(args);
                case "propose_roles": return this.workbench.roles(args);
                case "propose_link": return this.workbench.link(args);
                case "organize": case "set_roles": case "link": case "import_package": {
                    requireValue(operator,"OPERATOR_ONLY","Knowledge adoption and package imports are local operator actions");
                    const proposal=command==="organize"?this.workbench.organize(args):command==="set_roles"?this.workbench.roles(args):command==="link"?this.workbench.link(args):this.assets.import(args);
                    m.decide(proposal.id,"approved","local-operator",proposal.digest);
                    const transaction=m.apply(proposal.id);await kb.refresh();
                    return {id:proposal.id,transaction:transaction.status,paths:proposal.changes.map(c=>c.path)};
                }
                case "export": return kb.export(args.includeContent === true);
                case "proposals": return m.list(args);
                case "proposal": return { proposal: m.proposal(string(args.id, "id")), decision: m.decision(string(args.id, "id")), transaction: m.transaction(string(args.id, "id")) };
                case "propose": return m.propose(args);
                case "revise": return m.revise(args);
                case "restore": return m.restore(string(args.id, "id"), string(args.actor, "actor"), string(args.reason, "reason"));
                case "apply": {
                    const tx = m.apply(string(args.id, "id"));
                    await kb.refresh();
                    return tx;
                }
                case "decide":
                    requireValue(operator, "OPERATOR_ONLY", "Decisions are available to the local operator, not Agent tools");
                    return m.decide(string(args.id, "id"), string(args.decision, "decision"), string(args.reviewer, "reviewer"), string(args.digest, "digest"));
                case "recover": {
                    requireValue(operator, "OPERATOR_ONLY", "Recovery requires local operator inspection");
                    const tx = m.recover();
                    await kb.refresh();
                    return tx;
                }
                case "save": {
                    requireValue(operator, "OPERATOR_ONLY", "Direct saves are operator actions");
                    const proposal = m.propose({ actor: "local-operator", reason: args.reason ?? "直接编辑笔记", evidence: [], changes: [{ path: args.path, beforeSha256: args.revision, afterMarkdown: args.markdown }] });
                    m.decide(proposal.id, "approved", "local-operator", proposal.digest);
                    const tx = m.apply(proposal.id);
                    await kb.refresh();
                    return tx;
                }
                default: throw new Error(`Unknown command: ${command}`);
            }
        }));
        this.pending = work;
        return work;
    }
    watch(onChange?: (revision: string) => void, onError?: (error: unknown) => void) {
        const reconcile = () => { const old = this.knowledge.revision; void this.execute("status").then(() => { if (old !== this.knowledge.revision)
            onChange?.(this.knowledge.revision); }).catch(error => { this.watchError = String(error); onError?.(error); }); };
        try {
            this.watcher = fs.watch(this.files.root, { recursive: true }, (_event, file) => { if (file && String(file).split(/[\\/]/).some(p => p.startsWith(".")))
                return; clearTimeout(this.debounce); this.debounce = setTimeout(reconcile, 200); });
            this.watcher.on("error", e => { this.watchError = e.message; onError?.(e); });
        }
        catch (e) {
            this.watchError = String(e);
        }
        this.timer = setInterval(reconcile, 10000);
        this.timer.unref();
    }
    async close() { this.watcher?.close(); clearInterval(this.timer); clearTimeout(this.debounce); await this.pending.catch(() => { }); this.knowledge.dispose(); }
}

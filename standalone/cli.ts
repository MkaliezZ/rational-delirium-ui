import * as fs from "node:fs";
import * as path from "node:path";
import { stringify } from "yaml";
import corpus from "../eval/corpus.json";
import { RootFiles } from "./files";
import { initialize } from "./mutations";
import { KnowledgeService } from "./service";
import { startMcp } from "./mcp";
import { startServer } from "./http";
import { errorData, record, requireValue } from "./errors";
import { VERSION } from "./types";
import { seedRoleDemo } from "./demo";
const argv = process.argv.slice(2), command = argv.shift() ?? "help", flags: Record<string, string | boolean> = {};
const output = (data: unknown) => process.stdout.write(JSON.stringify(data, null, 2) + "\n");
async function main() {
    for (let i = 0; i < argv.length; i++) {
        requireValue(argv[i].startsWith("--"), "INVALID_ARGUMENT", "Use named flags");
        const key = argv[i].slice(2);
        flags[key] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    }
    if (command === "help" || command === "--help") {
        output({ product: "理性失序 · Rational Delirium", version: VERSION, usage: "node rd.mjs <command> --root <folder> [--args file.json | --json '{...}']", commands: ["init", "demo", "serve", "mcp", "watch", "status", "list", "search", "get", "read_source", "check_citations", "check_relations", "source_coverage", "prepare_answer", "relations", "context", "validate", "export", "propose", "revise", "proposal", "proposals", "decide", "apply", "restore", "recover", "boards", "analyze", "suggestions", "export_assets", "propose_organize", "propose_roles", "propose_link", "organize", "set_roles", "link", "preview_import", "import_package"], examples: ['init --root ./knowledge', 'demo --root ./example', 'serve --root ./knowledge', 'search --root ./knowledge --query 记忆', 'get --root ./knowledge --id ko-20261107-0142', 'mcp --root ./knowledge --write'], notes: "MCP is read-only by default. --write exposes propose/apply, never approve. CLI decide requires --human, --reviewer and --digest. serve is a local operator UI; use --read-only for viewing only." });
        return;
    }
    requireValue(typeof flags.root === "string", "INVALID_ARGUMENT", "--root is required");
    const root = path.resolve(flags.root);
    const key = typeof flags.key === "string" ? flags.key : undefined;
    if (command === "init") {
        output({ ok: true, data: initialize(new RootFiles(root, true), key) });
        return;
    }
    if (command === "demo") {
        const files = new RootFiles(root, true);
        requireValue(fs.readdirSync(root).length === 0, "NOT_EMPTY", "Demo requires an empty directory");
        initialize(files, key);
        for (const f of corpus.files) {
            const fields = f.note ? null : f.legacy ? { type: "evidence", id: f.id, status: "verified", ...f.extra } : { object_id: f.id, kind: "concept", status: f.status ?? "active", title: f.title, ...("aliases" in f ? { aliases: f.aliases } : {}), ...("tags" in f ? { tags: f.tags } : {}), ...f.extra };
            const roles=f.path==="Knowledge/z-memory.md"?["hypothesis"]:["Knowledge/z-evidence.md","Knowledge/z-conflict.md"].includes(f.path)?["evidence"]:undefined;
            files.write(f.path, fields ? "---\n" + stringify({...fields,...(roles?{rd_roles:roles}:{})}) + "---\n" + f.body : f.body);
        }
        seedRoleDemo(files);
        files.write("欢迎.md", "# 欢迎来到理性失序\n\n这是可编辑的示例知识库，所有证据内容都是演示资料。\n\n从搜索、阅读和核对来源开始；推演页呈现支持、反驳与待补来源。\n");
        output({ ok: true, root, message: "Example knowledge created. All evidence is synthetic." });
        return;
    }
    const service = new KnowledgeService(root, key);
    if (command === "mcp") {
        startMcp(service, flags.write === true);
        return;
    }
    if (command === "serve") {
        const app = await startServer(service, { port: flags.port ? Number(flags.port) : 4399, operator: flags["read-only"] !== true });
        output({ ok: true, url: app.url, root, mode: flags["read-only"] ? "read-only" : "local-operator" });
        const close = () => { void app.close().then(() => process.exit()); };
        process.once("SIGINT", close);
        process.once("SIGTERM", close);
        return;
    }
    if (command === "watch") {
        output(await service.execute("status"));
        service.watch(revision => output({ event: "changed", revision }), error => process.stderr.write(JSON.stringify(errorData(error)) + "\n"));
        process.stdin.resume();
        process.once("SIGINT", () => { void service.close().then(() => process.exit()); });
        return;
    }
    let args: Record<string, unknown> = {};
    if (typeof flags.args === "string")
        args = record(JSON.parse(fs.readFileSync(flags.args, "utf8")));
    if (typeof flags.json === "string")
        args = { ...args, ...record(JSON.parse(flags.json)) };
    for (const [key, value] of Object.entries(flags))
        if (!["root", "key", "args", "json", "human"].includes(key))
            args[key] = ["includeContent", "includeNotes"].includes(key) ? value !== "false" : value;
    if (command === "decide" || command === "recover")
        requireValue(flags.human === true, "OPERATOR_ONLY", "Use --human for explicit local operator action");
    try {
        const data = await service.execute(command, args, flags.human === true);
        output({ ok: true, revision: service.knowledge.revision, data });
    }
    finally {
        await service.close();
    }
}
main().catch(error => { output({ ok: false, error: errorData(error) }); process.exitCode = 1; });

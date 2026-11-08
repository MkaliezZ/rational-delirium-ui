import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { KnowledgeService } from "./service";
import { errorData, record, requireValue, string } from "./errors";
export async function startServer(service: KnowledgeService, options: {
    port?: number;
    assets?: string;
    operator?: boolean;
} = {}) {
    const token = randomBytes(32).toString("hex"), assets = options.assets ?? path.join(import.meta.dirname, "web");
    const commands = new Set(["status", "list", "get", "read_source", "check_citations", "check_relations", "source_coverage", "prepare_answer", "search", "relations", "context", "validate", "export", "proposals", "proposal", "propose", "revise", "restore", "apply", "decide", "recover", "save", "boards", "analyze", "suggestions", "export_assets", "preview_import", "discard_import", "propose_organize", "propose_roles", "propose_link", "organize", "set_roles", "link", "import_package"]);
    const server = http.createServer(async (req, res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "no-referrer");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
        try {
            const address = server.address();
            requireValue(address && typeof address !== "string", "SERVER_ERROR", "Server address unavailable");
            const host = req.headers.host;
            requireValue(host === `127.0.0.1:${address.port}` || host === `localhost:${address.port}`, "FORBIDDEN_HOST", "Use the local server address");
            const origin = req.headers.origin;
            requireValue(!origin || origin === `http://${host}`, "FORBIDDEN_ORIGIN", "Cross-origin access is disabled");
            const url = new URL(req.url ?? "/", `http://${host}`);
            if (url.pathname === "/api") {
                requireValue(req.method === "POST", "METHOD_NOT_ALLOWED", "API requires POST");
                const supplied = typeof req.headers["x-rd-token"] === "string" ? req.headers["x-rd-token"] : "";
                requireValue(/^[a-f0-9]{64}$/.test(supplied) && timingSafeEqual(Buffer.from(supplied), Buffer.from(token)), "UNAUTHORIZED", "Session token required");
                requireValue(req.headers["content-type"]?.startsWith("application/json"), "INVALID_ARGUMENT", "JSON request required");
                let bytes = 0;
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                    bytes += chunk.length;
                    requireValue(bytes <= 10 * 1024 * 1024, "FILE_LIMIT", "Request too large");
                    chunks.push(chunk);
                }
                const body = record(JSON.parse(Buffer.concat(chunks).toString("utf8"))), command = string(body.command, "command");
                requireValue(commands.has(command), "INVALID_ARGUMENT", "Unknown command");
                requireValue(options.operator !== false || !["save", "decide", "recover", "propose", "revise", "restore", "apply", "propose_organize", "propose_roles", "propose_link", "organize", "set_roles", "link", "import_package"].includes(command), "READ_ONLY", "Server is read-only");
                const data = await service.execute(command, record(body.args ?? {}), options.operator !== false);
                if (command === "status")
                    data.readOnly = options.operator === false;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ ok: true, revision: service.knowledge.revision, data }));
                return;
            }
            requireValue(req.method === "GET" || req.method === "HEAD", "METHOD_NOT_ALLOWED", "Unsupported method");
            const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
            requireValue(/^(index\.html|app\.js|app\.css|icons\/[a-z0-9-]+\.svg)$/.test(relative), "NOT_FOUND", "Asset not found");
            const file = path.join(assets, relative);
            requireValue(fs.existsSync(file), "NOT_FOUND", "Asset not found");
            const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
            res.setHeader("Content-Type", types[path.extname(file)]);
            let content = fs.readFileSync(file);
            if (relative === "index.html")
                content = Buffer.from(content.toString().replace("__RD_TOKEN__", token));
            res.end(req.method === "HEAD" ? undefined : content);
        }
        catch (error) {
            const e = errorData(error);
            res.statusCode = e.code === "NOT_FOUND" ? 404 : ["FORBIDDEN_ORIGIN", "FORBIDDEN_HOST", "UNAUTHORIZED", "READ_ONLY"].includes(e.code) ? 403 : e.code === "METHOD_NOT_ALLOWED" ? 405 : 409;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: false, error: e }));
        }
    });
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(options.port ?? 4399, "127.0.0.1", () => { server.off("error", reject); resolve(); }); });
    const address = server.address() as import("node:net").AddressInfo;
    service.watch();
    return { server, url: `http://127.0.0.1:${address.port}`, close: async () => { await new Promise<void>((r, j) => server.close(e => e ? j(e) : r())); await service.close(); } };
}

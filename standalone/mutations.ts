import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";
import { randomUUID, generateKeyPairSync, sign, verify } from "node:crypto";
import { stringify } from "yaml";
import { parseObject } from "../src/parsers/object-parser";
import { parseYamlFields, splitFrontmatter } from "../src/parsers/frontmatter-parser";
import { RootFiles, artifactId, canonical, now, sha256 } from "./files";
import { requireValue, record, string, integer, KnowledgeError } from "./errors";
import { MAX_FILE_BYTES, MAX_PLAN_BYTES, type Change, type Decision, type Proposal, type Transaction, type WorkspaceConfig } from "./types";
import type { FolderKnowledge } from "./knowledge";
import { roleMetadataErrors } from "../src/knowledge-roles";
export function defaultKey(config: WorkspaceConfig) { return path.join(homedir(), ".rational-delirium", "keys", config.workspaceId + ".pem"); }
export function initialize(files: RootFiles, keyPath?: string) {
    requireValue(!files.config(), "ALREADY_INITIALIZED", "Workspace is already initialized");
    const pair = generateKeyPairSync("ed25519"), id = randomUUID();
    const config: WorkspaceConfig = { schema: "rd-workspace/1", workspaceId: id, createdAt: now(), approvalPublicKey: pair.publicKey.export({ type: "spki", format: "pem" }).toString() };
    const key = path.resolve(keyPath ?? defaultKey(config));
    const relative = path.relative(files.root, key);
    requireValue(relative.startsWith(".." + path.sep) || path.isAbsolute(relative), "UNSAFE_KEY", "Approval key must be stored outside the knowledge directory");
    fs.mkdirSync(path.dirname(key), { recursive: true });
    fs.writeFileSync(key, pair.privateKey.export({ type: "pkcs8", format: "pem" }), { flag: "wx", mode: 0o600 });
    files.writeJson(".rd/workspace.json", config, true);
    return { config, keyPath: key };
}
const digestOf = (proposal: Omit<Proposal, "digest"> | Proposal) => { const { digest, ...payload } = proposal as Proposal; return sha256(canonical(payload)); };
/** Controlled service boundary. Agents with arbitrary OS filesystem permissions are outside this boundary. */
export class MutationEngine {
    constructor(readonly kb: FolderKnowledge, readonly keyPath?: string) { }
    private get files() { return this.kb.files; }
    private config() { const c = this.files.config(); requireValue(c, "NOT_INITIALIZED", "Initialize the workspace before making changes"); return c; }
    private current(p: string) { return this.files.exists(p) ? this.files.read(p) : null; }
    private active() { if (this.files.exists(".rd/active.json", true))
        throw new KnowledgeError("RECOVERY_REQUIRED", "An interrupted transaction needs recovery", this.files.json(".rd/active.json")); }
    private validateChanges(changes: Change[]) {
        requireValue(!this.kb.scanDiagnostics.some(d=>d.type==="source_unreadable"),"INCOMPLETE_INDEX","Unreadable knowledge files must be checked before identity-safe writes");
        requireValue(changes.length > 0 && changes.length <= 32, "INVALID_PROPOSAL", "Use 1–32 file changes");
        const names = new Set<string>(), after = new Map([...this.kb.sources].map(([p, f]) => [p, f.markdown]));
        for (const c of changes) {
            this.files.absolute(c.path);
            const key = c.path.toLowerCase();
            requireValue(!names.has(key), "INVALID_PROPOSAL", "Duplicate or case-colliding file changes");
            names.add(key);
            requireValue(c.beforeSha256 === null || /^[a-f0-9]{64}$/.test(c.beforeSha256), "INVALID_PROPOSAL", "Expected source hash required");
            requireValue(c.afterMarkdown === null || typeof c.afterMarkdown === "string" && Buffer.byteLength(c.afterMarkdown) <= MAX_FILE_BYTES, "FILE_LIMIT", "Markdown exceeds file size limit");
            requireValue(c.afterSha256 === (c.afterMarkdown === null ? null : sha256(c.afterMarkdown)), "INVALID_PROPOSAL", "Content hash mismatch");
            const before = this.current(c.path);
            requireValue((before?.revision ?? null) === c.beforeSha256, "STALE_SOURCE", "Source changed; create a new proposal", { path: c.path, expected: c.beforeSha256, actual: before?.revision ?? null });
            requireValue(c.afterSha256 !== c.beforeSha256, "NO_CHANGE", "Change has no effect");
            // Deletion is reserved for a separately reviewed inverse of a committed creation.
            if (c.afterMarkdown === null)
                after.delete(c.path);
            else {
                const block=splitFrontmatter(c.afterMarkdown), fields=block?parseYamlFields(block.text,c.path).fields:{};
                requireValue(roleMetadataErrors(fields).length===0,"INVALID_OBJECT","Invalid role or citation metadata",roleMetadataErrors(fields));
                const spans=[...(Array.isArray(fields.rd_relation_notes)?fields.rd_relation_notes.flatMap((n:any)=>n.evidence??[]):[]),...(Array.isArray(fields.rd_relation_candidates)?fields.rd_relation_candidates.flatMap((n:any)=>n.evidence??[]):[])];
                for(const span of spans){const staged=changes.find(c=>c.path===span.path),text=staged?staged.afterMarkdown:this.current(span.path)?.text;if(text!==undefined&&text!==null&&sha256(text)===span.revision)requireValue(text.split(/\r\n|\r|\n/).slice(span.startLine-1,span.endLine).join("\n")===span.quote,"INVALID_CITATION","Relation quote does not match the cited source lines",{path:span.path});}
                const parsed = parseObject(c.path, c.afterMarkdown, 0, 1);
                requireValue(parsed.diagnostics.filter(d => d.code !== "unknown-status").length === 0, "INVALID_OBJECT", "New content has invalid declarations", parsed.diagnostics);
                const previous = before ? parseObject(c.path, before.text, 0, 1) : null;
                requireValue(!previous?.declaredId || previous.declaredId === parsed.declaredId, "IDENTITY_CHANGE", "Preserve identity; use a new successor object to revise identity");
                after.set(c.path, c.afterMarkdown);
            }
        }
        const ids = new Map<string, string[]>(), extractions=new Map<string,string[]>();
        for (const [p, text] of after) {
            const parsed = parseObject(p, text, 0, 1);
            const block=splitFrontmatter(text), key=block?parseYamlFields(block.text,p).fields.rd_extraction_key:undefined;
            if(typeof key==="string") extractions.set(key,[...(extractions.get(key)??[]),p]);
            if (parsed.declaredId)
                ids.set(parsed.declaredId, [...(ids.get(parsed.declaredId) ?? []), p]);
        }
        for(const [key,paths] of extractions) if(paths.length>1&&paths.some(p=>names.has(p.toLowerCase()))) throw new KnowledgeError("DUPLICATE_EXTRACTION","This source span and role selection already exists",{key,paths});
        for (const [id, paths] of ids)
            if (paths.length > 1 && paths.some(p => names.has(p.toLowerCase())))
                throw new KnowledgeError("AMBIGUOUS_ID", "Proposed identity already exists", { id, paths });
    }
    propose(args: Record<string, unknown>, allowDelete = false) {
        this.active();
        const config = this.config();
        const raw = args.changes;
        requireValue(Array.isArray(raw), "INVALID_ARGUMENT", "changes must be an array");
        const changes: Change[] = raw.map(value => {
            const c = record(value);
            requireValue(c.beforeSha256 === null || typeof c.beforeSha256 === "string", "INVALID_ARGUMENT", "beforeSha256 is required (null for creation)");
            requireValue(typeof c.afterMarkdown === "string" || (allowDelete && c.afterMarkdown === null), "INVALID_ARGUMENT", "afterMarkdown must be text");
            const text = c.afterMarkdown as string | null;
            return { path: string(c.path, "path"), beforeSha256: c.beforeSha256 as string | null, afterMarkdown: text, afterSha256: text === null ? null : sha256(text) };
        });
        this.validateChanges(changes);
        const evidence = Array.isArray(args.evidence) ? args.evidence.map(e => string(e, "evidence reference")) : [];
        requireValue(evidence.length <= 64, "INVALID_ARGUMENT", "Too many evidence references");
        const evidenceSources = evidence.map(ref => { const source = this.kb.get(ref.endsWith(".md") ? { path: ref } : { id: ref }); return { id: source.id, path: source.path, revision: source.revision }; });
        const base: Omit<Proposal, "digest"> = { schema: "rd-agent-proposal/1", id: "P-" + randomUUID(), workspaceId: config.workspaceId, createdAt: now(), actor: string(args.actor, "actor"), reason: string(args.reason, "reason"), evidence, evidenceSources,
            operations: [{ type: allowDelete ? "restore" : "change_markdown" }], changes, objectIds: changes.flatMap(c => { const id = c.afterMarkdown ? parseObject(c.path, c.afterMarkdown, 0, 1).declaredId : null; return id ? [id] : []; }) };
        const proposal: Proposal = { ...base, digest: digestOf(base) };
        requireValue(Buffer.byteLength(JSON.stringify(proposal)) <= MAX_PLAN_BYTES, "FILE_LIMIT", "Proposal exceeds size limit");
        this.files.writeJson(`.rd/proposals/${proposal.id}.json`, proposal, true);
        return proposal;
    }
    proposal(id: string): Proposal {
        artifactId(id);
        const p = this.files.json<Proposal>(`.rd/proposals/${id}.json`);
        requireValue(p.schema === "rd-agent-proposal/1" && p.id === id && p.workspaceId === this.config().workspaceId && p.digest === digestOf(p), "INVALID_PROPOSAL", "Proposal is malformed or was changed");
        return p;
    }
    decision(id: string): Decision | null { artifactId(id); return this.files.exists(`.rd/decisions/${id}.json`, true) ? this.files.json(`.rd/decisions/${id}.json`) : null; }
    transaction(id: string): Transaction | null { artifactId(id); return this.files.exists(`.rd/transactions/${id}.json`, true) ? this.files.json(`.rd/transactions/${id}.json`) : null; }
    decide(id: string, choice: string, reviewer: string, expectedDigest: string) {
        this.active();
        const p = this.proposal(id), c = this.config();
        requireValue(p.digest === expectedDigest, "STALE_PROPOSAL", "Review the current proposal version");
        requireValue(!this.transaction(id), "ALREADY_EXECUTED", "A transaction already exists");
        requireValue(!this.decision(id), "DECISION_EXISTS", "Decision is immutable; submit a new proposal");
        requireValue(choice === "approved" || choice === "rejected", "INVALID_ARGUMENT", "Decision must be approved or rejected");
        this.validateChanges(p.changes);
        this.checkEvidence(p);
        const base = { schema: "rd-agent-decision/1" as const, proposalId: id, proposalDigest: p.digest, workspaceId: c.workspaceId, decision: choice as Decision["decision"], reviewer: string(reviewer, "reviewer"), decidedAt: now() };
        const key = fs.readFileSync(this.keyPath ?? defaultKey(c), "utf8");
        const signature = sign(null, Buffer.from(canonical(base)), key).toString("base64");
        requireValue(verify(null, Buffer.from(canonical(base)), c.approvalPublicKey, Buffer.from(signature, "base64")), "WRONG_KEY", "Key does not match workspace");
        const d: Decision = { ...base, signature };
        this.files.writeJson(`.rd/decisions/${id}.json`, d, true);
        return d;
    }
    private checkEvidence(p: Proposal) { for (const e of p.evidenceSources) {
        requireValue(this.current(e.path)?.revision === e.revision, "STALE_EVIDENCE", "Evidence changed; review a new proposal", { path: e.path });
    } }
    private verifiedDecision(p: Proposal) {
        const d = this.decision(p.id);
        requireValue(d && d.decision === "approved" && d.proposalDigest === p.digest && d.workspaceId === p.workspaceId && d.proposalId === p.id, "NOT_APPROVED", "No matching approval exists");
        const { signature, ...base } = d;
        requireValue(verify(null, Buffer.from(canonical(base)), this.config().approvalPublicKey, Buffer.from(signature, "base64")), "INVALID_SIGNATURE", "Approval signature is invalid");
        return d;
    }
    apply(id: string) {
        this.active();
        const p = this.proposal(id), decision = this.verifiedDecision(p);
        requireValue(!this.transaction(id), "ALREADY_EXECUTED", "This proposal already has an execution record");
        this.validateChanges(p.changes);
        this.checkEvidence(p);
        const before = Object.fromEntries(p.changes.map(c => [c.path, this.current(c.path)?.text ?? null]));
        const tx: Transaction = { schema: "rd-agent-transaction/1", id, proposal: p, decision, createdAt: now(), status: "prepared", before };
        requireValue(Buffer.byteLength(JSON.stringify(tx)) <= 31 * 1024 * 1024, "FILE_LIMIT", "Transaction including prior snapshots exceeds the recoverable journal limit");
        this.files.writeJson(`.rd/transactions/${id}.json`, tx, true);
        this.files.writeJson(".rd/active.json", { id }, true);
        tx.status = "applying";
        this.files.writeJson(`.rd/transactions/${id}.json`, tx);
        try {
            for (const c of p.changes) {
                requireValue((this.current(c.path)?.revision ?? null) === c.beforeSha256, "STALE_SOURCE", "File changed during apply", { path: c.path });
                if (c.afterMarkdown === null)
                    this.files.remove(c.path);
                else
                    this.files.write(c.path, c.afterMarkdown);
            }
            tx.status = "committed";
            tx.finishedAt = now();
            this.files.writeJson(`.rd/transactions/${id}.json`, tx);
            this.files.remove(".rd/active.json", true);
            return tx;
        }
        catch (error) {
            tx.status = "execution_uncertain";
            tx.failure = error instanceof Error ? error.message : String(error);
            this.files.writeJson(`.rd/transactions/${id}.json`, tx);
            throw new KnowledgeError("RECOVERY_REQUIRED", "Apply was interrupted; inspect and recover", { id, failure: tx.failure });
        }
    }
    recover() {
        requireValue(this.files.exists(".rd/active.json", true), "NO_ACTIVE_TRANSACTION", "No interrupted transaction");
        const { id } = this.files.json<{
            id: string;
        }>(".rd/active.json"), tx = this.transaction(id);
        requireValue(tx, "INVALID_TRANSACTION", "Recovery journal missing");
        requireValue(tx.proposal.digest === digestOf(tx.proposal), "INVALID_TRANSACTION", "Journal digest mismatch");
        this.verifiedDecision(tx.proposal);
        for (const c of tx.proposal.changes) {
            const before = tx.before[c.path];
            requireValue((before === null ? null : sha256(before)) === c.beforeSha256, "INVALID_TRANSACTION", "Backup hash mismatch");
            const actual = this.current(c.path)?.revision ?? null;
            requireValue(actual === c.beforeSha256 || actual === c.afterSha256, "RECOVERY_CONFLICT", "External change must be resolved manually; no file was overwritten", { path: c.path });
        }
        if (tx.status === "committed")
            for (const c of tx.proposal.changes)
                requireValue((this.current(c.path)?.revision ?? null) === c.afterSha256, "RECOVERY_CONFLICT", "Committed files were externally changed", { path: c.path });
        if (tx.status !== "committed") {
            for (const c of [...tx.proposal.changes].reverse()) {
                const actual = this.current(c.path)?.revision ?? null;
                requireValue(actual === c.beforeSha256 || actual === c.afterSha256, "RECOVERY_CONFLICT", "External edit during recovery", { path: c.path });
                if (actual === c.afterSha256) {
                    if (tx.before[c.path] === null)
                        this.files.remove(c.path);
                    else
                        this.files.write(c.path, tx.before[c.path]!);
                }
            }
            tx.status = "rolled_back";
            tx.finishedAt = now();
            this.files.writeJson(`.rd/transactions/${id}.json`, tx);
        }
        this.files.remove(".rd/active.json", true);
        return tx;
    }
    restore(id: string, actor: string, reason: string) {
        const tx = this.transaction(id);
        requireValue(tx?.status === "committed", "INVALID_TRANSACTION", "Only a committed transaction can be restored");
        const changes = tx.proposal.changes.map(c => { const before = tx.before[c.path]; requireValue((before === null ? null : sha256(before)) === c.beforeSha256, "INVALID_TRANSACTION", "Backup hash mismatch"); return { path: c.path, beforeSha256: c.afterSha256, afterMarkdown: before }; });
        return this.propose({ actor, reason, changes, evidence: [] }, true);
    }
    revise(args: Record<string, unknown>) {
        const old = this.kb.get({ id: string(args.id, "id") });
        requireValue(old.format === "ko", "INVALID_ARGUMENT", "Successor revision currently requires KO format; legacy content can be edited without changing identity");
        requireValue(old.revision === args.revision, "STALE_SOURCE", "Source changed");
        requireValue(!old.frontmatter.successor && !["superseded", "archived"].includes(old.status ?? ""), "ALREADY_SUPERSEDED", "Revise the current successor instead of overwriting existing lineage");
        const nextId = string(args.newId, "newId"), nextPath = string(args.newPath, "newPath"), block = splitFrontmatter(old.markdown)!;
        const fields = parseYamlFields(block.text, old.path).fields;
        const oldText = "---\n" + stringify({ ...fields, status: "superseded", successor: nextId }) + "---\n" + old.body;
        // A successor revises an extracted unit; it is not a second adoption of the same span.
        const {rd_extraction_key: _extraction, ...successorFields}=fields;
        const nextText = "---\n" + stringify({ ...successorFields, object_id: nextId, title: args.title ?? old.title, status: "candidate", predecessor: old.id, successor: null, revises: [old.id] }) + "---\n" + string(args.body, "body");
        return this.propose({ ...args, changes: [{ path: old.path, beforeSha256: old.revision, afterMarkdown: oldText }, { path: nextPath, beforeSha256: null, afterMarkdown: nextText }] });
    }
    list(args:Record<string,unknown>={}) {
        const limit=integer(args.limit,50,1,100),offset=integer(args.offset,0,0,50000);
        return this.files.internalFiles(".rd/proposals").filter(p=>p.endsWith(".json"))
            .map(p=>({path:p,mtime:fs.statSync(this.files.absolute(p,true)).mtimeMs}))
            .sort((a,b)=>b.mtime-a.mtime||a.path.localeCompare(b.path)).slice(offset,offset+limit)
            .map(({path:p})=>{const id=path.basename(p,".json"),proposal=this.proposal(id),tx=this.transaction(id);
                const summary=tx?{id:tx.id,status:tx.status,createdAt:tx.createdAt,finishedAt:tx.finishedAt,failure:tx.failure}:null;
                return {proposal:{...proposal,changes:proposal.changes.map(({afterMarkdown,...change})=>change)},decision:this.decision(id),transaction:summary};});
    }
}

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { isForbiddenDataSource, isIndexablePath } from "../src/scope";
import { KnowledgeError, requireValue } from "./errors";
import { MAX_FILE_BYTES, type WorkspaceConfig } from "./types";
export const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export function canonical(value: unknown): string {
    requireValue(value !== undefined, "INVALID_JSON", "Undefined is not part of a signed JSON payload");
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonical).join(",")}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
}
export const now = () => new Date().toISOString();
export function artifactId(value: string): string {
    requireValue(/^[A-Za-z0-9][A-Za-z0-9_-]{0,120}$/.test(value), "INVALID_ID", "Invalid artifact id");
    return value;
}
function sameFile(a: fs.Stats, b: fs.Stats) { return a.dev === b.dev && a.ino === b.ino; }
/** Trusted local root. All descendant access rejects links/junctions and
 * traversal. This is not an OS sandbox against hostile concurrent actors. */
export class RootFiles {
    readonly root: string;
    constructor(root: string, create = false) {
        this.root = path.resolve(root);
        const ancestors: string[] = [];
        let current = this.root;
        for (;;) {
            ancestors.unshift(current);
            const parent = path.dirname(current);
            if (parent === current)
                break;
            current = parent;
        }
        for (const ancestor of ancestors) {
            if (!fs.existsSync(ancestor) && create)
                fs.mkdirSync(ancestor);
            const stat = fs.lstatSync(ancestor);
            requireValue(!stat.isSymbolicLink() && stat.isDirectory(), "UNSAFE_ROOT", "Root and ancestors must be ordinary directories");
        }
    }
    absolute(relative: string, internal = false, directory = false): string {
        const rootStat = fs.lstatSync(this.root);
        requireValue(rootStat.isDirectory() && !rootStat.isSymbolicLink(), "UNSAFE_ROOT", "Root is no longer an ordinary directory");
        requireValue(typeof relative === "string" && relative.length > 0 && !/[\\:\r\n\0]/.test(relative)
            && !path.posix.isAbsolute(relative), "INVALID_PATH", "Use a relative slash-separated path");
        const parts = relative.split("/");
        requireValue(parts.every(part => part !== "" && part !== "." && part !== ".." && !/[ .]$/.test(part)
            && !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)), "INVALID_PATH", "Unsafe path component");
        if (!internal)
            requireValue(directory
                ? !parts.some(part => part.startsWith(".")) && !isForbiddenDataSource(relative)
                : isIndexablePath(relative), "OUT_OF_SCOPE", "Knowledge access excludes hidden files, templates, attachments and non-Markdown files");
        else
            requireValue([".rd", ".proposals", ".contributions"].includes(parts[0]), "OUT_OF_SCOPE", "Unsupported internal artifact directory");
        const target = path.resolve(this.root, ...parts);
        const child = path.relative(this.root, target);
        requireValue(child !== "" && !child.startsWith("..") && !path.isAbsolute(child), "OUT_OF_SCOPE", "Path escapes the root");
        let current = this.root;
        for (let i = 0; i < parts.length; i++) {
            current = path.join(current, parts[i]);
            let stat: fs.Stats;
            try {
                stat = fs.lstatSync(current);
            }
            catch (err) {
                if ((err as NodeJS.ErrnoException).code === "ENOENT")
                    break;
                throw err;
            }
            requireValue(!stat.isSymbolicLink(), "UNSAFE_PATH", "Symbolic links and junctions are excluded", { path: relative });
            requireValue(i === parts.length - 1 ? stat.isFile() || stat.isDirectory() : stat.isDirectory(), "UNSAFE_PATH", "Non-directory ancestor");
        }
        return target;
    }
    exists(relative: string, internal = false): boolean { return fs.existsSync(this.absolute(relative, internal)); }
    read(relative: string, internal = false): {
        text: string;
        revision: string;
        mtime: number;
    } {
        const target = this.absolute(relative, internal), first = fs.lstatSync(target);
        requireValue(first.isFile() && first.size <= (internal ? 32 * 1024 * 1024 : MAX_FILE_BYTES), "FILE_LIMIT", "File is not a regular file or exceeds the size limit", { path: relative });
        const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
        try {
            const before = fs.fstatSync(fd);
            requireValue(sameFile(first, before), "SOURCE_CHANGED", "Source identity changed during open");
            const bytes = fs.readFileSync(fd), after = fs.fstatSync(fd);
            const current = fs.lstatSync(this.absolute(relative, internal));
            requireValue(!current.isSymbolicLink() && sameFile(after, current) && before.size === after.size
                && before.mtimeMs === after.mtimeMs && bytes.length === after.size, "SOURCE_CHANGED", "Source changed during read");
            let text: string;
            try {
                text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
            }
            catch {
                throw new KnowledgeError("INVALID_UTF8", "Markdown must be valid UTF-8", { path: relative });
            }
            return { text, revision: sha256(bytes), mtime: after.mtimeMs };
        }
        finally {
            fs.closeSync(fd);
        }
    }
    mkdirParent(relative: string, internal = false): void {
        this.absolute(relative, internal);
        const parts = relative.split("/");
        parts.pop();
        for (let i = 1; i <= parts.length; i++) {
            const partial = parts.slice(0, i).join("/");
            const target = this.absolute(partial, internal, true);
            if (!fs.existsSync(target))
                fs.mkdirSync(target);
            requireValue(fs.lstatSync(target).isDirectory() && !fs.lstatSync(target).isSymbolicLink(), "UNSAFE_PATH", "Unsafe parent directory");
        }
        this.absolute(relative, internal);
    }
    write(relative: string, text: string, internal = false, exclusive = false): void {
        this.mkdirParent(relative, internal);
        const target = this.absolute(relative, internal);
        if (exclusive) {
            const fd = fs.openSync(target, "wx", 0o600);
            try {
                fs.writeFileSync(fd, text, "utf8");
                fs.fsyncSync(fd);
            }
            finally {
                fs.closeSync(fd);
            }
            this.syncDirectory(path.dirname(target));
            return;
        }
        const temp = path.join(path.dirname(target), `.rd-write-${randomUUID()}.tmp`);
        const mode = fs.existsSync(target) ? fs.statSync(target).mode & 0o777 : 0o600;
        const fd = fs.openSync(temp, "wx", mode);
        try {
            fs.writeFileSync(fd, text, "utf8");
            fs.fsyncSync(fd);
        }
        finally {
            fs.closeSync(fd);
        }
        try {
            this.absolute(relative, internal);
            fs.renameSync(temp, target);
            this.syncDirectory(path.dirname(target));
        }
        finally {
            if (fs.existsSync(temp))
                fs.unlinkSync(temp);
        }
    }
    remove(relative: string, internal = false): void {
        const target = this.absolute(relative, internal);
        if (!fs.existsSync(target))
            return;
        requireValue(fs.lstatSync(target).isFile(), "UNSAFE_PATH", "Only an exact regular file may be removed");
        fs.unlinkSync(target);
        this.syncDirectory(path.dirname(target));
    }
    json<T>(relative: string): T { return JSON.parse(this.read(relative, true).text) as T; }
    writeJson(relative: string, value: unknown, exclusive = false): void { this.write(relative, JSON.stringify(value, null, 2) + "\n", true, exclusive); }
    internalFiles(dir: string): string[] {
        const target = this.absolute(dir, true);
        if (!fs.existsSync(target))
            return [];
        return fs.readdirSync(target, { withFileTypes: true }).filter(e => e.isFile() && !e.isSymbolicLink()).map(e => `${dir}/${e.name}`).sort();
    }
    config(): WorkspaceConfig | null {
        if (!this.exists(".rd/workspace.json", true))
            return null;
        const config = this.json<WorkspaceConfig>(".rd/workspace.json");
        requireValue(config.schema === "rd-workspace/1" && /^[a-f0-9-]{36}$/.test(config.workspaceId)
            && typeof config.approvalPublicKey === "string", "INVALID_WORKSPACE", "Unsupported workspace metadata");
        return config;
    }
    scan(): {
        paths: string[];
        diagnostics: {
            type: string;
            path: string;
        }[];
    } {
        const paths: string[] = [], diagnostics: {
            type: string;
            path: string;
        }[] = [];
        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir ? this.absolute(dir, false, true) : this.root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
                const relative = dir ? `${dir}/${entry.name}` : entry.name;
                if (entry.name.startsWith(".") || isForbiddenDataSource(relative))
                    continue;
                if (entry.isSymbolicLink()) {
                    diagnostics.push({ type: "excluded_symlink", path: relative });
                    continue;
                }
                if (entry.isDirectory())
                    walk(relative);
                else if (entry.isFile() && isIndexablePath(relative))
                    paths.push(relative);
                requireValue(paths.length <= 50000, "FILE_LIMIT", "Workspace exceeds 50,000 Markdown files");
            }
        };
        walk("");
        return { paths, diagnostics };
    }
    private syncDirectory(directory: string): void {
        if (process.platform === "win32")
            return; // Windows does not support fsync on directory descriptors.
        const fd = fs.openSync(directory, "r");
        try {
            fs.fsyncSync(fd);
        }
        finally {
            fs.closeSync(fd);
        }
    }
}
/** Serialize cooperating RD processes. Never evict a live/foreign lock by age. */
export async function workspaceLock<T>(files: RootFiles, action: () => Promise<T>, timeoutMs = 5000): Promise<T> {
    if (files.config() === null)
        return action();
    const relative = ".rd/write.lock", token = randomUUID(), deadline = Date.now() + timeoutMs;
    for (;;) {
        try {
            files.write(relative, JSON.stringify({ pid: process.pid, host: hostname(), token, createdAt: now() }), true, true);
            break;
        }
        catch (err) {
            if ((err as NodeJS.ErrnoException).code !== "EEXIST")
                throw err;
            let lock: {
                pid: number;
                host: string;
                token: string;
            };
            try {
                lock = files.json(relative);
            }
            catch (readError) {
                if (Date.now() >= deadline)
                    throw new KnowledgeError("INVALID_LOCK", "Lock could not be read; operator inspection required");
                await new Promise(resolve => setTimeout(resolve, 25));
                continue;
            }
            requireValue(Number.isInteger(lock.pid) && lock.pid > 0 && typeof lock.token === "string", "INVALID_LOCK", "Malformed lock requires operator inspection");
            requireValue(lock.host === hostname(), "FOREIGN_LOCK", "A lock from another host cannot be automatically replaced");
            let dead = false;
            try {
                process.kill(lock.pid, 0);
            }
            catch (e) {
                dead = (e as NodeJS.ErrnoException).code === "ESRCH";
            }
            if (dead && files.json<{
                token: string;
            }>(relative).token === lock.token) {
                files.remove(relative, true);
                continue;
            }
            requireValue(Date.now() < deadline, "WORKSPACE_BUSY", "Another RD process holds the workspace lock");
            await new Promise(resolve => setTimeout(resolve, 25));
        }
    }
    try {
        return await action();
    }
    finally {
        if (files.exists(relative, true) && files.json<{
            token: string;
        }>(relative).token === token)
            files.remove(relative, true);
    }
}

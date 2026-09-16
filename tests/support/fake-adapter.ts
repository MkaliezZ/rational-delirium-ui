import type { ReadAdapter } from "../../src/platform/obsidian-read-adapter";

/** In-memory fake vault with a read counter. Deliberately provides
 * NO write methods at all. */
export class FakeAdapter implements ReadAdapter {
  private readonly files = new Map<string, string>();
  private readonly mtimes = new Map<string, number>();
  readsByPath = new Map<string, number>();
  reads = 0;

  set(path: string, content: string, mtime = 1000): void {
    this.files.set(path, content);
    this.mtimes.set(path, mtime);
  }

  moveFile(oldPath: string, newPath: string): void {
    const c = this.files.get(oldPath);
    const m = this.mtimes.get(oldPath);
    if (c === undefined) return;
    this.files.set(newPath, c);
    this.mtimes.set(newPath, m ?? 0);
    this.files.delete(oldPath);
    this.mtimes.delete(oldPath);
  }

  dropFile(path: string): void {
    this.files.delete(path);
    this.mtimes.delete(path);
  }

  list(): readonly string[] {
    return [...this.files.keys()].sort();
  }

  async read(path: string): Promise<string> {
    this.reads += 1;
    this.readsByPath.set(path, (this.readsByPath.get(path) ?? 0) + 1);
    const content = this.files.get(path);
    if (content === undefined) throw new Error("not found: " + path);
    return content;
  }

  readSync(path: string): string {
    const content = this.files.get(path);
    if (content === undefined) throw new Error("not found: " + path);
    return content;
  }

  mtime(path: string): number {
    return this.mtimes.get(path) ?? 0;
  }

  readsOf(path: string): number {
    return this.readsByPath.get(path) ?? 0;
  }
}

export function fixtureNote(opts: {
  path: string;
  type: string;
  id?: string;
  status?: string;
  tags?: string[];
  created?: string;
  lastVerified?: string;
  body?: string;
  frontmatterExtra?: string[];
}): string {
  const lines = ["---"];
  lines.push(`type: ${opts.type}`);
  if (opts.id !== undefined) lines.push(`id: ${opts.id}`);
  if (opts.status !== undefined) lines.push(`status: ${opts.status}`);
  if (opts.created !== undefined) lines.push(`created: ${opts.created}`);
  if (opts.lastVerified !== undefined) lines.push(`last_verified: ${opts.lastVerified}`);
  for (const extra of opts.frontmatterExtra ?? []) lines.push(extra);
  if (opts.tags !== undefined && opts.tags.length > 0) {
    lines.push("tags:");
    for (const t of opts.tags) lines.push(`  - ${t}`);
  }
  lines.push("---", "");
  lines.push(`# ${opts.id ?? opts.path} — fixture`);
  lines.push("");
  lines.push(opts.body ?? "");
  return lines.join("\n");
}

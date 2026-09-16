import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FakeAdapter } from "./support/fake-adapter";
import type { ReadAdapter } from "../src/platform/obsidian-read-adapter";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function allFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    out.push(p);
    if (statDir(p)) out.push(...allFiles(p));
  }
  return out;
}

function statDir(p: string): boolean {
  try {
    return readdirSync(p).length >= 0;
  } catch {
    return false;
  }
}

describe("read-only and dependency boundary", () => {
  it("ReadAdapter interface exposes no write method", () => {
    const protoKeys = ["list", "read", "mtime"];
    const fake = new FakeAdapter();
    const ownMethods = new Set(
      Object.getOwnPropertyNames(Object.getPrototypeOf(fake)).concat(
        Object.getOwnPropertyNames(fake),
      ),
    );
    // The adapter surface exposed to core is exactly {list, read, mtime}
    // plus test-only bookkeeping; no storage-mutation verb may appear.
    const banned = [
      "create", "modify", "delete", "rename", "process",
      "processFrontMatter", "write", "append",
    ];
    for (const method of banned) {
      expect(ownMethods.has(method), method).toBe(false);
    }
    for (const k of protoKeys) {
      expect(typeof (fake as unknown as Record<string, unknown>)[k]).toBe("function");
    }
    const adapter: ReadAdapter = fake; // structural check
    expect(adapter.list().length).toBeGreaterThanOrEqual(0);
  });

  it("runtime src contains no forbidden API usage", () => {
    const forbidden: Array<[RegExp, string]> = [
      [/vault\.modify\(/, "Vault.modify"],
      [/vault\.create\(/, "Vault.create"],
      [/vault\.delete\(/, "Vault.delete"],
      [/vault\.rename\(/, "Vault.rename"],
      [/vault\.process\(/, "Vault.process"],
      [/processFrontMatter/, "processFrontMatter"],
      [/saveData/, "saveData"],
      [/loadData/, "loadData"],
      [/localStorage/, "localStorage"],
      [/indexedDB/, "indexedDB"],
      [/\bfrom ["']fs["']/, "fs import"],
      [/node:fs/, "node:fs"],
      [/child_process/, "child_process"],
      [/\bhttps?:\/\//, "network endpoint"],
      [/astra\/bridge/, "bridge import"],
      [/\bbridge_state\b/, "bridge_state read"],
    ];
    const files = allFiles(join(root, "src"));
    for (const file of files) {
      if (!file.endsWith(".ts")) continue;
      const text = readFileSync(file, "utf8");
      for (const [re, label] of forbidden) {
        // main.ts legitimately wires Obsidian events; it must still
        // avoid all of the above except none of them appear there.
        expect(text.match(re), `${file}: ${label}`).toBeNull();
      }
    }
  });

  it("tests never touch the real vault path", () => {
    const files = allFiles(join(root, "tests")).filter((f) => !f.endsWith("read-only-boundary.test.ts"));
    for (const file of files) {
      if (!file.endsWith(".ts")) continue;
      const text = readFileSync(file, "utf8");
      expect(text.includes("F:\\Rational-Delirium") || text.includes("F:/Rational-Delirium")).toBe(false);
    }
  });

  it("obsidian-read-adapter defines only the narrow read surface", () => {
    const text = readFileSync(join(root, "src", "platform", "obsidian-read-adapter.ts"), "utf8");
    for (const banned of ["modify", "create", "delete", "rename", "process", "write", "append"]) {
      expect(text.includes(banned + "(")).toBe(false);
    }
  });
});

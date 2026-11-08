import type { RDObject } from "./model";

export const KNOWLEDGE_ROOTS: readonly string[] = [
  "CASES",
  "EVIDENCE",
  "HYPOTHESES",
  "LOOPS",
  "ARCHIVE",
];

const FORBIDDEN_DATA_PREFIXES: readonly string[] = [
  ".astra/",
  ".obsidian/",
  "Templates/",
  "Attachments/",
  "00_HOME/RD_DEMO/",
];

export function normalizeVaultPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "");
}

export function rootOf(path: string): string {
  const norm = normalizeVaultPath(path);
  return norm.split("/")[0] ?? "";
}

/** Candidate = lives under a knowledge root. NOT yet an RD object:
 * eligibility requires frontmatter.type. */
export function isCandidatePath(path: string): boolean {
  return KNOWLEDGE_ROOTS.includes(rootOf(path));
}

/** Runtime UI must never read these as Context/index data. */
export function isForbiddenDataSource(path: string): boolean {
  const norm = normalizeVaultPath(path);
  return FORBIDDEN_DATA_PREFIXES.some(
    (prefix) => norm.toLowerCase() === prefix.slice(0, -1).toLowerCase() || norm.toLowerCase().startsWith(prefix.toLowerCase()),
  );
}

/** Both schemas share this read boundary. Legacy eligibility still requires
 * a knowledge root; declared KOs may live in any ordinary Markdown folder. */
export function isIndexablePath(path: string): boolean {
  const norm = normalizeVaultPath(path);
  return !norm.startsWith("/") && !/^[A-Za-z]:/.test(norm) && norm.toLowerCase().endsWith(".md") && !norm.split("/").some(
    (part) => part === ".." || part === "." || part.startsWith("."))
    && !isForbiddenDataSource(norm);
}

/** Default normal working set excludes proof and demo objects. */
export function inNormalWorkingSet(obj: RDObject): boolean {
  return !obj.proof && !obj.demo;
}

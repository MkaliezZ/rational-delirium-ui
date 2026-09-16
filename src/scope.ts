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
    (prefix) => norm === prefix.slice(0, -1) || norm.startsWith(prefix),
  );
}

/** Default normal working set excludes proof and demo objects. */
export function inNormalWorkingSet(obj: RDObject): boolean {
  return !obj.proof && !obj.demo;
}

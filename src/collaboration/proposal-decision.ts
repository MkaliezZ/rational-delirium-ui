/** v1.8 — Human decision on proposals: the ONE controlled write
 * path of the RD plugin.
 *
 * A Human explicitly records approve/reject on a PROPOSAL artifact.
 * The recording touches exactly two places in the artifact file:
 * the `## Status` section (replaced with the decision plus its
 * meaning boundary) and the `## History` section (one appended
 * line — History is append-only by contract). Every other byte is
 * preserved.
 *
 * Boundaries, by construction and wording:
 * - approve is a RECORDED HUMAN ACTION. It is not truth
 *   validation, not agent trust, and not execution: nothing runs,
 *   nothing applies, no vault knowledge object is modified.
 * - The write is narrow: only `.proposals/*.md` files, only this
 *   transform, only on explicit user action. There is no executor,
 *   no apply path, no permission model.
 * - Execution of an approved proposal happens OUTSIDE RD by the
 *   external agent, limited to the approved scope, and MUST be
 *   followed by a Contribution Record (see the agent skill).
 */

export type ProposalDecision = "approved" | "rejected";

export type DecisionResult =
  | { readonly state: "written"; readonly decision: ProposalDecision }
  | { readonly state: "missing" }
  | { readonly state: "unavailable"; readonly reason: string }
  | { readonly state: "invalid"; readonly reason: string };

/** Write port for recording decisions. The Obsidian implementation
 * guards the path (.proposals/ markdown only), reads the CURRENT
 * text, applies the pure transform below, and writes it back. */
export interface ProposalDecisionPort {
  recordDecision(path: string, decision: ProposalDecision): Promise<DecisionResult>;
}

const STATUS_HEADER = /^##\s+Status\s*$/m;
const HISTORY_HEADER = /^##\s+History\s*$/m;

export function isProposalArtifactPath(path: string): boolean {
  // Exactly one filename segment under .proposals/, no traversal,
  // no nested paths, no backslashes — the narrow write surface.
  return /^\.proposals\/(?!\.\.(?:\/|$))[^\/]+\.md$/.test(path);
}

/** Can a decision be recorded on this proposal text? Only when a
 * Status section exists and currently reads `pending`. Decided or
 * malformed proposals are refused — decisions are recorded once. */
export function isDecidableProposalText(text: string): boolean {
  const m = STATUS_HEADER.exec(text);
  if (m === null) return false;
  const rest = text.slice(m.index + m[0].length);
  const next = /^##\s+/m.exec(rest);
  const body = (next === null ? rest : rest.slice(0, next.index)).trim();
  return body === "pending";
}

function sectionBounds(text: string, header: RegExp): { start: number; end: number } | null {
  const m = header.exec(text);
  if (m === null) return null;
  const start = m.index + m[0].length;
  const after = text.slice(start);
  const next = /^##\s+/m.exec(after);
  const end = next === null ? text.length : start + next.index;
  return { start, end };
}

/**
 * Pure transform: record a Human decision in a proposal text.
 * - `## Status` body becomes the decision word plus the meaning
 *   boundary (recorded human action; not truth validation; not
 *   agent trust).
 * - One line is APPENDED inside the `## History` section (a
 *   History section is created at the end when absent).
 * - All other bytes are preserved exactly.
 */
export function applyDecisionToProposalText(
  text: string,
  decision: ProposalDecision,
  timestamp: string,
): { ok: true; text: string } | { ok: false; reason: string } {
  const status = sectionBounds(text, STATUS_HEADER);
  if (status === null) {
    return { ok: false, reason: "no Status section" };
  }
  if (!isDecidableProposalText(text)) {
    return { ok: false, reason: "proposal is not pending (decisions are recorded once)" };
  }

  const newStatusBody =
    `\n\n${decision}\n\n` +
    `> Human decision recorded ${timestamp} — a recorded human action.\n` +
    `> Approval is not truth validation and not agent trust. Execution, if any,\n` +
    `> happens outside RD, limited to the approved scope.\n\n`;

  let updated = text.slice(0, status.start) + newStatusBody + text.slice(status.end);

  const historyLine =
    `- ${timestamp} — Human decision: ${decision} ` +
    "(recorded via RD collaboration surface; not truth validation)";

  const history = sectionBounds(updated, HISTORY_HEADER);
  if (history === null) {
    const trimmedEnd = updated.replace(/\s*$/, "");
    updated = `${trimmedEnd}\n\n## History\n\n${historyLine}\n`;
  } else {
    const historyBody = updated.slice(history.start, history.end).replace(/\s*$/, "");
    updated =
      updated.slice(0, history.start) + `\n${historyBody}\n${historyLine}\n` + updated.slice(history.end);
  }
  return { ok: true, text: updated };
}

/** v1.6.1 §4 — semantic theme token foundation (boundary only).
 *
 * Defines the token NAME space of the RD presentation layer per the
 * v1.3.5 semantic system and the v1.6.0 §6 theme architecture: one
 * invariant semantic layer (what each category IS) plus future
 * interchangeable themes that may only remap VALUES.
 *
 * This module creates NO themes and NO values: it fixes the naming
 * convention (`--rd-<category>-<role>`), the category membership,
 * and the future mapping point (RD_THEME_ATTR). Tokens describe
 * presentation; they do not define meaning. No token may encode
 * truth, confidence, ranking or correctness — those categories do
 * not exist by design.
 */

export const RD_TOKEN_VERSION = "rd-tokens/1";

/** Element attribute marking an RD surface that participates in the
 * token system. Future themes set this attribute's value (e.g.
 * "rational-archive"); the semantic layer never changes with it. */
export const RD_THEME_ATTR = "data-rd-theme";

export const RD_TOKEN_CATEGORIES = [
  "identity",
  "provenance",
  "relation",
  "conflict",
  "availability",
  "lifecycle-display",
  "surface",
] as const;

export type RDTokenCategory = (typeof RD_TOKEN_CATEGORIES)[number];

/** Canonical token names, grouped by semantic category. Roles are
 * presentation roles (text, marker, rule, surface); "lifecycle-
 * display" is a DISPLAY category — lifecycle MEANING stays in the
 * knowledge model, tokens only style declared states neutrally. */
export const RD_TOKENS: Readonly<Record<RDTokenCategory, readonly string[]>> = Object.freeze({
  identity: Object.freeze([
    "--rd-identity-title-text",
    "--rd-identity-meta-text",
    "--rd-identity-id-text",
    "--rd-identity-rule",
  ]),
  provenance: Object.freeze([
    "--rd-provenance-observation-text",
    "--rd-provenance-evidence-text",
    "--rd-provenance-inference-text",
    "--rd-provenance-conclusion-text",
    "--rd-provenance-layer-rule",
  ]),
  relation: Object.freeze([
    "--rd-relation-type-text",
    "--rd-relation-endpoint-text",
    "--rd-relation-unresolved-text",
    "--rd-relation-rule",
  ]),
  conflict: Object.freeze([
    "--rd-conflict-marker-text",
    "--rd-conflict-marker-rule",
  ]),
  availability: Object.freeze([
    "--rd-availability-available-text",
    "--rd-availability-missing-text",
    "--rd-availability-ambiguous-text",
    "--rd-availability-unavailable-text",
  ]),
  "lifecycle-display": Object.freeze([
    "--rd-lifecycle-candidate-text",
    "--rd-lifecycle-active-text",
    "--rd-lifecycle-superseded-text",
    "--rd-lifecycle-archived-text",
  ]),
  surface: Object.freeze([
    "--rd-surface-base",
    "--rd-surface-raised",
    "--rd-surface-rule",
    "--rd-surface-focus-rule",
  ]),
});

const TOKEN_RE = /^--rd-([a-z-]+)-[a-z-]+$/;

/** Category of a token name, or null for names outside the system.
 * Membership is by exact list match, not prefix guesswork. */
export function rdTokenCategory(token: string): RDTokenCategory | null {
  for (const category of RD_TOKEN_CATEGORIES) {
    if (RD_TOKENS[category].includes(token)) return category;
  }
  return null;
}

/** Structural validity: every listed name follows the convention. */
export function isWellFormedTokenName(token: string): boolean {
  return TOKEN_RE.test(token);
}

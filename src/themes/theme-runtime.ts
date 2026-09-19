/** v1.6.2 §1 — theme runtime architecture.
 *
 * A theme is a PRESENTATION mapping only: a validated set of values
 * for the canonical v1.6.1 semantic tokens, plus an id and label.
 * Themes may change colors/typography flavor/decoration; they must
 * never encode meaning (v1.6.0 §6): no token implies truth,
 * confidence, ranking, importance or authority. Validation enforces
 * exact membership in the canonical token set — a theme cannot add,
 * drop or smuggle semantic names.
 *
 * Application sets the RD_THEME_ATTR and the token custom
 * properties on a THEME ROOT element (an RD surface), never on the
 * whole Obsidian workspace: RD never forces a vault-wide theme
 * (v1.3.5 §3).
 *
 * Selection is explicit and session-only (in-memory): no content
 * detection, no AI selection, and no persistence verbs of any kind
 * (the repository read-only boundary forbids plugin data storage
 * APIs in src).
 */

import {
  RD_THEME_ATTR,
  RD_TOKENS,
  RD_TOKEN_CATEGORIES,
  type RDTokenCategory,
} from "../architecture/theme-tokens";

export interface RDThemeDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Every canonical token name → presentation value. Exactly the
   * canonical set: validated on registration. */
  readonly tokens: Readonly<Record<string, string>>;
}

export const CANONICAL_TOKEN_NAMES: readonly string[] = Object.freeze(
  RD_TOKEN_CATEGORIES.flatMap((c: RDTokenCategory) => RD_TOKENS[c]),
);

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const FORBIDDEN_MEANING = [
  "truth", "confiden", "rank", "score", "winner", "correct", "authority", "glow",
];

export type ThemeValidation =
  | { readonly valid: true }
  | { readonly valid: false; readonly problems: readonly string[] };

/** Structural + neutrality validation of a theme definition. */
export function validateThemeDefinition(theme: RDThemeDefinition): ThemeValidation {
  const problems: string[] = [];
  if (!/^[a-z][a-z0-9-]*$/.test(theme.id)) {
    problems.push(`invalid theme id: ${theme.id}`);
  }
  if (FORBIDDEN_MEANING.some((w) => theme.id.includes(w))) {
    problems.push(`theme id encodes forbidden meaning: ${theme.id}`);
  }
  const names = Object.keys(theme.tokens);
  const missing = CANONICAL_TOKEN_NAMES.filter((t) => !(t in theme.tokens));
  const extra = names.filter((t) => !CANONICAL_TOKEN_NAMES.includes(t));
  for (const t of missing) problems.push(`missing token: ${t}`);
  for (const t of extra) problems.push(`non-canonical token: ${t}`);
  for (const [name, value] of Object.entries(theme.tokens)) {
    if (FORBIDDEN_MEANING.some((w) => name.includes(w))) {
      problems.push(`token name encodes forbidden meaning: ${name}`);
    }
    if (!HEX_RE.test(value)) {
      problems.push(`token ${name} has a non-hex value: ${value}`);
    }
  }
  return problems.length === 0 ? { valid: true } : { valid: false, problems };
}

export class RDThemeRegistry {
  private readonly themes = new Map<string, RDThemeDefinition>();

  register(theme: RDThemeDefinition): void {
    const check = validateThemeDefinition(theme);
    if (!check.valid) {
      throw new Error(`invalid theme "${theme.id}": ${check.problems.join("; ")}`);
    }
    if (this.themes.has(theme.id)) {
      throw new Error(`duplicate theme id: ${theme.id}`);
    }
    this.themes.set(theme.id, theme);
  }

  get(id: string): RDThemeDefinition | undefined {
    return this.themes.get(id);
  }

  list(): readonly RDThemeDefinition[] {
    return [...this.themes.values()];
  }
}

/** Apply a theme to a theme root (an RD surface element): sets the
 * theme attribute and every token custom property inline. Changes
 * presentation only — no other attribute, class or content of the
 * root is touched. Returns the applied token count. */
export function applyRDTheme(root: HTMLElement, theme: RDThemeDefinition): number {
  root.setAttribute(RD_THEME_ATTR, theme.id);
  let applied = 0;
  for (const [token, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(token, value);
    applied += 1;
  }
  return applied;
}

/** Explicit, session-only theme selection. No detection, no
 * persistence: the selection lives in memory and resets on reload
 * until a future phase adds an authorized persistence path. */
export class RDThemeController {
  private current: RDThemeDefinition;

  constructor(private readonly registry: RDThemeRegistry, defaultThemeId: string) {
    const def = registry.get(defaultThemeId);
    if (def === undefined) {
      throw new Error(`unknown default theme: ${defaultThemeId}`);
    }
    this.current = def;
  }

  getCurrent(): RDThemeDefinition {
    return this.current;
  }

  /** Explicit user selection only. Unknown ids are refused. */
  setTheme(id: string): RDThemeDefinition {
    const def = this.registry.get(id);
    if (def === undefined) {
      throw new Error(`unknown theme: ${id}`);
    }
    this.current = def;
    return def;
  }

  list(): readonly RDThemeDefinition[] {
    return this.registry.list();
  }
}

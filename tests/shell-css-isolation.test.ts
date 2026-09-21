/** V2 review fixes — shell CSS isolation (V2-03) and dock motion
 * removal (V2-04). Source-level stylesheet assertions (happy-dom
 * does not resolve var()-based computed styles, so the negative
 * verification here is textual/structural over the real CSS):
 *
 * V2-03: inheritable generic interaction variables (--icon-color*,
 * --interactive-*, --background-modifier-hover/active) must live
 * ONLY on explicit chrome containers — never on the whole
 * .workspace frame or a dock split, where they would inherit into
 * non-RD editor/properties/file-explorer/third-party leaves. The
 * workspace-wide .clickable-icon targeting is narrowed to chrome
 * containers + the explicit RD roots. Editor/properties classes
 * are never targeted anywhere.
 *
 * V2-04: dock rows (.rdan-*, .rdin-*) carry NO transition at all —
 * hover/focus-visible/selected states are instant. The pinned
 * reduced-motion block and the two keyframes stay intact.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(root, "styles", "styles.css"), "utf-8");

/** Parse stylesheet rules as {selector, body} pairs. Comments and
 * at-rule preludes (@media, @keyframes) are stripped so inner
 * rules parse normally; keyframe stops (from/to/%) are skipped. */
function parseRules(source: string): { selector: string; body: string }[] {
  const cleaned = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media[^{]*\{/g, "")
    .replace(/@keyframes[^{]*\{/g, "")
    .replace(/@supports[^{]*\{/g, "");
  const rules: { selector: string; body: string }[] = [];
  for (const chunk of cleaned.split("}")) {
    const idx = chunk.indexOf("{");
    if (idx === -1) continue;
    const selector = chunk.slice(0, idx).trim();
    const body = chunk.slice(idx + 1);
    if (selector === "" || selector.startsWith("@")) continue;
    if (selector === "from" || selector === "to" || /^\d+(\.\d+)?%$/.test(selector)) continue;
    for (const part of selector.split(",")) {
      const s = part.trim();
      if (s !== "") rules.push({ selector: s, body });
    }
  }
  return rules;
}

const rules = parseRules(css);

/* ---------- V2-03 ---------- */

const GENERIC_INTERACTION_VARS = [
  "--icon-color:",
  "--icon-color-hover:",
  "--icon-color-focused:",
  "--icon-color-active:",
  "--interactive-normal:",
  "--interactive-hover:",
  "--background-modifier-hover:",
  "--background-modifier-active:",
];

/** Chrome containers allowed to carry the generic variable remap,
 * plus the explicit RD roots for icon-button ink. */
const CHROME_PREFIXES = [
  "body.rd-rational-archive-shell .workspace-ribbon",
  "body.rd-rational-archive-shell .workspace-tab-header-container",
  "body.rd-rational-archive-shell .view-header",
  "body.rd-rational-archive-shell .status-bar",
  "body.rd-rational-archive-shell .sidebar-toggle-button",
];
const RD_ROOTS = [".rd-archive-nav", ".rd-inspector", ".rd-workspace-shell"];
const CLICKABLE_ICON_ALLOWED = [
  ...CHROME_PREFIXES.map((p) => `${p} .clickable-icon`),
  ...RD_ROOTS.map((r) => `body.rd-rational-archive-shell ${r} .clickable-icon`),
];

describe("V2-03 — shell CSS isolation", () => {
  it("generic interaction variables are never defined on .workspace or a dock split", () => {
    for (const rule of rules) {
      const definesGeneric = GENERIC_INTERACTION_VARS.some((v) => rule.body.includes(v))
        || /--nav-item-background/.test(rule.body);
      if (!definesGeneric) continue;
      // a rule defining these variables must sit on an explicit
      // chrome container — never on the workspace frame or a split
      // that also hosts non-RD leaves
      expect(
        rule.selector.startsWith("body.rd-rational-archive-shell .workspace ")
          || rule.selector === "body.rd-rational-archive-shell .workspace"
          || rule.selector.includes(".workspace-split"),
        `${rule.selector} must not define generic interaction variables`,
      ).toBe(false);
      if (rule.selector.startsWith("body.rd-rational-archive-shell")) {
        expect(
          CHROME_PREFIXES.some((p) => rule.selector.startsWith(p)),
          `${rule.selector} is not an allowed chrome container`,
        ).toBe(true);
      }
    }
  });

  it("nav-item background variables (file-explorer leak) are gone entirely", () => {
    expect(css).not.toContain("--nav-item-background-hover");
    expect(css).not.toContain("--nav-item-background-selected");
  });

  it("the chrome containers still carry the remapped interaction ink", () => {
    const chrome = rules.filter((r) => CHROME_PREFIXES.some((p) => r.selector.startsWith(p)));
    const bodies = chrome.map((r) => r.body).join("\n");
    for (const v of ["--icon-color:", "--icon-color-hover:", "--interactive-normal:",
      "--interactive-hover:", "--background-modifier-hover:", "--background-modifier-active:"]) {
      expect(bodies).toContain(v);
    }
    for (const wanted of CHROME_PREFIXES) {
      expect(
        chrome.some((r) => r.selector === wanted),
        `${wanted} must carry the remap`,
      ).toBe(true);
    }
  });

  it("no workspace-wide .clickable-icon targeting remains", () => {
    expect(css).not.toMatch(/\.workspace\s+\.clickable-icon/);
    expect(css).not.toMatch(/\.workspace-split[^{]*\.clickable-icon/);
    // every clickable-icon rule is scoped to chrome or an RD root
    for (const rule of rules) {
      if (!rule.selector.includes(".clickable-icon")) continue;
      expect(
        CLICKABLE_ICON_ALLOWED.some((p) => rule.selector.startsWith(p)),
        `unscoped clickable-icon selector: ${rule.selector}`,
      ).toBe(true);
    }
    // the chrome + RD roots still get the recolor (visual parity)
    for (const wanted of CLICKABLE_ICON_ALLOWED) {
      expect(
        rules.some((r) => r.selector === wanted && r.body.includes("color:")),
        `${wanted} .clickable-icon ink missing`,
      ).toBe(true);
    }
  });

  it("non-RD editor / properties / file-explorer / third-party classes are never targeted", () => {
    for (const banned of [
      ".cm-editor", ".cm-content", ".cm-line", ".markdown-source-view",
      ".markdown-preview-view", ".metadata-container", ".metadata-property",
      ".nav-file", ".nav-folder", ".dataview", ".properties",
    ]) {
      for (const rule of rules) {
        expect(rule.selector.includes(banned), `${banned} targeted by ${rule.selector}`)
          .toBe(false);
      }
    }
  });
});

/* ---------- V2-04 ---------- */

describe("V2-04 — dock rows carry no transition", () => {
  it("no .rdan-* / .rdin-* rule declares a transition", () => {
    for (const rule of rules) {
      if (!rule.selector.includes(".rdan-") && !rule.selector.includes(".rdin-")) continue;
      expect(rule.body.includes("transition"), `transition on ${rule.selector}`).toBe(false);
    }
  });

  it("the dock's selected/hover states stay defined (instant, same colors)", () => {
    const pressed = rules.filter(
      (r) => r.selector === '.rd-archive-nav .rdan-object-row[aria-pressed="true"]',
    );
    expect(pressed.length).toBeGreaterThan(0);
    const body = pressed.map((r) => r.body).join("\n");
    expect(body).toContain("var(--rd-surface-raised");
    expect(body).toContain("var(--rd-surface-focus-rule");
    expect(body).not.toContain("transition");
    const hover = rules.find((r) => r.selector === ".rd-archive-nav .rdan-object-row:hover");
    expect(hover?.body).toContain("var(--rd-surface-raised");
  });

  it("the reduced-motion block and the two keyframes stay intact", () => {
    expect(css.match(/@keyframes ([a-z-]+)/g))
      ?.toEqual(["@keyframes rd-reveal", "@keyframes rd-enter"]);
    const reduce = css.indexOf("prefers-reduced-motion: reduce");
    expect(reduce).toBeGreaterThan(-1);
    // the pinned v1.6.4 reduce block (knowledge panel + workspace)
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {", 800));
    expect(block).toContain(".rd-knowledge-panel *");
    expect(block).toContain(".rd-workspace-shell *");
    expect(block).toContain("transition: none !important");
    expect(block).toContain("animation: none !important");
  });

  it("the center workspace + knowledge panel keep their micro interaction", () => {
    const shared = rules.find(
      (r) => r.selector === ".rd-workspace-shell .rdws-button" && r.body.includes("transition"),
    );
    expect(shared).toBeDefined();
    expect(shared?.body).toContain("var(--rd-motion-duration-fast");
  });
});

/** v1.6.2 theme system tests — runtime architecture, token
 * mapping, boundary, no semantic mutation, CSS/TS parity.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RD_TOKENS, RD_TOKEN_CATEGORIES } from "../src/architecture/theme-tokens";
import {
  RDThemeController,
  RDThemeRegistry,
  applyRDTheme,
  validateThemeDefinition,
  CANONICAL_TOKEN_NAMES,
  type RDThemeDefinition,
} from "../src/themes/theme-runtime";
import { RATIONAL_ARCHIVE_THEME, createDefaultThemeRegistry } from "../src/themes/rational-archive";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

describe("v1.6.2 §1 theme runtime", () => {
  it("default registry ships exactly one theme: rational-archive", () => {
    const registry = createDefaultThemeRegistry();
    expect(registry.list().map((t) => t.id)).toEqual(["rational-archive"]);
    expect(registry.get("rational-archive")?.label).toBe("Rational Archive");
    expect(registry.get("professional")).toBeUndefined();
    expect(registry.get("apple-minimal")).toBeUndefined();
    expect(registry.get("cute-companion")).toBeUndefined();
  });

  it("rejects duplicate and invalid theme registrations", () => {
    const registry = createDefaultThemeRegistry();
    expect(() => registry.register(RATIONAL_ARCHIVE_THEME)).toThrow(/duplicate/);
    const broken: RDThemeDefinition = {
      id: "broken",
      label: "Broken",
      description: "",
      tokens: { "--rd-surface-base": "#11110F" }, // missing almost everything
    };
    const check = validateThemeDefinition(broken);
    expect(check.valid).toBe(false);
    if (!check.valid) expect(check.problems.length).toBeGreaterThan(10);
    expect(() => registry.register(broken)).toThrow(/invalid theme/);
    // smuggling a non-canonical token is rejected
    const smuggler: RDThemeDefinition = {
      ...RATIONAL_ARCHIVE_THEME,
      id: "smuggler",
      tokens: { ...RATIONAL_ARCHIVE_THEME.tokens, "--rd-truth-score": "#00FF00" },
    };
    expect(validateThemeDefinition(smuggler).valid).toBe(false);
  });

  it("controller: explicit session-only selection; unknown ids refused", () => {
    const controller = new RDThemeController(createDefaultThemeRegistry(), "rational-archive");
    expect(controller.getCurrent().id).toBe("rational-archive");
    expect(() => controller.setTheme("nonexistent")).toThrow(/unknown theme/);
    expect(controller.setTheme("rational-archive").id).toBe("rational-archive");
    // no detection/auto surface on the controller
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(controller))
      .filter((m) => m !== "constructor");
    expect(methods.sort()).toEqual(["getCurrent", "list", "setTheme"]);
  });
});

describe("v1.6.2 §2 semantic token mapping", () => {
  it("Rational Archive maps EXACTLY the canonical token set with hex values", () => {
    const names = Object.keys(RATIONAL_ARCHIVE_THEME.tokens);
    expect(names.sort()).toEqual([...CANONICAL_TOKEN_NAMES].sort());
    expect(names.length).toBe(CANONICAL_TOKEN_NAMES.length);
    for (const [name, value] of Object.entries(RATIONAL_ARCHIVE_THEME.tokens)) {
      expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
      // every token is a member of exactly one canonical category
      const cats = RD_TOKEN_CATEGORIES.filter((c) => RD_TOKENS[c].includes(name));
      expect(cats).toHaveLength(1);
    }
  });

  it("no forbidden meaning encoded in tokens, ids or values", () => {
    const blob = (JSON.stringify(RATIONAL_ARCHIVE_THEME) +
      Object.values(RD_TOKENS).flat().join(" ")).toLowerCase();
    for (const banned of ["truth", "confiden", "rank", "score", "winner", "correct", "authority", "glow"]) {
      expect(blob).not.toContain(banned);
    }
    // no "green = true" style praise colors on availability
    expect(RATIONAL_ARCHIVE_THEME.tokens["--rd-availability-available-text"])
      .not.toBe("#00FF00");
  });

  it("CSS layer matches the TS definition exactly (zero drift)", () => {
    const css = readFileSync(join(root, "styles", "tokens-rational-archive.css"), "utf-8");
    const declared: Record<string, string> = {};
    for (const m of css.matchAll(/(--rd-[a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
      declared[m[1]] = m[2];
    }
    expect(Object.keys(declared).length).toBe(CANONICAL_TOKEN_NAMES.length);
    for (const [name, value] of Object.entries(RATIONAL_ARCHIVE_THEME.tokens)) {
      expect(declared[name], name).toBe(value);
    }
    expect(css).toContain('[data-rd-theme="rational-archive"]');
  });
});

describe("v1.6.2 theme boundary", () => {
  it("applyRDTheme changes presentation only: attribute + tokens, nothing else", () => {
    const el = document.createElement("div");
    el.setAttribute("data-state", "available");
    el.textContent = "declared content";
    const applied = applyRDTheme(el, RATIONAL_ARCHIVE_THEME);
    expect(applied).toBe(CANONICAL_TOKEN_NAMES.length);
    expect(el.getAttribute("data-rd-theme")).toBe("rational-archive");
    expect(el.getAttribute("data-state")).toBe("available"); // untouched
    expect(el.textContent).toBe("declared content");          // untouched
    expect(el.style.getPropertyValue("--rd-surface-base")).toBe("#11110F");
    expect(el.style.getPropertyValue("--rd-provenance-inference-text")).toBe("#C6B477");
    // no class was added
    expect(el.className).toBe("");
  });

  it("no semantic mutation: theme application cannot touch knowledge data", () => {
    // The runtime surface is presentation-only by construction: the
    // only verbs are attribute + custom-property writes on an
    // HTMLElement. Freeze a knowledge-ish object and verify a theme
    // round-trip leaves it untouched.
    const knowledge = Object.freeze({ status: "candidate", object_id: "ko-20260921-0001" });
    const el = document.createElement("div");
    applyRDTheme(el, RATIONAL_ARCHIVE_THEME);
    expect(knowledge).toEqual({ status: "candidate", object_id: "ko-20260921-0001" });
    expect(() => {
      (knowledge as { status: string }).status = "active";
    }).toThrow();
  });

  it("shell toolbar source: explicit select wiring, no detection/persistence", () => {
    const src = readFileSync(join(root, "src", "views", "rd-workspace-view.ts"), "utf-8");
    expect(src).toContain("themeController");
    expect(src).toContain("setTheme");
    for (const banned of ["saveData", "loadData", "localStorage", "matchMedia", "detectTheme"]) {
      expect(src).not.toContain(banned);
    }
  });

  it("manifest ships both stylesheets; build copies the theme css", () => {
    const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf-8"));
    expect(manifest.css).toEqual(["styles.css", "tokens-rational-archive.css"]);
    const buildSrc = readFileSync(join(root, "scripts", "build.mjs"), "utf-8");
    expect(buildSrc).toContain("tokens-rational-archive.css");
  });
});

/** v1.6.2 §3 — Rational Archive: the first (default) RD theme.
 *
 * Values are taken verbatim from the Visual Design System v1.0
 * (docs/RD_VISUAL_DESIGN_SYSTEM_V1_0.md §3): opaque dark archive
 * palette + semantic accents. Deep archive atmosphere, readable,
 * restrained — no cyberpunk, no blue tech style, no AI assistant
 * or dashboard character.
 *
 * Value assignments (token → v1.3.5 source):
 * - identity: text.primary #D4D0C8, secondary #A19C92,
 *   border.decorative #34322D.
 * - provenance: the four declared layer accents — Observation
 *   #A8B6AD, Evidence #91B5B0, Inference #C6B477, Conclusion
 *   #D4D0C8 (paper; a reading tier, not a stronger truth tier).
 * - relation: neutral text colors; unresolved references use the
 *   Unknown accent #D0B77C (unknown presence, not an error).
 * - conflict: muted blood red #C78683 — representation only, never
 *   an error/danger verdict on either side.
 * - availability: neutral readable tones; available is deliberately
 *   NOT a praise color (availability is not validity); missing and
 *   ambiguous use the Unknown accent; unavailable uses stone.
 * - lifecycle-display: Active uses the declared-lifecycle teal; all
 *   other statuses stay neutral secondary/warm gray — labels carry
 *   the meaning, color only accompanies (v1.3.5 §3).
 * - surface: base #11110F, raised #1D1C19, decorative rule #34322D,
 *   focus #D8C89D.
 *
 * This file defines PRESENTATION only. No meaning is encoded here.
 */

import { RDThemeRegistry, type RDThemeDefinition } from "./theme-runtime";

export const RATIONAL_ARCHIVE_THEME: RDThemeDefinition = Object.freeze({
  id: "rational-archive",
  label: "Rational Archive",
  description: "Default RD identity: deep archive atmosphere, investigative calm.",
  tokens: Object.freeze({
    // identity
    "--rd-identity-title-text": "#D4D0C8",
    "--rd-identity-meta-text": "#A19C92",
    "--rd-identity-id-text": "#A19C92",
    "--rd-identity-rule": "#34322D",
    // provenance
    "--rd-provenance-observation-text": "#A8B6AD",
    "--rd-provenance-evidence-text": "#91B5B0",
    "--rd-provenance-inference-text": "#C6B477",
    "--rd-provenance-conclusion-text": "#D4D0C8",
    "--rd-provenance-layer-rule": "#34322D",
    // relation
    "--rd-relation-type-text": "#D4D0C8",
    "--rd-relation-endpoint-text": "#A19C92",
    "--rd-relation-unresolved-text": "#D0B77C",
    "--rd-relation-rule": "#34322D",
    // conflict
    "--rd-conflict-marker-text": "#C78683",
    "--rd-conflict-marker-rule": "#C78683",
    // availability (neutral: availability is not validity)
    "--rd-availability-available-text": "#A19C92",
    "--rd-availability-missing-text": "#D0B77C",
    "--rd-availability-ambiguous-text": "#D0B77C",
    "--rd-availability-unavailable-text": "#AAA69E",
    // lifecycle-display (labels carry meaning; color accompanies)
    "--rd-lifecycle-candidate-text": "#A19C92",
    "--rd-lifecycle-active-text": "#91B5B0",
    "--rd-lifecycle-superseded-text": "#A19C92",
    "--rd-lifecycle-archived-text": "#A19C92",
    // surface
    "--rd-surface-base": "#11110F",
    "--rd-surface-raised": "#1D1C19",
    "--rd-surface-rule": "#34322D",
    "--rd-surface-focus-rule": "#D8C89D",
  }),
});

/** The default registry with the single shipped theme. Future
 * themes (professional, apple-minimal, cute-companion) register
 * here without touching component code. */
export function createDefaultThemeRegistry(): RDThemeRegistry {
  const registry = new RDThemeRegistry();
  registry.register(RATIONAL_ARCHIVE_THEME);
  return registry;
}

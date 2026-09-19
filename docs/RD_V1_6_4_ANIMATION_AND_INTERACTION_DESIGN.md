# Rational Delirium v1.6.4 Animation & Interaction Design

PROJECT=RATIONAL_DELIRIUM
PHASE=V1_6_4_ANIMATION_AND_INTERACTION_DESIGN
STATUS=DESIGN_ONLY
BASE_COMMIT=38102dcb452f2168cb54eb8868fc35b26b7f3748

This document is a DESIGN CONTRACT ONLY. It defines motion and
interaction specifications for the frozen v1.6.x product surfaces.
It does not implement any animation runtime, CSS transition, UI
component or interaction handler. Transferred verbatim from the
externally approved specification; no redesign applied here.

## 1. Motion Philosophy

Rational Delirium motion is not decoration. Motion explains knowledge structure, investigation flow, and continuity.

Motion may communicate:

- navigation

- hierarchy

- relationship

- investigation flow

Motion must not communicate:

- truth

- confidence

- importance ranking

- AI intelligence

- correctness

Core principle:

Motion explains structure. Motion does not create meaning.

## 2. Interaction Principles

### Object Selection

Selecting a Knowledge Object should feel like focusing an investigation target, not selecting a winner.

### Navigation

Object-to-object movement preserves investigation context.

### Expand / Collapse

Progressive disclosure should reveal complexity gradually.

## 3. Workspace Transition Model

Transitions between object list, knowledge panel, provenance, lineage, and relations should preserve spatial continuity.

Avoid page replacement and flashy transitions.

## 4. Knowledge Structure Visualization

### Provenance

Motion may show Source → Snapshot → Declared fields.

### Lineage

Motion may express Previous → Current → Following.

### Relations

Motion may reveal declared connections.

Connections do not represent confidence or truth.

## 5. Micro Interaction System

Hover: confirm interaction.

Focus: support keyboard navigation and accessibility.

Expand/Collapse: reveal information progressively.

Loading: use neutral state indication. No AI thinking animation.

## 6. Reduced Motion

Support prefers-reduced-motion.

Reduced motion must preserve information and interaction meaning.

Animation is never the only source of information.

## 7. Theme Compatibility

Themes may change timing feel, easing personality, and decorative style.

Themes may not change semantic meaning or knowledge interpretation.

## 8. Performance Principles

Prefer lightweight user-triggered transitions.

Avoid continuous animation, background loops, and heavy rendering.

## 9. Forbidden Motion Patterns

Forbidden:

- AI thinking animation

- confidence meters

- glowing important objects

- ranking animation

- gamification effects

- fake intelligence effects

## 10. Implementation Roadmap

Phase 1: Micro interactions

Phase 2: Workspace transitions

Phase 3: Lineage, provenance, and relation visualization polish

Phase 4: Final product polish

## Final Acceptance Criteria

Motion improves understanding.

Motion does not create authority.

Motion preserves investigation.

Motion never pretends intelligence.

---

## Document Validation

| Check | Result |
| --- | --- |
| Design contract only — no implementation | PASS — this file; no src/styles/tests/manifest/dist changes in its commit |
| Forbidden motion patterns enumerated | PASS — §9: AI thinking animation, confidence meters, glowing important objects, ranking animation, gamification, fake intelligence |
| Motion-neutrality invariants preserved | PASS — §§1, 4, acceptance criteria: motion never communicates truth/confidence/ranking/correctness/authority |
| Reduced motion parity required | PASS — §6: prefers-reduced-motion; animation never the only information source |
| Theme compatibility respects v1.6.2 boundary | PASS — §7: themes change presentation feel only, never semantic meaning |
| Structure and terminology preserved from approved source | PASS — transferred verbatim; envelope metadata only |

DESIGN_VALIDATION=PASS
ANIMATION_IMPLEMENTED=false
CODE_CHANGED=false
STOP_AFTER_DOCUMENT_COMPLETION=true

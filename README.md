# Rational Delirium

A boundary-first knowledge workflow framework for AI-assisted
research, review, approval, controlled mutation, and evidence
preservation.

Responsibility separation is the core of the design:

- **Agents** create reasoning artifacts (research, proposals,
  reviews, handoffs) — work results, never permissions.
- **Human** owns approval. No Agent, consensus, score, or timeout
  substitutes for an explicit Human decision.
- **Bridge** controls admission (lease, writer identity, expiry,
  sync safety).
- **Mutation Gate** controls mutation: one human-approved append,
  byte-exact, exactly once.
- **Audit** records execution facts (with per-record digest
  verification).

This repository contains the Obsidian plugin (read-only
visualization), the Mutation Gate, the Bridge Adapter, and the
vendor-neutral Agent Skill package. It does not contain any
personal vault content.

## Current Status

**v0.7.5 Runtime Evidence Package — FROZEN**

Scope: sandbox validation evidence only. **Not production
deployment.**

The mutation capability remains `APPEND_EXISTING_NOTE` only.

## Validation Timeline

| Phase | Trial |
|---|---|
| v0.7.2 | Single Agent Workflow Boundary Trial |
| v0.7.3 | Sandbox Controlled Mutation Trial |
| v0.7.4 | Real Component Sandbox Execution Trial |
| v0.7.5 | Runtime Evidence Package Freeze |

Details: [docs/RD_V0_7_5_RUNTIME_EVIDENCE_PACKAGE.md](docs/RD_V0_7_5_RUNTIME_EVIDENCE_PACKAGE.md)

## Architecture

```text
Agent
  ↓
Workflow
  ↓
Approval Boundary (Human only)
  ↓
Bridge Adapter
  ↓
Mutation Gate
  ↓
Audit
  ↓
Knowledge Layer
```

## Evidence Boundary

Proven (per the frozen evidence package, sandbox scope plus included
source/tests):

- Workflow boundaries are understandable and followable by generic
  Agents
- Sandbox validation of the workflow artifact chain
- Frozen components (Bridge Adapter, Mutation Gate, AuditLog) execute
  inside a sandbox

Not Proven:

- Production deployment
- Distributed coordination
- Real human approval automation (sandbox approvals were simulated
  via MockSigner under declared identities)

## Documentation

English documentation: [docs/](docs/)

中文文档: [README_zh-CN.md](README_zh-CN.md)

## Development

```text
npm ci
npm run typecheck
npm test
npm run build
npm run check-artifacts
```

- Node.js ≥ 24 for development tooling; the plugin bundle targets
  the Obsidian (browser) platform with `obsidian` as an external.
- Mutation Gate / Bridge Adapter: Python 3.11 standard library
  (`mutation-gate/`, tests via
  `python -m unittest discover -s mutation-gate/tests`).
- `dist/` is tracked intentionally: the distributable artifacts are
  the release identity for this plugin.

## License

[MIT](LICENSE) — see [LICENSE](LICENSE) for the full text.

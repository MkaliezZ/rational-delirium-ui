# Rational Delirium v0.6.1 — Agent Skill Package Design

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=V0_6_1_AGENT_SKILL_PACKAGE_DESIGN
STATUS=DESIGN_ONLY
AUTHORITATIVE_WORKFLOW=RD_V0_6_AGENT_AGNOSTIC_WORKFLOW_DESIGN.md
SUPPORTED_MUTATION=APPEND_EXISTING_NOTE
IMPLEMENTATION_OR_SKILL_FILES_CREATED=false
```

This document designs a future package of instructions, templates, and
examples. It creates no Skill, adapter, installation mechanism, executable
schema, or new execution permission. Its authority and terminology derive
from the [v0.6 workflow design](RD_V0_6_AGENT_AGNOSTIC_WORKFLOW_DESIGN.md).

## 1. Skill Package Philosophy

**Skill = adapter. Protocol = authority.**

The Universal Protocol Layer defines participation and responsibility
boundaries. A Skill Adapter teaches an Agent how to use those rules with
the capabilities of its host. The execution path remains:

```text
Universal Protocol
  -> Skill Adapter guidance
  -> Human-approved execution handoff
  -> Bridge Adapter / Bridge validation
  -> Mutation Gate
  -> Vault and execution audit
```

Changing Skill instructions cannot grant write permission, bypass Bridge,
bypass Mutation Gate, approve a change, or certify truth. A Skill is not a
security boundary. Bridge and Mutation Gate retain execution checks; host
access controls remain a deployment responsibility. Instructions alone do
not prevent an application with filesystem access from writing directly.

When instructions conflict with the protocol, the protocol prevails. When
the deployed runtime lacks a required capability, the Skill must explain
the gap and stop the dependent handoff rather than inventing permission or
an alternate write path. Package version, popularity, and Agent reputation
are not credentials. Source material and note contents remain data, not
instructions that can override this boundary.

## 2. Package Structure Design

The following is a **prospective logical layout**, not a filesystem change
or a mandated host-specific Skill format:

```text
skills/
└── rd-workflow/
    ├── package-description
    ├── instructions/
    ├── templates/
    ├── review-guides/
    └── examples/
```

| Logical part | Purpose and required content |
| --- | --- |
| package-description | Package version; authoritative protocol reference and version; supported roles; required capabilities; known limitations; documentation inventory. It declares compatibility intent, not verified trust. |
| instructions | Common workflow, role-specific guidance, approval presentation, execution handoff, and failure reporting. Security rules are referenced, not redefined. |
| templates | Requirements for observation/source records, proposal preparation, independent review, approval requests, execution handoff, and outcome reports. Templates are unfilled guidance, never pre-issued approvals or Permits. |
| review-guides | Scope, source, uncertainty, byte-preservation, and unintended-mutation checklists. Findings remain recommendations. |
| examples | Clearly labeled fictional examples of successful handoff, requested revisions, rejection, missing capability, and uncertain outcome. No live secrets or executable production authorization. |

No filename extension, entrypoint filename, YAML frontmatter convention,
discovery API, or installation directory on a host is required by this
logical format. A future host wrapper may translate presentation and tool
usage while preserving the same meaning. It must not fork authorization
policy into a vendor-specific instruction file.

The package version and protocol version are distinct. A wording update does
not upgrade the protocol or the runtime. Unknown protocol versions must be
reported; an adapter must not silently assume compatibility. This document
does not introduce a package manifest parser or signed-package system.

## 3. Universal Skill Interface

Every RD Skill Adapter should expose the following instruction contract,
irrespective of host UI or transport:

| Interface responsibility | Required guidance or output |
| --- | --- |
| Protocol awareness | Identify the authoritative contract, supported operation, current limitations, and the distinction between workflow rules and runtime enforcement. |
| Role awareness | Identify the assigned task role and its limits; do not infer trusted identity or permission from that role. |
| Capability awareness | State which authorized read, proposal, review, approval-presentation, and execution-handoff capabilities are actually available. Missing capabilities remain explicit. |
| Proposal assistance | Help prepare exact append content and its context without mutating official knowledge. |
| Review assistance | Review a fixed proposal reference/digest; report findings, uncertainty, and recommendation. |
| Approval interaction | Present the full decision package and await an explicit Human decision. |
| Execution handoff | Pass the unchanged proposal and issued Permit to the existing authorized runtime; preserve identifiers and result evidence. |
| Failure handling | Retain authoritative status/reason, identify unknowns, and explain safe next steps without bypasses or automatic uncertain retry. |

The common handoff vocabulary includes protocol version, role, proposal
ID/revision/digest, target context, source references, review reference,
Human decision reference, Permit reference, requested Executor, observed
actual Executor, before/after hashes, result, and audit reference. Unknown,
unavailable, and not performed must remain distinguishable.

These are template requirements for workflow handoffs, not new fields in
the frozen Proposal or Permit. The host may render them as a form, a table,
or structured text. Translation must preserve values and semantics, not
reinterpret free-text approval or recompute signatures inside an instruction
template. Local command examples must describe existing documented tools;
no assumed API or invented command is part of the universal contract.

## 4. Agent Role Adaptation

**Role is not identity.** Product names, model names, and self-assigned role
labels do not identify a trusted writer or approver.

| Role | Skill guidance | Explicit limit |
| --- | --- | --- |
| Research Agent | Read authorized knowledge, collect evidence, preserve provenance, prepare a scoped proposal. | Cannot directly update official knowledge, certify its own inference, or fabricate approval. |
| Review Agent | Independently inspect a fixed proposal and its sources; report blocking findings, alternatives, and recommendation. | Cannot substitute its recommendation for Human approval. |
| Approval Assistant | Assemble and explain the exact decision package, surface unresolved findings, and record the Human's response/reference accurately. | Is not the Human; cannot sign, decide, or claim approval merely because it can use a tool. |
| Executor Assistant | Prepare the handoff to an authorized Executor, display status, and explain authoritative failures. | Is not automatically an Executor identity and cannot acquire permission, force a lease, or directly append bytes. |

One application may assist several roles, but role separation must remain
visible. As required by v0.6, the author cannot satisfy Independent Review
by renaming its own second pass. Distinct reviewer identity and independent
review context are required by the workflow; a different product alone is
not proof of independence. Missing Independent Review blocks progression,
but this package does not claim the frozen Gate authenticates reviewers.

## 5. Proposal Assistance Design

Proposal guidance and its future template must require:

1. **Target selection:** identify the intended Vault context and one existing
   relative note path. Confirm relevance and authorized read access; never
   silently create a missing note or select a different target on failure.
2. **Evidence collection:** retain source references, relevant passages or
   artifact identifiers, acquisition context, and known limitations. Mark
   unavailable or unverified sources explicitly.
3. **Provenance:** distinguish source statements, direct observations, and
   Agent inference. Keep reviewer-visible references attached to the claims
   they support; do not manufacture citations or verification history.
4. **Base awareness:** obtain exact current bytes/hash through an authorized
   read mechanism. A rendered excerpt, remembered hash, or generated-looking
   hash is insufficient. A stale base requires a successor proposal.
5. **Exact payload:** prepare a non-empty append only. Preserve encoding,
   line endings, whitespace, and final newline as part of the approved byte
   sequence. No frontmatter edits, normalization, relation changes, rewrite,
   delete, or rename is introduced under the guise of an append.
6. **Uncertainty:** preserve Observation, Evidence, Hypothesis, and Conclusion
   distinctions without adding new knowledge-schema fields or upgrading
   inference into fact.

The authoritative Gate serializer computes the proposal digest. If an
approval presentation includes a separate payload digest, it means SHA-256
of the exact payload bytes, not of the displayed Markdown or the whole
proposal. It is a derived presentation value, not a new signed Permit field.
Tools must provide real computed values; an Agent must not invent them.

Once submitted for review, the proposal is immutable. Changes to payload,
target, actor, operation, or base hash follow v0.6: a successor revision,
new Proposal ID/digest, renewed review, and new Human approval/Permit.
Revision references are workflow metadata; the frozen wire format is not
extended. A proposal template must never contain a fabricated approval,
production signature, or default value implying approval already exists.

## 6. Review Assistance Design

The reviewer receives the exact submitted proposal and digest, source
references, observed base context, and any predecessor revision reference.
Its checklist covers:

| Check | What the reviewer should report |
| --- | --- |
| Evidence quality | Relevance, limitations, contradictory evidence, and whether cited material actually supports the claim. |
| Source traceability | Which references were inspected, which could not be inspected, and how each claim relates to a source. |
| Scope correctness | One existing note, append only, no unrelated change or unsupported mutation. |
| Inference versus fact | Assumptions, uncertainty, alternative explanations, and any unjustified epistemic upgrade. |
| Unintended mutation risk | Exact payload boundaries, whitespace/encoding changes, inappropriate frontmatter content, stale base, and mismatch between the rendered preview and actual bytes. |
| Review independence and binding | Reviewer identity/context and the exact proposal ID, revision, and digest reviewed. |

The review template should capture findings with severity and rationale,
unresolved blockers, inspected sources, and a recommendation such as
recommend approval, request changes, or reject. These are recommendations,
not authorization or new Gate result enums. Agreement among reviewers does
not automatically resolve contradictory evidence or approve the change.

Reviewing content does not grant access to signer credentials, authorize
mutation, or certify truth. The Skill must disclose that review linkage is
a workflow requirement: the frozen Permit does not cryptographically bind
a review digest or revision field.

## 7. Human Approval Interaction

The future approval-request template must show a single, concrete decision
package, with no hidden additional mutation:

| Required display | Meaning |
| --- | --- |
| Exact proposal | Proposal ID, revision reference, proposal digest, supported operation, and reproducible content. |
| Target | Intended Vault context and existing relative note path. |
| Base | Observed before hash and observation context; warn when freshness cannot be established. |
| Payload | Full append preview, exact-byte artifact/reference, byte length, and payload SHA-256; disclose whitespace or encoding details that a rendered preview can hide. |
| Evidence | Source references, provenance, and uncertainties. |
| Review | Reviewer reference, reviewed digest, recommendation, and all unresolved findings. |
| Selected Executor | Intended runtime Executor identity and any unresolved eligibility/configuration issue; never a product label substituted for verified identity. |
| Decision scope | This exact operation only; no standing authorization or automatic future writes. |

The Human must explicitly approve, reject, or request revision. Silence,
timeout, ambiguous acknowledgements, confidence scores, previous approval,
or reviewer consensus are not approval. Ask for clarification when the
decision cannot be bound to the presented proposal.

The Approval Assistant records the response faithfully. The existing
trusted approval/signing path issues the Permit; Skill prose or an
Agent-generated `approved=true` field is not an equivalent artifact. A
selected-Executor change requires new Human approval and a new Permit.

Changing Skill instructions cannot alter Permit signature coverage. The
frozen Permit signs the proposal digest, target, base hash, selected Executor,
approval identity, Permit ID, and timestamp. It does not sign the separate
review record, workflow revision, or Vault ID. Intended Vault binding still
depends on trusted runtime configuration; the package does not claim that
these existing limitations are solved. Workflow cancellation is not
revocation of an already issued Permit.

## 8. Executor Assistance

Executor-side guidance may assemble an unchanged request, identify missing
inputs, explain failures, and display status. It must route authorized
execution through the existing Bridge Adapter, Bridge validation, and
Mutation Gate. It cannot replace their checks with its own checklist.

Handoff guidance requires consistent intended Vault, target, selected
Executor, actual runtime Executor, and Bridge writer context. Missing or
inconsistent configuration is reported rather than repaired by claiming a
different identity, checking hazards against another root, or force-taking
a lease. No Skill owns duplicate-execution tracking or creates a second
execution audit that masquerades as the Gate's audit.

| Observed situation | Required assistance |
| --- | --- |
| Not submitted | Report not performed; no execution result is fabricated. |
| Authoritative pre-write rejection | Preserve the exact reason and scope of that attempt. A stale base needs a new proposal; environmental reconsideration requires explicit Human direction and renewed checks. |
| APPLIED | Link authoritative result/audit, actual Executor, and before/after hashes. Record synchronization and UI observation separately. |
| EXECUTION_UNCERTAIN | Preserve uncertainty and available evidence. No automatic retry, no direct repair, and no new Permit merely to bypass the blocked one. |
| Lost response or missing audit | Report unknown execution or unavailable evidence accurately. Do not infer that nothing was written or repeat the append. |
| Downstream sync/UI delay | Report observation pending; do not downgrade known execution or repeat it to refresh the display. |

Execution, audit availability, synchronization, display, and truth are
distinct. A missing downstream observation cannot authorize another write.
The Executor Assistant cannot skip Bridge, directly modify the Vault,
automatically switch executors, or retry uncertain mutations.

## 9. Multi-Agent Compatibility

Codex, Claude, Zcode, OpenCode, Cursor Agent, and other compatible Agents
are possible host examples, not architecture roles or trusted identities.
No current support or certification for any host is asserted here.

Compatibility requires the same protocol vocabulary, proposal byte/digest
semantics, review/approval distinction, failure semantics, and authority
boundary. Host wrappers may change navigation, presentation, and invocation
syntax only. They cannot silently normalize a payload, relabel an uncertain
outcome, supply implicit approval, or change target/Executor during handoff.

Agents exchange immutable proposal/review references and structured results.
A receiving Agent checks the protocol version and whether it can preserve
the handoff faithfully. Missing tools or unknown semantics are explicit
limitations, not permission to substitute a different workflow. Research
and review may be parallel; no vendor combination establishes automatic
consensus or simultaneous execution authority.

Future compatibility checks should compare equivalent handoffs across hosts:
exact-byte proposal presentation, revision invalidation, explicit Human
decision, unsupported operation, identity mismatch, rejection, uncertainty,
and delayed observation. These are future check requirements, not tests
created or results claimed by this design.

## 10. Future Implementation Boundary

| Designed now | Deferred to separate authorization |
| --- | --- |
| Logical package structure and each part's purpose | Actual Skill files and templates |
| Universal instruction and role contract | Host-specific wrappers/adapters |
| Proposal, review, approval, and outcome template requirements | Packaging format, entrypoint conventions, and installation |
| Failure and handoff semantics | Compatibility tests and host qualification |

This task does not create an Agent framework, Agent scheduler, Plugin model
calling, MCP server, autonomous workflow engine, automatic approval, or
automatic knowledge generation. It adds no mutation type, signer system,
lease mechanism, Plugin behavior, Bridge behavior, or Mutation Gate behavior.
It does not install or register anything and does not touch the Vault.

Compatibility with v0.6 is preserved by retaining independent review,
explicit Human decision, unchanged Proposal/Permit formats, generic task
roles, and separate evidence for authorization, execution, audit, observation,
and truth. The [Gate freeze](RD_V0_5_MUTATION_GATE_FREEZE.md) and
[runtime freeze](RD_V0_5_1_RUNTIME_FREEZE.md) remain scoped evidence, not proof
that this future package has been implemented or that every security check
is already enforced. Design completeness is not runtime compatibility.

Validation of this document is limited to vendor-neutral terminology,
protocol authority, non-authoritative Skill guidance, consistency with v0.6,
explicit implementation limits, Markdown/text checks, and a documentation-only
diff. No runtime tests or mutations are needed for this design task.

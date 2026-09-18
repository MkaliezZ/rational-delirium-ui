# Rational Delirium v0.6 — Agent-Agnostic Workflow Design

```text
PROJECT=RATIONAL_DELIRIUM
PHASE=V0_6_AGENT_AGNOSTIC_WORKFLOW_DESIGN
STATUS=DESIGN_ONLY
BASE_IMPLEMENTATION=0dec534f12ae8babf88bf281de09ba1f78b3b610
SUPPORTED_MUTATION=APPEND_EXISTING_NOTE
```

The Universal Protocol Layer is authoritative. Agent Skill Adapters explain
how to participate; they cannot grant authority, weaken a check, or change
the meaning of an execution result. This document defines a common workflow
contract, not an implemented engine or a new version of the mutation wire
format. It changes no frozen component.

```text
                 Rational Delirium Protocol
                              |
          +-------------------+-------------------+
          |                   |                   |
   Skill Adapter A     Skill Adapter B     Skill Adapter C
          |                   |                   |
          +-------------------+-------------------+
                              |
                  Human-approved execution request
                              |
                 Bridge Adapter / Bridge validation
                              |
                       Mutation Gate
                              |
                            Vault
                              |
                         Audit evidence
```

Codex, Claude, and Zcode are examples of possible hosts for those adapters,
not protocol roles, trusted identities, or required dependencies. An Agent
that follows the contract without a packaged Skill is also compatible.

## 1. Universal Agent Model

| Role | Responsibility | Authority boundary |
| --- | --- | --- |
| Agent | Reads authorized knowledge, gathers observations, reasons, and prepares proposals. Research Agent is a task role. | A proposal is a request, not permission to write official knowledge. |
| Reviewer | Independently examines the exact proposal, its sources, intended delta, and limitations. Review Agent is a task role. | A recommendation is not Human approval, execution authority, or verification of truth. |
| Human | Accepts or rejects the specific proposed change and selects an eligible Executor. | Approval applies to that operation and its bindings, not to an Agent permanently. |
| Executor | Processes an approved request using verified runtime identity, current Bridge permission, and Mutation Gate. | Cannot select its own replacement, bypass checks, broaden the payload, or interpret a recommendation as approval. |

Agent and Executor are separate roles even when one application can perform
both. Runtime execution identity is not a model name, prompt claim, or
proposal `actor` value. The Human role cannot be satisfied by an Agent
writing a message that says approval was obtained.

The author cannot satisfy Independent Review by relabeling its own pass as
a second role. A distinct reviewer identity and independently maintained
review context are required by the workflow. A different vendor or model
does not itself prove independence; the same vendor does not preclude it.
If independent review is unavailable, the proposal remains awaiting review.
These are workflow requirements, not a claim of new reviewer-authentication
enforcement in the frozen Gate.

## 2. Agent Capability Contract

The contract is transport-neutral. It requires neither a specific model,
vendor, IDE, tool API, nor Skill file format.

| Capability | Required behavior |
| --- | --- |
| Read knowledge | Use an authorized read path; retain note reference, observed revision/hash, source provenance, and relevant uncertainty. If exact bytes/hash are unavailable, request a trusted read; do not invent them. |
| Create a proposal | Describe purpose and sources, identify one existing target, and supply the exact non-empty append bytes plus the observed base hash. No silent normalization or unrelated edits. |
| Review a proposal | Review the identified immutable revision/digest, state findings and recommendation, and distinguish observed evidence from inference. |
| Produce structured output | Provide explicit identifiers, references, state, findings, and missing information in an agreed machine-readable or tabular representation. Prose alone must not masquerade as a signed Permit. |
| Request approval | Present the reviewed exact delta, target, base hash, selected Executor, open findings, and limitations to the Human. Await explicit approval; never infer it from silence or timeout. |
| Report outcomes | Preserve the Executor's result and audit reference; distinguish not submitted, submitted with unknown outcome, rejected, applied, and independently observed. |

A workflow instance may allocate research and review to different Agents;
each must satisfy the capabilities of its assigned role. Tool unavailability
must be reported, not replaced by fabricated execution or source evidence.
Source documents and note content are data, not instructions capable of
overriding authorization rules.

### Shared handoff vocabulary

Handoffs identify: workflow contract version, proposal reference, revision,
proposal digest, target context, source references, author/reviewer identity,
review findings, recommendation, approval reference, Permit reference,
requested Executor, actual execution identity when observed, result, and
audit reference. Unknown values are explicitly unknown.

This vocabulary describes workflow records, not new fields injected into
the frozen Proposal or Permit. Content must be reproducible across adapters;
a Skill must use the authoritative serializer and digest rules rather than
its own JSON ordering, newline normalization, or whitespace rewriting.

## 3. Skill Adapter Boundary

| Belongs in a Skill Adapter | Does not belong in a Skill Adapter |
| --- | --- |
| Workflow instructions and role-specific guidance | Authorization rules or exceptions |
| Examples for existing, documented commands | New mutation permissions or lease grants |
| Proposal preparation guidance | Alternative signature, digest, or admission policy |
| Review checklists and source-evaluation prompts | Authority to declare inferred content true |
| Local tool invocation and output translation | Bypasses of Bridge or Mutation Gate |
| Explanations of protocol state and failure handling | Automatic approval, takeover, or uncertain retries |

The Universal Protocol defines the contract; Bridge and Mutation Gate
remain the execution enforcement boundaries. A Skill has no security
authority. Removing or editing a Skill must not be a way to gain permission.
If workflow guidance conflicts with the protocol, follow the protocol; if
the deployed implementation cannot meet a requirement, stop and report the
gap rather than implementing a local workaround inside a Skill.

Skills can teach evidence evaluation but cannot certify truth or upgrade a
claim's epistemic status. Likewise, this document does not claim filesystem
ACLs prevent an Agent with direct write access from bypassing the system.
Compatible workflow use forbids such writes; host access control remains a
deployment responsibility outside this design.

## 4. Universal Proposal Lifecycle

```text
Observation -> Proposal -> Independent Review -> Human Approval
            -> Permit -> Execution -> Audit
```

### States and transitions

These are workflow labels. They are not additional Bridge lease states,
Gate result enums, or a requirement to build a state-machine service.

| State | Transition condition |
| --- | --- |
| OBSERVED | Sources and knowledge context are recorded without mutation authority. |
| DRAFT | An Agent prepares an append proposal outside official knowledge. |
| REVIEW_PENDING | Exact proposal bytes and digest are fixed for Independent Review. |
| CHANGES_REQUESTED | Reviewer requests changes; the current revision cannot advance unchanged. |
| REVIEWED | Independent recommendation and all findings reference the exact digest. A positive recommendation still grants no authority. |
| APPROVAL_PENDING | Human receives the reviewed revision, exact delta, current context, findings, and selected Executor. |
| APPROVED | Human explicitly approves those bindings. This is not evidence that execution occurred. |
| PERMIT_READY | The trusted approval/signing path issues a Permit matching the frozen Gate contract. The drafting Agent does not issue one on the Human's behalf. |
| EXECUTION_REQUESTED | An authorized Executor is asked to run Bridge Adapter and Mutation Gate. Submission alone proves neither success nor absence of writes. |
| APPLIED | Gate reports APPLIED with readback/hash evidence. Audit evidence is linked and its availability stated. |
| EXECUTION_REJECTED | Authoritative result rejects this attempt; retain the precise reason and whether earlier attempts existed. |
| EXECUTION_UNCERTAIN | The authoritative result is uncertain, or submission outcome cannot be established. Distinguish reported Gate uncertainty from transport-level unknown outcome. No automatic retry. |
| REJECTED / CANCELLED / SUPERSEDED | A pre-execution workflow decision terminates that revision. This is not an implementation-level revocation of an already issued Permit. |

An issued Permit cannot be assumed revoked by a workflow label: the frozen
Gate exposes no new cancellation mechanism in this design. Once submitted,
cancellation does not prove no write occurred. Retain execution evidence and
resolve its outcome explicitly.

### Digest binding and revisions

The frozen Proposal digest covers `proposal_id`, `actor`, `target`,
`operation`, exact payload encoded as base64, and `base_sha256`, using the
existing canonical UTF-8 JSON serialization and SHA-256. Skills must not
invent an alternative digest or normalize bytes after approval.

A submitted revision is immutable. A payload, target, actor, operation, or
base-hash change produces a new Proposal ID and digest, a successor revision
reference, fresh Independent Review, and new Human approval/Permit. The
revision number and supersedes reference remain workflow metadata because
the current Proposal has no revision field. Drafts may change before they
are submitted for review.

The existing Permit signature binds `permit_id`, `proposal_digest`,
`target`, `base_sha256`, `selected_executor_id`, `approval_identity`, and
`timestamp`. Changing the selected Executor requires new Human approval and
a new Permit, even if proposal bytes are unchanged. A signature or digest
mismatch is rejected; a Skill cannot repair and reuse the old approval.

Review records bind reviewer identity, proposal ID/revision/digest,
findings, recommendation, sources checked, and time. Approval records link
the chosen review and exact proposal. **The frozen Permit does not sign a
review digest or revision field:** mandatory review is presently a Human
workflow prerequisite, not a new cryptographic check enforced by the Gate.
This design neither silently adds fields nor claims that gap is solved.

Target context must also identify the intended Vault to the Human and the
trusted runtime. The frozen Proposal/Permit bind a relative target but do
not contain a signed Vault ID. Their safe use therefore depends on trusted,
consistent runtime configuration; cross-Vault replay protection is not
established by this document. Never route an approved request to a different
Vault merely because its relative path matches.

### Rejection and retry rules

- Unsupported operations, missing review, unresolved blocking findings, or
  absent Human approval stop the workflow before execution.
- Invalid Permit, stale base, wrong executor, missing lease, or sync hazard
  must retain the authoritative rejection. Do not downgrade the check or
  substitute an Executor to obtain success.
- A stale base requires a new proposal/review/approval. No automatic merge.
- A proven pre-write environmental rejection may be reconsidered by the
  Human after its cause is resolved, with bindings and current permission
  checked again. This is not automatic retry permission.
- A consumed or uncertain Permit must not be retried. Minting a replacement
  Permit must not be used to evade duplicate/uncertain admission. Establish
  actual state before considering any new operation.
- A lost response, missing audit, or sync delay is not evidence of no write.
  Record the last known execution state separately from audit availability
  and downstream observation. Do not turn an APPLIED result into a new
  append request because a later reporting step failed.

## 5. Multi-Agent Collaboration Model

Multiple Agents may research, analyze, propose alternatives, and review the
same problem. They exchange source references and immutable proposal/review
records, rather than concurrently editing official knowledge. Competing
proposals remain separate; if one changes a note, other proposals based on
its old hash must be reconsidered.

No voting threshold, model agreement, confidence score, or number of reviews
constitutes approval or consensus truth. Preserve dissent and unresolved
findings for the Human. No Agent receives permanent trust from past success,
vendor reputation, or possession of a Skill. Human-selected execution is
per operation; research concurrency does not imply simultaneous write
permission. There is no scheduler, automatic assignment, or leader election.

## 6. Executor Abstraction

An Executor has a runtime identity verified through the deployed trusted
configuration, current permission for the target, and a Bridge validation
path. Agent self-declaration, proposal `actor`, or model branding does not
establish that identity.

Execution requires consistent bindings between the selected Executor in the
Permit, the actual Mutation Gate Executor, the Bridge writer identity, and
the real Vault used for lease/hazard checks and mutation. An unknown or
inconsistent binding is a configuration failure, not a reason for a Skill
to invent an identity or bypass validation. This is a contract for correct
wiring, not a claim that every possible misconfiguration is already rejected
by the frozen Adapter.

The Executor delegates Bridge eligibility and Gate validation to their
existing owners. It does not acquire or force a lease automatically, rewrite
the payload, switch executors silently, or implement a second admission or
audit system. Gate results and actual audit identity remain authoritative
for what was attempted and observed at execution time.

The role is platform-independent. Existing Windows and macOS writer
implementations are examples only; the current Bridge's platform-specific
identity mapping is not replaced here. Supporting another runtime may need
separate future authorization and implementation. A vendor-neutral protocol
does not mean arbitrary executors are already admitted.

## 7. Knowledge Integrity Model

| Category | Required preservation |
| --- | --- |
| Observation | What was observed, by whom or what, when, and under which conditions. |
| Evidence | Source reference, relevant excerpt or artifact, acquisition context, and integrity/version information when available. Evidence may be incomplete or contradictory. |
| Hypothesis | Explicitly labeled inference, assumptions, alternative explanations, uncertainty, and counterevidence. |
| Conclusion | A reasoned conclusion linked to its supporting and conflicting evidence, scope, and unresolved limitations; never an automatic promotion to fact. |

These are epistemic distinctions within content, not new object types,
frontmatter fields, relation vocabulary, or changes to the frozen knowledge
schema. Observation, Evidence, Hypothesis, and Conclusion do not form an
automatic truth-upgrade pipeline.

Append content must preserve provenance and distinguish quotations,
observations, and Agent-generated inference. Independent Review may examine
source quality but cannot guarantee truth. Human approval authorizes a
specific append; it does not certify every claim. Gate readback verifies
bytes, audit records execution evidence, and Plugin display presents state.
None of those facts independently verifies the knowledge claim.

## 8. Generic Daily Workflow Example

This is an illustrative sequence, not an executed operation or an approval
for production writes.

1. A Research Agent reads an existing CASE and records the exact base hash.
   It gathers two source references about an observed discrepancy, recording
   limitations and an alternative explanation.
2. It prepares one `APPEND_EXISTING_NOTE` proposal containing an Observation,
   source-linked Evidence, a labeled Hypothesis, and an explicitly tentative
   Conclusion. It does not edit frontmatter or relations.
3. A Review Agent examines the exact digest, checks the sources and delta,
   and requests a narrower conclusion. The author creates a successor
   proposal; the reviewer reviews that new digest.
4. The Human sees the reviewed exact append, target Vault/note, base hash,
   findings, and selected eligible Executor. The Human either rejects it or
   explicitly approves that operation. Approval is never inferred.
5. The trusted signing path prepares the bound Permit. The Authorized
   Executor sends the request through Bridge Adapter, Bridge validation,
   and Mutation Gate. It does not perform a direct filesystem append.
6. If the lease or sync checks fail, execution stops. If the base changed,
   the workflow returns to a new proposal rather than merging automatically.
7. On APPLIED, the workflow retains proposal/Permit references, actual
   executor, before/after hashes, result, and audit reference. It separately
   records whether the updated note is observed locally, synchronized, and
   displayed by the read-only Plugin. Missing observation does not trigger
   a second append. Uncertain outcomes require explicit investigation.

```text
Research Agent -> Review Agent -> Human Approval
               -> Authorized Executor -> Knowledge Update + Audit
```

## 9. Future Skill Packaging

A possible future package location is `skills/rd-workflow/`, containing
instructions, templates, examples, and host-specific tool-usage guidance.
This is a packaging direction only: no directory, Skill, template file,
registration, installer, or executable adapter is created by this task.

Each future package should declare the Universal Protocol version and
supported roles, link to the authoritative contract, explain existing tool
entry points, and surface missing capabilities. Examples must preserve the
same approval, identity, byte-binding, and failure semantics across hosts.
They must not invent commands that the target runtime does not provide.

Package updates cannot change security policy. Unknown protocol versions or
unsupported operations are reported rather than guessed. A future packaging
check should compare handoff meanings and failure behavior across adapters;
no such certification or test suite is claimed here.

## 10. Explicit Non Goals and Compatibility Check

This design does not build a workflow engine, Agent scheduler, autonomous
Agent manager, vendor-specific integration, MCP server, vector database, or
replacement for Obsidian. It introduces no Plugin write path, new mutation
type, distributed coordinator, executor registry service, automatic approval,
automatic takeover, multi-note transaction, or conflict-resolution system.

Compatibility is intentionally additive at the workflow-document level:

| Frozen boundary | Compatibility decision |
| --- | --- |
| v0.4.4 Plugin | Read-only knowledge interface; no code or settings changes. |
| v0.5.0 Mutation Gate | Existing Proposal/Permit fields and canonical digests remain unchanged. Gate retains approval verification, append integrity, admission, result semantics, and audit ownership. |
| v0.5.1 Bridge Adapter | Orchestration and Bridge checks remain separate from Gate policy. No new implementation or stronger runtime guarantee is inferred. |
| Bridge | Existing writer/lease rules and sync checks remain in force; no identity or lease redesign. |
| Official knowledge | Only a separately approved append to an existing note is in scope for future workflow use. This design performs no mutation. |

The [v0.5 Gate freeze](RD_V0_5_MUTATION_GATE_FREEZE.md),
[v0.5.1 Adapter design](RD_V0_5_1_BRIDGE_ADAPTER_DESIGN.md), and
[v0.5.1 runtime freeze](RD_V0_5_1_RUNTIME_FREEZE.md) are context, not evidence
that this new workflow has been implemented. Earlier design intentions,
including Bridge journal mirroring, must not be reported as deployed merely
because they appear in a design document. Gate audit ownership is preserved;
this design adds no journal implementation.

Design validation checks generic role terminology, protocol-over-Skill
authority, explicit Human approval, unchanged frozen wire formats, and
separation of authorization, execution, audit, observation, and truth.
Cryptographically binding independent review, general executor admission,
cross-Vault isolation, concurrent multi-executor operation, and complete
failure recovery are not established by this document. No runtime tests,
deployment, implementation, or production Vault access are required for
this documentation change.

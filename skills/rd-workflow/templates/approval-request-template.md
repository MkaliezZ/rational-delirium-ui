# Approval Request Template (guidance only)

> The Approval Assistant assembles ONE concrete decision package and
> awaits an explicit Human decision. This template contains NO
> approval field — the Human's decision happens outside any
> template, and only the trusted signing path issues a Permit.

```markdown
## Decision package (single operation)

### Exact proposal
- proposal_id:          <…>
- revision:             <…>   digest: <exact proposal digest>
- operation:            APPEND_EXISTING_NOTE

### Target
- vault context:        <intended Vault — shown explicitly>
- target note:          <one existing relative path>

### Base
- before hash:          <base_sha256 + observation time>
- freshness warning:    <if freshness cannot be established, say so here>

### Payload
- full append preview:  <rendered below>
  <exact payload content>
- byte length:          <N>   payload sha256: <SHA-256 of exact bytes>
- hidden-byte disclosures: <whitespace / encoding / trailing newline notes>

### Evidence
- sources + provenance: <references; observation vs inference labeled>
- uncertainty:          <limitations, contradictions>

### Review result
- reviewer reference:   <identity + independence context>
- reviewed digest:      <must equal the digest above>
- recommendation:       <request changes | reject | recommend approval>
- unresolved findings:  <all of them, verbatim>

### Executor
- selected executor:    <intended runtime executor identity — a verified
                         identity, never a product label>
- open eligibility issues: <or "none known">

### Decision scope
This approval, if given, authorizes THIS operation (these bindings)
only. No standing authorization, no future writes, no executor
substitution without new approval.
```

Presentation rules:

1. Nothing hidden: any additional mutation beyond the shown payload
   invalidates the presentation.
2. The Human must explicitly approve / reject / request revision.
   Silence, timeout, "ok, noted", confidence scores, or reviewer
   consensus are NOT approval.
3. Record the Human's response faithfully — including refusal and
   ambiguity. Ask for clarification when the decision cannot be bound
   to this exact package.
4. The Approval Assistant never signs, never issues a Permit, and
   never marks any field "approved".

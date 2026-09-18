# Review Checklist

Concrete checks for a Review Agent. Findings are recommendations for
the Human — never authority. Review the exact submitted digest.

## Scope

- [ ] Exactly ONE existing note targeted (no create/rename/delete)
- [ ] Operation is APPEND_EXISTING_NOTE (anything else = reject)
- [ ] No frontmatter edit, relation change, or rewrite hidden as append
- [ ] Intended Vault context stated and consistent

## Base state

- [ ] base_sha256 obtained via an authorized read of exact bytes
      (not a rendered excerpt, not a remembered/generated-looking hash)
- [ ] Observation time recorded; freshness risk flagged if any
- [ ] Note changed since observation? → stale base → successor
      proposal required (report, do not merge)

## Payload / bytes

- [ ] Payload non-empty and append-only
- [ ] Byte length + payload SHA-256 are real computed values
- [ ] Trailing newline, encoding, invisible whitespace disclosed
- [ ] Rendered preview matches actual bytes (no preview-only content)
- [ ] Epistemic labels intact: observation / evidence / hypothesis /
      conclusion not blurred; no inference upgraded to fact

## Evidence & sources

- [ ] Each material claim maps to a source reference
- [ ] Sources actually inspected vs unavailable are listed separately
- [ ] Provenance distinguishes quoted source / direct observation /
      Agent inference
- [ ] Contradictory evidence and alternative explanations preserved
- [ ] No manufactured citations or verification history

## Independence & binding

- [ ] Reviewer identity + independence context distinct from author
      (author's own relabeled pass is NOT independent review)
- [ ] Review records the exact proposal_id + revision + digest
- [ ] Blocking findings enumerated; workflow stops until resolved

## Recommendation honesty

- [ ] Recommendation is one of: request changes / reject / recommend
      approval — phrased as a recommendation, not an approval
- [ ] Dissent and unresolved findings preserved verbatim for the Human

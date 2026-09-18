# Evidence Record Template (guidance only)

> One record per source claim. Fictional placeholder values shown.
> "Unknown" is a valid, expected entry — invented values are not.

```markdown
## Evidence record

- record_id:           <unique within this thread>
- claim supported:     <the specific claim this evidence backs>

## Source

- reference:           <document/URL/artifact id>
- excerpt or artifact: <exact relevant excerpt, or artifact pointer>
- acquisition context: <when and how obtained; read path used>
- limitations:         <scope, date, translation, partial coverage…>

## Labeling

- kind:                source-statement | direct-observation | agent-inference
- confidence notes:    <what would strengthen/weaken this — or "none">

## Linkage

- thread:              <research thread / handoff_id>
- related records:     <record_ids agreeing or conflicting>
```

Rules:

1. The excerpt must actually appear in / derive from the source —
   no paraphrase disguised as quotation.
2. `agent-inference` records describe YOUR reasoning and cite the
   records they build on; they are never evidence for themselves.
3. Conflicting evidence gets its own record — do not resolve it
   here; resolution belongs to review and the Human.

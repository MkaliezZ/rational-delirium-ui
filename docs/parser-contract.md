# Parser Contract (v1.8.0)

Both note formats now enter the same saved-Markdown RDIndex. See
[the personal knowledge workflow](personal-knowledge-workflow.md) for examples.

- Legacy type/id eligibility and semantics below remain compatible.
- KOs declare object_id, kind, status and a non-empty title in ordinary
  Markdown folders. Object ids match ko-YYYYMMDD-number. Duplicate or
  conflicting identities are diagnosed, never resolved by filename or recency.
- Full YAML 1.2 core parsing is shared by object indexing and source details:
  inline/block lists, quoted escapes and literal/folded strings are supported.
  Invalid YAML, duplicate keys, aliases, anchors, merge keys, custom tags and
  unterminated frontmatter are diagnostic; no repair mutates a note.
- KO frontmatter relations accept explicit wikilinks or exact ids, including
  legacy ids. supports, contradicts, derived_from, depends_on, revises and
  supersedes join the existing normalized relation model. related and the
  legacy reverse/body declarations retain their direction rules.
- The graph, Home and source reader use one committed index revision. Saved
  file events invalidate all projections; explicit full refresh reconciles
  missed events, and asynchronous generations discard stale results.
- A duplicate identity remains ambiguous even if one declaring KO is otherwise
  invalid. Invalid declarations and unreadable sources appear in diagnostics.
- Hidden directories, templates, attachments and the demo directory are
  excluded. Ordinary Markdown outside the legacy roots is read for discovery,
  but becomes an object only through explicit KO declarations.

The following text records the retained legacy parsing contract.

# Legacy Parser Contract (v0.4.1)

Source of truth is Markdown. Parsing is read-only and conservative:
anything unparseable becomes a diagnostic, never a mutation.

## Eligibility

An indexed object must live under CASES/ EVIDENCE/ HYPOTHESES/ LOOPS/
ARCHIVE/ AND declare `frontmatter.type` in {case, evidence,
hypothesis, loop}. Folder, filename and tags never imply type.
ARCHIVE retains the original object type. `00_HOME/RD_DEMO/`,
Templates/, Attachments/, .astra/ and .obsidian/ are never UI data
sources.

## Frontmatter

Strict `yaml` document/node parse (core schema, merge disabled).
Accepted relation fields: related, complements, supports, supported_by,
contradicts, contradicted_by — each a wikilink string, list of
wikilink strings, or null/empty. Diagnosed (file excluded from
relation parsing, object still indexed when its identity parses):
duplicate keys, invalid YAML, invalid relation value types, aliases,
anchors, merge keys, custom tags. IDs are never generated, repaired
or guessed; a missing id is a diagnostic. Duplicate ids stay
one-to-many in `pathsById`.

## Body relations

Only complete lines inside TOP-LEVEL ordinary paragraphs:
`derived_from: [[target]]`, `repeats_in: [[target]]`,
`observed_in: [[target]]`. mdast-util-from-markdown determines block
structure and exclusion regions; the raw paragraph slice is then
strict-parsed. Excluded everywhere: fenced/tilde/indented code,
inline code, blockquotes, list items, HTML, HTML comments, example
blocks, unterminated fence remainders. CRLF tolerated.

## Wikilinks

`[[File]]`, `[[Folder/File]]`, `[[File|Alias]]`, `[[File#Heading]]`,
`[[File#Heading|Alias]]`, `[[File^block]]`. Aliases never participate
in identity. External URIs and absolute OS paths are rejected.
Resolution: RESOLVED (unique), AMBIGUOUS (multiple basename matches),
BROKEN (none). Broken relations never create files.

## Locations

Frontmatter locations carry field; body locations carry original
source offsets plus a 1-based UI line computed from precomputed line
starts. When a position is unreliable the location degrades to
file-level open; line numbers are never fabricated.

## Normalization

supported_by/contradicted_by normalize to logical supports/
contradicts with sides swapped; related is symmetric; complements keeps
the declared source → target direction (specific additional context, not support); the three body
predicates keep declaration direction. Multiple declarations of one
logical relation merge into one RDRelation with every assertion
kept. The plugin never writes reciprocals, infers transitivity, or
assigns semantics from backlinks.

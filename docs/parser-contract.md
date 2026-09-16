# Parser Contract (v0.4.1)

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
Accepted relation fields: related, supports, supported_by,
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
contradicts with sides swapped; related is symmetric; the three body
predicates keep declaration direction. Multiple declarations of one
logical relation merge into one RDRelation with every assertion
kept. The plugin never writes reciprocals, infers transitivity, or
assigns semantics from backlinks.

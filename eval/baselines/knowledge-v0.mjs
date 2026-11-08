// Frozen pre-eval query/context algorithm, extracted before retrieval changes.
// Storage and parsing dependencies are shared; this is not native Obsidian search.
import {RDIndex} from "../../src/index/rd-index.ts";
import {splitFrontmatter,parseYamlFields} from "../../src/parsers/frontmatter-parser.ts";
import {KnowledgeError,integer,requireValue,string as string3} from "../../standalone/errors.ts";
import {canonical,sha256} from "../../standalone/files.ts";
export {RootFiles} from "../../standalone/files.ts";
export const FolderKnowledge = class {
  constructor(files) {
    this.files = files;
    this.sources = /* @__PURE__ */ new Map();
    this.paths = [];
    this.fingerprints = /* @__PURE__ */ new Map();
    this.started = false;
    this.revision = sha256("");
    this.scanDiagnostics = [];
    this.index = new RDIndex({
      list: () => this.paths,
      read: async (path2) => {
        const file = this.sources.get(path2);
        if (!file) throw new KnowledgeError("SOURCE_UNREADABLE", "Source unavailable");
        return file.markdown;
      },
      mtime: (path2) => this.sources.get(path2)?.mtime ?? 0
    });
  }
  async refresh() {
    const scan = this.files.scan(), next = /* @__PURE__ */ new Map(), fingerprints = /* @__PURE__ */ new Map();
    this.scanDiagnostics = [...scan.diagnostics];
    for (const path2 of scan.paths) {
      try {
        const read = this.files.read(path2);
        next.set(path2, { path: path2, markdown: read.text, revision: read.revision, mtime: read.mtime });
        fingerprints.set(path2, `${read.revision}:${read.mtime}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.scanDiagnostics.push({ type: "source_unreadable", path: path2, message });
        fingerprints.set(path2, `unreadable:${message}`);
      }
    }
    const changed = [.../* @__PURE__ */ new Set([...this.fingerprints.keys(), ...fingerprints.keys()])].filter((path2) => fingerprints.get(path2) !== this.fingerprints.get(path2)).sort();
    this.sources.clear();
    for (const [path2, file] of next) this.sources.set(path2, file);
    this.paths = scan.paths;
    if (!this.started) {
      await this.index.build();
      this.started = true;
    } else if (changed.length) await this.index.applyBatch(changed.map((path2) => ({ path: path2, deleted: !fingerprints.has(path2) })));
    this.fingerprints = fingerprints;
    this.revision = sha256(canonical([...fingerprints].map(([path2]) => [path2, next.get(path2)?.revision ?? "unreadable"])));
    return { changed, revision: this.revision };
  }
  get(args) {
    requireValue(args.id !== void 0 !== (args.path !== void 0), "INVALID_ARGUMENT", "Provide exactly one id or relative path");
    let path2;
    if (args.id !== void 0) {
      const id = string3(args.id, "id"), paths = this.index.snapshot().pathsById.get(id) ?? [];
      requireValue(paths.length > 0, "NOT_FOUND", "No declared object has this id", { id });
      requireValue(paths.length === 1, "AMBIGUOUS_ID", "Object identity is ambiguous; no file was selected", { id, paths });
      path2 = paths[0];
      requireValue(this.index.objectAt(path2) !== null, "INVALID_OBJECT", "The declaration is invalid; inspect validate diagnostics", { id, path: path2 });
    } else {
      path2 = string3(args.path, "path");
      this.files.absolute(path2);
    }
    const file = this.sources.get(path2);
    requireValue(file !== void 0, "NOT_FOUND", "Source is missing, excluded or unreadable", { path: path2 });
    const object = this.index.objectAt(path2), block = splitFrontmatter(file.markdown);
    const detail = object?.id ? this.index.detailById(object.id) : null;
    return {
      id: object?.id ?? null,
      path: path2,
      revision: file.revision,
      format: object?.schema ?? "note",
      kind: object?.type ?? null,
      status: object?.status ?? null,
      title: object?.title ?? file.markdown.split(/\r\n|\r|\n/).find((line) => line.startsWith("# "))?.slice(2) ?? path2,
      frontmatter: block === null ? {} : parseYamlFields(block.text, path2).fields,
      provenance: detail?.state === "available" ? detail.frontmatter.provenance ?? {} : {},
      body: block === null ? file.markdown : file.markdown.slice(block.end),
      bodyStartLine: block === null ? 1 : file.markdown.slice(0, block.end).split(/\r\n|\r|\n/).length,
      markdown: file.markdown,
      diagnostics: this.index.semanticSnapshot().diagnostics.filter((d) => d.paths.includes(path2))
    };
  }
  search(args) {
    const query = string3(args.query, "query").trim().toLowerCase(), terms = query.split(/\s+/);
    const limit = integer(args.limit, 20, 1, 100), offset = integer(args.offset, 0, 0, 5e4);
    const includeNotes = args.includeNotes === true;
    const scope = args.scope ?? "all";
    requireValue(["all", "title", "body"].includes(scope), "INVALID_ARGUMENT", "scope must be all, title or body");
    const hits = [];
    for (const [path2, file] of this.sources) {
      const object = this.index.objectAt(path2);
      if (!object && !includeNotes) continue;
      if (args.kind !== void 0 && object?.type !== args.kind) continue;
      if (args.status !== void 0 && object?.status !== args.status) continue;
      const block = splitFrontmatter(file.markdown);
      const title = object?.title ?? path2;
      const haystack = scope === "title" ? title : scope === "body" ? file.markdown.slice(block?.end ?? 0) : title + "\n" + file.markdown;
      if (!terms.every((term) => haystack.toLowerCase().includes(term))) continue;
      const lines = file.markdown.split(/\r\n|\r|\n/);
      const lineIndex = lines.findIndex((line) => terms.some((term) => line.toLowerCase().includes(term)));
      hits.push({
        id: object?.id ?? null,
        path: path2,
        title,
        kind: object?.type ?? null,
        status: object?.status ?? null,
        revision: file.revision,
        line: lineIndex < 0 ? null : lineIndex + 1,
        excerpt: lineIndex < 0 ? title.slice(0, 240) : lines[lineIndex].slice(0, 240)
      });
    }
    hits.sort((a, b) => a.path.localeCompare(b.path));
    return {
      query: args.query,
      total: hits.length,
      offset,
      limit,
      hits: hits.slice(offset, offset + limit),
      ordering: "path; no confidence or knowledge-quality score"
    };
  }
  relations(args) {
    const object = this.get({ id: string3(args.id, "id") });
    const direction = args.direction ?? "both";
    requireValue(["both", "incoming", "outgoing"].includes(direction), "INVALID_ARGUMENT", "Invalid direction");
    const result = this.index.relationsFor(object.path);
    const rows = [
      ...direction !== "incoming" ? result.outgoing.map((relation) => ({ relation, direction: "outgoing" })) : [],
      ...direction !== "outgoing" ? result.incoming.map((relation) => ({ relation, direction: "incoming" })) : []
    ].filter((row) => args.predicate === void 0 || row.relation.predicate === args.predicate).map(({ relation, direction: direction2 }) => ({
      predicate: relation.predicate,
      direction: direction2,
      source: relation.source,
      target: relation.target,
      assertions: relation.assertions.map((assertion) => ({
        predicate: assertion.predicate,
        path: assertion.location.path,
        field: assertion.location.field ?? null,
        line: assertion.location.line ?? null,
        raw: assertion.link.raw
      }))
    }));
    return { id: object.id, path: object.path, relations: rows };
  }
  context(args) {
    const id = string3(args.id, "id"), depth = integer(args.depth, 1, 0, 3), budget = integer(args.budget, 12e3, 1e3, 2e5);
    const maxObjects = integer(args.maxObjects, 12, 1, 32), graph = this.index.semanticSnapshot();
    this.get({ id });
    const visited = /* @__PURE__ */ new Set(), queue = [{ id, hop: 0 }];
    const objects = [];
    let truncated = false;
    while (queue.length && objects.length < maxObjects) {
      const current = queue.shift();
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      let source;
      try {
        source = this.get({ id: current.id });
      } catch {
        truncated = true;
        continue;
      }
      const provenance = Object.fromEntries(Object.entries(source.provenance).map(([key, value]) => [key, String(value).slice(0, 512)]));
      const item = {
        id: source.id,
        path: source.path,
        revision: source.revision,
        title: source.title.slice(0, 200),
        kind: source.kind,
        status: source.status,
        provenance,
        bodyStartLine: source.bodyStartLine,
        body: source.body,
        truncated: false
      };
      const remaining = budget - JSON.stringify(objects).length - JSON.stringify({ ...item, body: "" }).length - 500;
      if (remaining < 0) {
        truncated = true;
        break;
      }
      item.body = source.body.slice(0, Math.max(0, Math.floor(remaining / 2)));
      item.truncated = item.body !== source.body || JSON.stringify(provenance) !== JSON.stringify(source.provenance);
      truncated ||= Boolean(item.truncated);
      objects.push(item);
      if (current.hop < depth) {
        const neighbors = graph.edges.filter((e) => e.source === current.id || e.target === current.id).map((e) => e.source === current.id ? e.target : e.source).sort();
        for (const other of neighbors.slice(0, 64)) if (!visited.has(other) && queue.length < 128) queue.push({ id: other, hop: current.hop + 1 });
        if (neighbors.length > 64) truncated = true;
      }
    }
    const included = new Set(objects.map((o) => o.id));
    const result = {
      id,
      depth,
      budget,
      truncated: truncated || queue.length > 0,
      objects,
      edges: graph.edges.filter((e) => included.has(e.source) && included.has(e.target)).slice(0, 128),
      unresolved: graph.unresolved.filter((e) => included.has(e.source) || included.has(e.target)).slice(0, 32),
      meaning: "Declared source context; traversal does not infer new relationships or validate claims"
    };
    while (JSON.stringify(result).length > budget) {
      result.truncated = true;
      const last = result.objects[result.objects.length - 1];
      if (last && String(last.body).length) {
        last.body = String(last.body).slice(0, Math.floor(String(last.body).length / 2));
        last.truncated = true;
      } else if (result.unresolved.length) result.unresolved.pop();
      else if (result.edges.length) result.edges.pop();
      else if (result.objects.length) result.objects.pop();
      else break;
    }
    return result;
  }
  validate() {
    const graph = this.index.semanticSnapshot();
    const errors = graph.diagnostics.filter((d) => d.type !== "unknown-status");
    return {
      structurallyValid: errors.length === 0 && this.scanDiagnostics.length === 0,
      counts: { files: this.paths.length, objects: graph.nodes.length, relations: graph.edges.length, unresolved: graph.unresolved.length },
      errors,
      warnings: [...graph.diagnostics.filter((d) => d.type === "unknown-status"), ...this.scanDiagnostics],
      unresolved: graph.unresolved,
      meaning: "Structure and reference resolution only; not truth validation"
    };
  }
  export(includeContent = false) {
    const graph = this.index.semanticSnapshot();
    return includeContent ? {
      schema: "rd-knowledge-export/1",
      revision: this.revision,
      graph,
      objects: graph.nodes.map((node2) => this.get({ id: node2.object_id }))
    } : graph;
  }
  dispose() {
    this.index.dispose();
  }
};

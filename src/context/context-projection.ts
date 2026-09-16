import type {
  ContextProjectionData,
  IndexState,
  ProjectionRelationRow,
  RDObject,  RDRelation,
} from "../model";
import type { RDIndex } from "../index/rd-index";
import { parseWikilink } from "../parsers/link-reference";

const TYPE_SECTION: Record<string, string> = {
  evidence: "Related Evidence",
  hypothesis: "Related Hypotheses",
  loop: "Related Loops",
  case: "Other Semantic Relations",
};

interface TypedRow extends ProjectionRelationRow {
  targetPath: string | null;
}

export function buildProjection(
  object: RDObject,
  outgoing: RDRelation[],
  incoming: RDRelation[],
  indexState: IndexState,
  mode: "FOLLOW" | "PINNED",
  index: RDIndex,
  path: string,
): ContextProjectionData {
  const toTypedRow = (
    rel: RDRelation,
    direction: "outgoing" | "incoming",
  ): TypedRow => {
    const assertion = rel.assertions[0];
    const endpoint = direction === "outgoing" ? rel.target : rel.source;
    const targetPath = endpoint.path;
    const displayId = endpoint.objectId ?? endpoint.raw;
    return {
      predicate: rel.predicate,
      direction,
      targetId: displayId,
      targetTitle: endpoint.objectId === null
        ? endpoint.raw : titleFor(index, targetPath ?? "", displayId),
      targetPath,
      resolution: rel.targetResolution,
      sourcePath: assertion ? assertion.location.path : null,
      sourceLine: assertion?.location.line ?? null,
      sourceRevision: assertion?.location.sourceRevision ?? null,
      sourceLocator: assertion?.location.kind === "body"
        ? { predicate: assertion.predicate, raw: assertion.link.raw } : undefined,
      alias: null,
      subpath: null,
      ordinary: false,
    };
  };

  const outgoingRows = outgoing.map((r) => toTypedRow(r, "outgoing"));
  const incomingRows = incoming.map((r) => toTypedRow(r, "incoming"));

  const ordinaryRows: ProjectionRelationRow[] = index
    .ordinaryLinksOf(path)
    .map((raw) => {
      const resolution = index.ordinaryLinkResolution(path, raw);
      const resolvedPath = resolution.state === "RESOLVED"
        ? resolution.paths[0] ?? null : null;
      // RD-11: parse the raw link to extract alias + subpath
      const link = raw.includes("|") || raw.includes("#") || raw.includes("^")
        ? parseWikilink(raw) : null;
      const alias = link?.alias ?? null;
      const subpath = link ? (link.heading ? "#" + link.heading : link.block ? "^" + link.block : null) : null;
      return {
        predicate: "related" as const,
        direction: "outgoing" as const,
        targetId: link?.targetName ?? raw,
        targetTitle: alias ?? link?.targetName ?? raw,
        targetPath: resolvedPath,
        resolution: resolution.state,
        sourcePath: path,
        sourceLine: null,
        sourceRevision: null,
        alias,
        subpath,
        ordinary: true,
      };
    });
  for (const srcPath of index.ordinaryBacklinksOf(path)) {
    ordinaryRows.push({
      predicate: "related",
      direction: "incoming",
      targetId: srcPath,
      targetTitle: titleFor(index, srcPath, srcPath),
      targetPath: srcPath,
      resolution: "RESOLVED",
      sourcePath: srcPath,
      sourceLine: null,
      sourceRevision: null,
      alias: null,
      subpath: null,
      ordinary: true,
    });
  }

  const data: ContextProjectionData = {
    phase: "READY",
    indexState,
    mode,
    object: {
      id: object.id ?? "(no id)",
      type: object.type,
      title: object.title,
      status: object.status,
      lastVerified: object.lastVerified,
      demo: object.demo,
      proof: object.proof,
    },
    sections: [],
  };

  const allSemantic = [...outgoingRows, ...incomingRows];
  if (object.type === "case") {
    const bySection = new Map<string, ProjectionRelationRow[]>();
    const unresolved: ProjectionRelationRow[] = [];
    const contradictions: ProjectionRelationRow[] = [];
    for (const row of allSemantic) {
      if (row.predicate === "contradicts") contradictions.push(row);
      if (row.resolution === "RESOLVED" && row.targetPath !== null) {
        const targetObj = index.objectAt(row.targetPath);
        if (targetObj !== null) {
          const title = TYPE_SECTION[targetObj.type] ?? "Other Semantic Relations";
          const list = bySection.get(title) ?? [];
          list.push(row);
          bySection.set(title, list);
          continue;
        }
      }
      unresolved.push(row);
    }
    for (const [title, rows] of bySection) {
      if (rows.length > 0) {
        data.sections.push({
          key: title.toLowerCase().replace(/ /g, "-"),
          title, rows,
        });
      }
    }
    if (contradictions.length > 0) {
      data.sections.push({ key: "contradictions", title: "Contradictions", rows: contradictions });
    }
    if (unresolved.length > 0) {
      data.sections.push({ key: "unresolved", title: "Unresolved", rows: unresolved });
    }
    if (ordinaryRows.length > 0) {
      data.sections.push({ key: "other-links", title: "Other Links", rows: ordinaryRows });
    }
    return data;
  }

  data.sections.push({
    key: "relations",
    title: "Relations",
    rows: [...allSemantic, ...ordinaryRows],
  });
  return data;
}

function titleFor(index: RDIndex, path: string, fallback: string): string {
  if (!path) return fallback;
  const obj = index.objectAt(path);
  return obj ? obj.title : fallback;
}

import type {
  LogicalPredicate,
  RDLink,
  RDRelation,
  RDRelationEndpoint,
  RDRelationAssertion,
  ResolutionState,
} from "../model";
import { resolveLink } from "../parsers/link-reference";

export interface NormalizedAssertion {
  source: RDRelationEndpoint;
  target: RDRelationEndpoint;
  sourcePath: string;
  sourceId: string;
  predicate: LogicalPredicate;
  targetId: string;
  /** RD-05: real object ID or null when unresolved. */
  targetObjectId: string | null;
  /** RD-05/RA-01: original wikilink target (e.g. "E"). */
  targetRaw: string;
  targetPaths: string[];
  targetResolution: ResolutionState;
  assertion: RDRelationAssertion;
}

const REVERSE: Record<string, { predicate: LogicalPredicate; swap: boolean }> = {
  related: { predicate: "related", swap: false },
  supports: { predicate: "supports", swap: false },
  supported_by: { predicate: "supports", swap: true },
  contradicts: { predicate: "contradicts", swap: false },
  contradicted_by: { predicate: "contradicts", swap: true },
  derived_from: { predicate: "derived_from", swap: false },
  repeats_in: { predicate: "repeats_in", swap: false },
  observed_in: { predicate: "observed_in", swap: false },
};

interface ResolvedEndpoint {
  path: string;
  objectId: string | null;
  resolution: ResolutionState;
}

function resolveEndpoint(
  link: RDLink,
  candidatePaths: readonly string[],
  idByPath: ReadonlyMap<string, string>,
): ResolvedEndpoint {
  const resolution = resolveLink(link, candidatePaths);
  if (resolution.state === "RESOLVED" && resolution.paths.length > 0) {
    const path = resolution.paths[0];
    return { path, objectId: idByPath.get(path) ?? null, resolution: "RESOLVED" };
  }
  return { path: "", objectId: null, resolution: resolution.state };
}

/** RC-D (RD-05): reverse relations swap ALL identity fields —
 * fromPath, fromId, toPath, toId, and resolution — while assertion
 * provenance still points to the original declaring file/field. */
export function normalizeAssertion(
  sourcePath: string,
  sourceId: string,
  assertion: RDRelationAssertion,
  candidatePaths: readonly string[],
  idByPath?: ReadonlyMap<string, string>,
): NormalizedAssertion {
  const rule = REVERSE[assertion.predicate];
  const endpoint = resolveEndpoint(assertion.link, candidatePaths,
    idByPath ?? new Map());
  const declarer: RDRelationEndpoint = {
    objectId: sourceId, raw: sourcePath, path: sourcePath, resolution: "RESOLVED",
  };
  const referenced: RDRelationEndpoint = {
    objectId: endpoint.objectId,
    raw: assertion.link.targetName,
    path: endpoint.path || null,
    resolution: endpoint.resolution,
  };
  const source = rule.swap ? referenced : declarer;
  const target = rule.swap ? declarer : referenced;
  return {
    source,
    target,
    sourcePath: source.path ?? "",
    sourceId: source.objectId ?? "",
    predicate: rule.predicate,
    // Compatibility display field only; identity lives in target.objectId.
    targetId: target.objectId ?? target.raw,
    targetObjectId: target.objectId,
    targetRaw: target.raw,
    targetPaths: target.path ? [target.path] : [],
    targetResolution: endpoint.resolution,
    assertion,
  };
}

function endpointKey(endpoint: RDRelationEndpoint): string {
  return endpoint.path !== null
    ? JSON.stringify(["file", endpoint.path, endpoint.objectId])
    : JSON.stringify(["unresolved", endpoint.resolution, endpoint.raw]);
}

export function normalizeRelations(
  items: NormalizedAssertion[],
): RDRelation[] {
  const byKey = new Map<string, RDRelation>();
  for (const item of items) {
    const endpoints = [endpointKey(item.source), endpointKey(item.target)];
    if (item.predicate === "related") endpoints.sort();
    const key = JSON.stringify([item.predicate, ...endpoints]);
    const existing = byKey.get(key);
    if (existing) {
      existing.assertions.push(item.assertion);
      if (item.targetPaths.length > 0 && existing.targetPaths.length === 0) {
        existing.targetPaths = item.targetPaths;
        existing.targetResolution = item.targetResolution;
      }
      continue;
    }
    byKey.set(key, {
      key,
      predicate: item.predicate,
      source: item.source,
      target: item.target,
      sourcePath: item.sourcePath,
      sourceId: item.sourceId,
      targetObjectId: item.targetObjectId,
      targetRaw: item.targetRaw,
      targetId: item.targetId,
      targetPaths: item.targetPaths,
      targetResolution: item.targetResolution,
      assertions: [item.assertion],
    });
  }
  return [...byKey.values()];
}

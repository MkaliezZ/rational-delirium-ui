/** Deterministic presentation of existing first-hop rows. Coordinates are
 * disposable UI values, never an index, graph authority or saved layout. */
import type { GraphProjectionData } from "../graph/graph-projection";
import type { RDObject } from "../model";
import { createChild } from "./dom-helpers";

const NS = "http://www.w3.org/2000/svg";
const WIDTH = 1140, NODE_W = 280, NODE_H = 116, STEP = 160;
interface Position { x: number; y: number; }

function svg<K extends keyof SVGElementTagNameMap>(
  parent: Element, tag: K, attributes: Record<string, string>, text?: string,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  parent.appendChild(el);
  return el;
}

export function renderGraphSurface(
  host: HTMLElement,
  data: GraphProjectionData,
  objectAt: (path: string) => RDObject | null,
  select: (path: string) => void,
  markerId: string,
): void {
  const root = data.selectedObject;
  if (root === null) return;
  const caption = createChild(host, "div", { cls: "rdg-map-caption" });
  createChild(caption, "span", { text: "RELATION FIELD · FIRST HOP" });
  createChild(caption, "span", { text: "Declared connections · positions are not importance" });
  const viewport = createChild(host, "div", { cls: "rdg-map-viewport" });
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", "Declared relation field; scroll to explore");
  const stage = createChild(viewport, "div", { cls: "rdg-map-stage" });
  // Resolved neighbors occur once, even when several predicates connect them.
  // Unresolved declarations remain separate non-object endpoints.
  const keyFor = (edge: GraphProjectionData["firstHop"][number]) =>
    edge.resolution === "RESOLVED" && edge.otherPath !== null
      ? edge.otherPath : `unresolved:${edge.key}`;
  const neighbors = new Map<string, GraphProjectionData["firstHop"][number]>();
  for (const edge of data.firstHop) {
    if (edge.otherPath !== root.path) neighbors.set(keyFor(edge), edge);
  }
  const entries = [...neighbors].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const left = entries.filter(([, edge]) => edge.direction === "incoming");
  const right = entries.filter(([, edge]) => edge.direction === "outgoing");
  const height = Math.max(340, Math.max(left.length, right.length) * STEP + 72);
  stage.style.width = `${WIDTH}px`;
  stage.style.height = `${height}px`;
  const positions = new Map<string, Position>();
  const rootPos = { x: 430, y: (height - NODE_H) / 2 };
  positions.set(root.path, rootPos);
  for (const [list, x] of [[left, 24], [right, 836]] as const) {
    list.forEach(([key], n) => positions.set(key, { x, y: 36 + n * STEP }));
  }
  const drawing = svg(stage, "svg", {
    class: "rdg-map-lines", width: String(WIDTH), height: String(height),
    viewBox: `0 0 ${WIDTH} ${height}`, "aria-hidden": "true", focusable: "false",
  });
  const marker = svg(svg(drawing, "defs", {}), "marker", {
    id: markerId, viewBox: "0 0 10 10", refX: "9", refY: "5",
    markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse",
  });
  svg(marker, "path", { d: "M 1 1 L 9 5 L 1 9", class: "rdg-arrow" });
  const bundles = new Map<string, number>();
  for (const edge of data.firstHop) {
    const other = positions.get(edge.otherPath === root.path ? root.path : keyFor(edge))!;
    const from = edge.direction === "outgoing" ? rootPos : other;
    const to = edge.direction === "outgoing" ? other : rootPos;
    const isSelf = from === to;
    const rightward = to.x > from.x;
    const sx = from.x + (rightward || isSelf ? NODE_W : 0);
    const tx = to.x + (rightward ? 0 : NODE_W);
    const sy = from.y + NODE_H / 2, ty = to.y + NODE_H / 2;
    const bundle = keyFor(edge);
    const lane = bundles.get(bundle) ?? 0;
    bundles.set(bundle, lane + 1);
    const offset = lane * 24;
    const mx = (sx + tx) / 2;
    const path = isSelf
      ? `M ${sx} ${sy} C ${sx + 70} ${sy} ${sx + 70} ${from.y - 28 - offset} ${from.x + NODE_W / 2} ${from.y - 28 - offset} L ${from.x + NODE_W / 2} ${from.y}`
      : `M ${sx} ${sy} C ${mx} ${sy - offset} ${mx} ${ty - offset} ${tx} ${ty}`;
    const group = svg(drawing, "g", { class: "rdg-map-edge", "data-predicate": edge.predicate,
      "data-direction": edge.direction, "data-resolution": edge.resolution });
    svg(group, "path", { d: path, "marker-end": `url(#${markerId})` });
    const labelY = isSelf ? from.y - 32 - offset : (sy + ty) / 2 - 8 - offset;
    svg(group, "text", { x: String(isSelf ? sx : mx), y: String(labelY), "text-anchor": "middle" }, edge.predicate);
  }
  const node = (position: Position, identity: {
    path: string; id: string | null; title: string; type: string; status: string;
  } | null, fallback: string, resolution: string, current: boolean) => {
    const el = createChild(stage, identity === null ? "div" : "button", { cls: "rdg-map-node" });
    el.style.left = `${position.x}px`;
    el.style.top = `${position.y}px`;
    el.setAttribute("data-resolution", resolution);
    if (identity !== null) {
      el.setAttribute("data-object-path", identity.path);
      el.setAttribute("data-object-id", identity.id ?? "");
      el.setAttribute("aria-label", `Inspect ${identity.id ?? "identity unavailable"}: ${identity.title || "title unavailable"}`);
      el.setAttribute("aria-pressed", String(current));
      el.addEventListener("click", () => select(identity.path));
    } else {
      el.setAttribute("aria-disabled", "true");
    }
    el.title = identity === null ? `${fallback} · ${resolution}`
      : `${identity.title || "Title unavailable"} · ${identity.id || "Identity unavailable"} · ${identity.type} · ${identity.status || "Lifecycle unavailable"}`;
    createChild(el, "span", { cls: "rdg-node-kind", text: identity?.type || `${resolution} endpoint` });
    createChild(el, "span", { cls: "rdg-node-title", text: identity !== null ? identity.title || "Title unavailable" : fallback });
    createChild(el, "span", { cls: "rdg-node-id", text: identity?.id || "Identity unavailable" });
    createChild(el, "span", { cls: "rdg-node-status", text: identity !== null
      ? `lifecycle · ${identity.status || "unavailable"}` : "Not a resolved knowledge object" });
  };
  node(rootPos, root, "", "RESOLVED", true);
  for (const [key, edge] of entries) {
    const object = edge.resolution === "RESOLVED" && edge.otherPath !== null ? objectAt(edge.otherPath) : null;
    node(positions.get(key)!, object, edge.otherLabel, object === null && edge.resolution === "RESOLVED" ? "UNAVAILABLE" : edge.resolution, false);
  }
}

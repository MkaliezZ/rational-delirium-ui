import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { renderKoSurface } from "../src/views/ko-surface";
import { koDetailFromNote } from "../src/semantic-graph/ko-detail-reader";
import { GRAPH_SCHEMA_TAG, type GraphLoadResult } from "../src/semantic-graph/graph-loader";

const snapshot: GraphLoadResult = { state: "available", graph: {
  schema: GRAPH_SCHEMA_TAG,
  nodes: ["A", "B"].map(object_id => ({ object_id, title: object_id, kind: "hypothesis", status: "active", predecessor: object_id === "A" ? "B" : null, successor: null })),
  edges: [{ source: "A", target: "B", relation: "supports" }],
  unresolved: [{ source: "MISSING", target: "A", relation: "contradicts" }], diagnostics: [],
} };
function source() {
  const detail = koDetailFromNote("A.md", '---\nobject_id: A\nkind: hypothesis\nstatus: active\ntitle: Declared title\ncreated_from:\n  - research/R1.md\nprovenance:\n  observation: Recorded event\n  inference: Possible explanation only\n---\n# Body is not provenance\n');
  if (detail.state !== "available") throw new Error("fixture invalid");
  return detail.frontmatter;
}
describe("KO leaf presentation", () => {
  it("renders declared source identity and separate provenance layers without parsing body", () => {
    const host = document.createElement("section");
    renderKoSurface(host, { path: "A.md", frontmatter: source(), snapshot });
    expect(host.textContent).toContain("Declared title");
    expect(host.textContent).toContain("status · declared lifecycleactive");
    expect(host.querySelector('[data-layer="observation"]')?.textContent).toContain("Recorded event");
    expect(host.querySelector('[data-layer="inference"]')?.textContent).toContain("Possible explanation only");
    expect(host.textContent).not.toContain("Body is not provenance");
    expect(host.textContent).toContain("research/R1.md");
  });
  it("does not fabricate missing title, provenance, dates, origin or lifecycle", () => {
    const host = document.createElement("section");
    renderKoSurface(host, { path: "A.md", frontmatter: {object_id:"A"}, snapshot: null });
    expect(host.textContent).toContain("Title not declared");
    expect(host.textContent).toContain("status · declared lifecyclenot declared");
    expect(host.querySelectorAll('.rdko-layer')).toHaveLength(4);
    expect(host.textContent).toContain("Not declared in the available source fields.");
    expect(host.textContent).toContain("Snapshot not loaded");
    expect(host.textContent).not.toContain("No declared relations in this snapshot.");
  });
  it("reuses directed snapshot relations and keeps unresolved endpoints inert", () => {
    const inspect = vi.fn(), host = document.createElement("section");
    renderKoSurface(host, { path: "A.md", frontmatter: source(), snapshot, inspect });
    const rel = host.querySelector('[data-section="relations"]')!;
    expect(rel.textContent).toContain("A — supports →B");
    expect(rel.textContent).toContain("A ← contradicts —MISSING · unresolved");
    expect(rel.querySelectorAll('button')).toHaveLength(1);
    (rel.querySelector('button') as HTMLButtonElement).click(); expect(inspect).toHaveBeenCalledWith("B");
    expect(host.querySelector('[data-section="lineage"]')?.textContent).toContain("Previous · predecessor field ·B");
  });
  it("surfaces source/snapshot disagreement rather than replacing source metadata", () => {
    const host = document.createElement("section");
    renderKoSurface(host, { path:"A.md", frontmatter:{...source(),status:"archived"},snapshot });
    expect(host.querySelector('.rdko-identity')?.textContent).toContain("archived");
    expect(host.textContent).toContain("snapshot kind hypothesis, status active. Not reconciled.");
  });
  it("distinguishes absent declarations from missing or ambiguous snapshot identity", () => {
    const host = document.createElement("section");
    if(snapshot.state!=="available")throw new Error();
    const graph={...snapshot.graph,edges:[],unresolved:[],nodes:[{...snapshot.graph.nodes[0],predecessor:null}]};
    renderKoSurface(host,{path:"A.md",frontmatter:source(),snapshot:{state:"available",graph}});
    expect(host.textContent).toContain("No declared relations in this snapshot.");
    expect(host.textContent).toContain("No lineage declared in this snapshot.");
    renderKoSurface(host,{path:"A.md",frontmatter:source(),snapshot:{state:"available",graph:{...graph,nodes:[]}}});
    expect(host.textContent).toContain("Object missing");
    renderKoSurface(host,{path:"A.md",frontmatter:source(),snapshot:{state:"available",graph:{...graph,nodes:[...graph.nodes,...graph.nodes]}}});
    expect(host.textContent).toContain("Object ambiguous");
    expect(host.querySelectorAll('.rdko-link-row')).toHaveLength(0);
  });
  it("preserves explicit expansion and focus across a snapshot redraw", () => {
    const host=document.createElement("section");document.body.append(host);
    const input={path:"A.md",frontmatter:source(),snapshot};renderKoSurface(host,input);
    const details=host.querySelector<HTMLDetailsElement>('[data-section="provenance"]')!;
    details.open=true;details.querySelector('summary')!.focus();renderKoSurface(host,input);
    expect(host.querySelector<HTMLDetailsElement>('[data-section="provenance"]')?.open).toBe(true);
    expect((document.activeElement as HTMLElement).dataset.focusKey).toBe("provenance");host.remove();
  });
  it("treats source strings as text, never HTML or executable actions", () => {
    const host=document.createElement("section");
    renderKoSurface(host,{path:"A.md",frontmatter:{object_id:"A",title:'<img src=x onerror=alert(1)>',provenance:{evidence:'<script>bad()</script>'}},snapshot:null});
    expect(host.querySelectorAll('img,script')).toHaveLength(0);expect(host.textContent).toContain('<script>bad()</script>');
  });
  it("component selectors cannot match native editor or third-party DOM without its own root", () => {
    const css=readFileSync('styles/styles.css','utf8').split('/* KO Surface:')[1];
    const sheet=new CSSStyleSheet();sheet.replaceSync(css.slice(css.indexOf('*/')+2));
    for(const rule of sheet.cssRules)if('selectorText' in rule)for(const s of String(rule.selectorText).split(','))expect(s.trim()).toMatch(/^\.rd-ko-surface(?:\s|$)/);
    for(const path of ['src/views/ko-surface.ts','src/architecture/rd-ko-leaf-theme.ts']){
      const text=readFileSync(path,'utf8');expect(text).not.toMatch(/new RDIndex|new GraphSnapshotCoordinator|setTimeout|setInterval|requestAnimationFrame|MutationObserver|localStorage|saveData|processFrontMatter|vault\.(modify|create|delete|rename)/);
    }
  });
});

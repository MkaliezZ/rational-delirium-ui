import type { RDIndex } from "../index/rd-index";
import type { GraphSource } from "./graph-loader";

/** Live projection of saved Markdown; the index owns every file read/event.
 * Exported graph.json files remain optional interchange artifacts. */
export class IndexedGraphSource implements GraphSource {
  constructor(private readonly index: RDIndex) {}
  subscribe(listener: () => void): () => void { return this.index.subscribe(listener); }
  async read() {
    if (this.index.state !== "READY") {
      return {state: "unavailable" as const, reason: "Saved-note index is not ready"};
    }
    return {state: "available" as const, origin: "live-index" as const,
      text: JSON.stringify(this.index.semanticSnapshot())};
  }
}

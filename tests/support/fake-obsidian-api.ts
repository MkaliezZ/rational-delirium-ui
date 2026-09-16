/** Minimal public Obsidian surface for production View/navigation acceptance. */
export class TFile {
  stat = { mtime: 1 };
  constructor(public path: string) {}
}

export class MarkdownView {
  file: TFile | null = null;
  readonly cursors: Array<{ line: number; ch: number }> = [];
  constructor(private readonly content: (path: string) => string) {}
  editor = {
    getValue: (): string => this.file === null ? "" : this.content(this.file.path),
    setCursor: (cursor: { line: number; ch: number }): void => { this.cursors.push(cursor); },
  };
  getViewType(): string { return "markdown"; }
}

export class ItemView {
  readonly contentEl = document.createElement("div");
  constructor(_leaf: unknown) { document.body.appendChild(this.contentEl); }
}

export interface FakeMetadata {
  path: string;
  subpaths: Map<string, { start: { line: number; col: number }; end: null }>;
  calls: Array<{ path: string; subpath: string }>;
}

export function resolveSubpath(cache: FakeMetadata, subpath: string) {
  cache.calls.push({ path: cache.path, subpath });
  return cache.subpaths.get(subpath) ?? null;
}

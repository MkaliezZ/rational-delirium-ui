/** Minimal safe-DOM helpers so view renderers stay testable outside
 * Obsidian: plain createElement/textContent only. */

export function emptyEl(el: HTMLElement): void {
  while (el.firstChild !== null) el.removeChild(el.firstChild);
}

export function createChild(
  parent: HTMLElement,
  tag: string,
  opts?: { cls?: string; text?: string },
): HTMLElement {
  const el = document.createElement(tag);
  if (opts?.cls !== undefined && opts.cls !== "") el.className = opts.cls;
  if (opts?.text !== undefined) el.textContent = opts.text;
  parent.appendChild(el);
  return el;
}

import type { ContextProjectionData } from "../model";
import { createChild, emptyEl } from "./dom-helpers";

/** Safe-DOM identity header for the projection. All note-derived
 * content goes through textContent-style creation only. */

export interface HeaderCallbacks {
  onPinToggle(): void;
}

export function renderObjectSummary(
  container: HTMLElement,
  data: ContextProjectionData,
  pinned: boolean,
  callbacks: HeaderCallbacks,
): void {
  const hadFocus = container.contains(document.activeElement);
  const focusedCls =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.className
      : null;
  emptyEl(container);
  const head = createChild(container, "div", { cls: "rdc-head" });
  if (data.object) {
    createChild(head, "span", { cls: "rdc-id", text: data.object.id });
  }
  const pin = createChild(head, "button", {
    cls: "rdc-pin",
    text: pinned ? "Unpin" : "Pin",
  });
  pin.setAttribute("aria-pressed", pinned ? "true" : "false");
  pin.setAttribute(
    "aria-label",
    pinned ? "Unpin context target" : "Pin context target",
  );
  pin.addEventListener("click", callbacks.onPinToggle);

  if (data.phase === "ERROR") {
    createChild(container, "div", {
      cls: "rdc-state rdc-error",
      text: data.pinnedDeleted ? "Pinned target deleted" : "Context error",
    });
    return;
  }
  if (data.phase === "NO_ACTIVE_OBJECT" || !data.object) {
    createChild(container, "div", {
      cls: "rdc-state",
      text:
        data.indexState === "INDEXING" ? "INDEXING" : "No active RD object",
    });
    return;
  }
  createChild(container, "div", { cls: "rdc-title", text: data.object.title });
  const badges = createChild(container, "div");
  const statusBadge = createChild(badges, "span", {
    cls: "rdc-badge",
    text: data.object.status || "(no status)",
  });
  statusBadge.setAttribute("data-kind", "status");
  if (data.object.proof) {
    const b = createChild(badges, "span", { cls: "rdc-badge", text: "proof" });
    b.setAttribute("data-kind", "proof");
  }
  if (data.object.demo) {
    const b = createChild(badges, "span", { cls: "rdc-badge", text: "demo" });
    b.setAttribute("data-kind", "demo");
  }
  const verify = createChild(badges, "span", {
    cls: "rdc-badge",
    text: data.object.lastVerified
      ? `verified ${data.object.lastVerified}`
      : "never verified",
  });
  verify.setAttribute("data-kind", "verification");
  if (hadFocus && focusedCls !== null) {
    const again = container.querySelector<HTMLElement>("." + focusedCls.trim().replace(/\s+/g, "."));
    again?.focus();
  }
}

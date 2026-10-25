import { tokens } from "@motionlab/dialkit";
import { describeElement } from "./clone";

export interface SelectionHandle {
  cancel(): void;
}

/**
 * Hover-to-highlight, click-to-select.
 *
 * The highlight is a separate overlay element positioned over the candidate —
 * the page's own elements are never given an outline, a class or an inline
 * style, so there is nothing to put back afterwards. Cancelling or selecting
 * removes the overlay and every listener.
 */
export function startSelection(options: {
  onSelect(element: Element): void;
  onCancel(): void;
}): SelectionHandle {
  const host = document.createElement("div");
  host.setAttribute("data-motionlab-selector", "");
  host.style.cssText = [
    "position:fixed",
    "inset:0",
    `z-index:${tokens.zOverlay}`,
    "pointer-events:none",
  ].join(";");

  const box = document.createElement("div");
  box.style.cssText = [
    "position:absolute",
    `border:2px solid ${tokens.accent}`,
    `background:color-mix(in srgb, ${tokens.accent} 12%, transparent)`,
    "border-radius:3px",
    "transition:all 60ms linear",
    "pointer-events:none",
  ].join(";");

  const label = document.createElement("div");
  label.style.cssText = [
    "position:absolute",
    "padding:3px 7px",
    `background:${tokens.accent}`,
    `color:${tokens.accentText}`,
    `font-family:${tokens.mono}`,
    "font-size:11px",
    "line-height:1.4",
    "border-radius:3px",
    "white-space:nowrap",
    "pointer-events:none",
  ].join(";");

  const hint = document.createElement("div");
  hint.style.cssText = [
    "position:fixed",
    "left:50%",
    "top:16px",
    "transform:translateX(-50%)",
    "padding:7px 14px",
    `background:${tokens.surface}`,
    `color:${tokens.text}`,
    `border:1px solid ${tokens.borderStrong}`,
    "border-radius:999px",
    `font-family:${tokens.font}`,
    "font-size:12px",
    "box-shadow:0 6px 24px rgba(0,0,0,0.4)",
    "pointer-events:none",
  ].join(";");
  hint.textContent = "MotionLab · Click to select · Esc to cancel";

  host.append(box, label, hint);
  document.documentElement.appendChild(host);

  let current: Element | null = null;

  function isOurs(element: Element | null): boolean {
    return Boolean(element?.closest("[data-motionlab-selector], [data-motionlab-stage]"));
  }

  function highlight(element: Element) {
    const rect = element.getBoundingClientRect();
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;

    label.textContent = `${describeElement(element)} · ${Math.round(rect.width)}×${Math.round(rect.height)}`;
    // Flip the label below the element when there is no room above it.
    const above = rect.top > 24;
    label.style.left = `${Math.max(4, rect.left)}px`;
    label.style.top = above ? `${rect.top - 22}px` : `${rect.bottom + 4}px`;
  }

  function onPointerMove(event: PointerEvent) {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || isOurs(element) || element === current) return;
    current = element;
    highlight(element);
  }

  function onClick(event: MouseEvent) {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || isOurs(element)) return;
    // Selecting must not also activate whatever was underneath.
    event.preventDefault();
    event.stopPropagation();
    teardown();
    options.onSelect(element);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    teardown();
    options.onCancel();
  }

  function onScrollOrResize() {
    if (current?.isConnected) highlight(current);
  }

  let torndown = false;
  function teardown() {
    if (torndown) return;
    torndown = true;
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", onScrollOrResize, true);
    window.removeEventListener("resize", onScrollOrResize);
    host.remove();
  }

  // Capture phase throughout, so the page cannot swallow the selection click
  // before MotionLab sees it.
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize);

  return { cancel: () => { teardown(); options.onCancel(); } };
}

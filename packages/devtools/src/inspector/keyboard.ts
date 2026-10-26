/**
 * Whether a keystroke belongs to something the user is typing into.
 *
 * Read from the composed path, not `event.target`: inside a shadow root the
 * target is retargeted to the host element, so a check on `target` alone
 * would let Space in MotionLab's own number field replay the animation.
 */
export function isTypingEvent(event: KeyboardEvent): boolean {
  const origin = event.composedPath()[0];
  if (!(origin instanceof HTMLElement)) return false;
  if (origin.isContentEditable) return true;
  const tag = origin.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (origin as HTMLInputElement).type;
    return !["button", "checkbox", "radio", "range", "submit", "reset"].includes(type);
  }
  return false;
}

/**
 * Whether a bare-key shortcut (Space, A, B, S) should reach MotionLab. Only
 * when focus is on MotionLab itself or nowhere in particular — never while
 * the developer is operating a control on their own page, where Space means
 * "press this button".
 */
export function shortcutAllowed(event: KeyboardEvent, isOwn: (node: EventTarget) => boolean): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (isTypingEvent(event)) return false;
  const origin = event.composedPath()[0];
  if (origin && isOwn(origin)) {
    // Inside the panel, Space and Enter press the focused button. On a
    // slider or number field they are free, so "adjust, then Space to feel
    // it" works without leaving the control.
    const element = origin instanceof HTMLElement ? origin : null;
    const role = element?.getAttribute("role");
    const interactive =
      element?.tagName === "BUTTON" || role === "button" || role === "radio" || role === "switch" || role === "menuitem";
    if (interactive && (event.key === " " || event.key === "Enter")) return false;
    return true;
  }
  const active = document.activeElement;
  return !active || active === document.body || active === document.documentElement || isOwn(active);
}

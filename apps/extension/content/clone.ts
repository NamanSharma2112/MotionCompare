/**
 * Cloning a page element into the MotionLab stage.
 *
 * MotionLab animates a copy, never the live element. The page keeps its node,
 * its position in the layout, its listeners and its scroll state; if something
 * here fails, the worst outcome is that no preview appears.
 */

/** Above this, inlining styles would cost more than the preview is worth. */
const MAX_NODES = 2000;

/**
 * The properties worth carrying over.
 *
 * The clone is mounted in a shadow root, so the page's stylesheets do not
 * reach it — the computed values have to come across as inline styles.
 * Copying every computed property would mean thousands of declarations per
 * node; this is the visual subset, which is what the preview is judged on.
 */
const COPIED_PROPERTIES = [
  "box-sizing", "display", "position", "top", "right", "bottom", "left", "z-index",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
  "justify-content", "align-items", "align-self", "align-content", "gap",
  "grid-template-columns", "grid-template-rows", "grid-column", "grid-row",
  "font-family", "font-size", "font-weight", "font-style", "font-variant-numeric",
  "line-height", "letter-spacing", "text-align", "text-transform", "text-decoration",
  "text-overflow", "white-space", "word-break", "vertical-align",
  "color", "background-color", "background-image", "background-size",
  "background-position", "background-repeat", "background-clip",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "border-top-left-radius", "border-top-right-radius",
  "border-bottom-left-radius", "border-bottom-right-radius",
  "box-shadow", "outline", "overflow", "overflow-x", "overflow-y",
  "opacity", "transform", "transform-origin", "filter", "backdrop-filter",
  "object-fit", "object-position", "list-style", "cursor", "visibility",
  "fill", "stroke", "stroke-width",
] as const;

function countNodes(element: Element): number {
  return 1 + element.querySelectorAll("*").length;
}

function copyComputedStyles(source: Element, target: HTMLElement): void {
  const computed = window.getComputedStyle(source);
  const declarations: string[] = [];
  for (const property of COPIED_PROPERTIES) {
    const value = computed.getPropertyValue(property);
    if (value && value !== "none" && value !== "auto" && value !== "normal") {
      declarations.push(`${property}:${value}`);
    }
  }
  target.setAttribute("style", declarations.join(";"));
}

/**
 * A readable description of what was selected, in the shape a developer would
 * recognize from their own markup: `div.checkout-card`.
 */
export function describeElement(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const classes = Array.from(element.classList)
    .filter((name) => !name.startsWith("motionlab"))
    .slice(0, 2)
    .map((name) => `.${name}`)
    .join("");
  return `${tag}${id}${classes}` || tag;
}

/**
 * Deep-clone an element for the stage, with its computed appearance inlined.
 *
 * Returns null rather than throwing when the subtree is too large or cloning
 * fails, so the caller can show "Unable to create preview" and leave the page
 * untouched.
 */
export function cloneForStage(element: Element): HTMLElement | null {
  try {
    if (countNodes(element) > MAX_NODES) return null;

    const clone = element.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return null;

    // Copy styles while the two trees still match node for node, then strip
    // the nodes that must not come along. Doing it in this order keeps the
    // walk a simple index pairing.
    const sourceNodes: Element[] = [element, ...Array.from(element.querySelectorAll("*"))];
    const cloneNodes: Element[] = [clone, ...Array.from(clone.querySelectorAll("*"))];

    for (let index = 0; index < sourceNodes.length; index += 1) {
      const target = cloneNodes[index];
      const source = sourceNodes[index];
      if (source && target instanceof HTMLElement) copyComputedStyles(source, target);
    }

    // MotionLab previews appearance and motion. It does not run the site's
    // code, load its frames, or re-request its embeds.
    clone
      .querySelectorAll("script, noscript, iframe, object, embed")
      .forEach((node) => node.remove());

    return prepare(clone);
  } catch {
    return null;
  }
}

function prepare(clone: HTMLElement): HTMLElement {
  // The stage positions the clone itself; a page element that was fixed or
  // absolutely positioned would otherwise fly out of the frame.
  clone.style.setProperty("position", "relative");
  clone.style.setProperty("top", "auto");
  clone.style.setProperty("left", "auto");
  clone.style.setProperty("right", "auto");
  clone.style.setProperty("bottom", "auto");
  clone.style.setProperty("margin", "0");
  clone.style.setProperty("transform", "none");
  clone.style.setProperty("opacity", "1");
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  return clone;
}

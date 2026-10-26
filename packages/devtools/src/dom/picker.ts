import { nameElement } from "./naming";

export interface PickerOptions {
  /** Where the overlay is drawn — inside MotionLab's root, so its styles apply. */
  container: HTMLElement;
  /** True for elements MotionLab owns; they can never be picked. */
  isOwn(element: Element): boolean;
  onHover?(element: Element | null): void;
  onSelect(element: Element): void;
  onCancel(): void;
}

export interface PickerHandle {
  cancel(): void;
}

/**
 * Hover → highlight → click → select.
 *
 * The highlight is MotionLab's own element positioned over the candidate; the
 * page's elements never receive an outline, class or style. The outline is
 * thin and borrows the element's own corner radius so it reads as a tracing
 * of the component rather than a box dropped on top of it. ↑ and ↓ walk to
 * the parent and back, for the common case where the pointer lands on a
 * child of the component you meant.
 */
export function startPicker(options: PickerOptions): PickerHandle {
  const layer = document.createElement("div");
  layer.className = "mlui-pick";

  const box = document.createElement("div");
  box.className = "mlui-pick-box";

  const label = document.createElement("div");
  label.className = "mlui-pick-label";
  const labelName = document.createElement("span");
  labelName.className = "mlui-pick-name";
  const labelSize = document.createElement("span");
  labelSize.className = "mlui-pick-size";
  label.append(labelName, labelSize);

  const hint = document.createElement("div");
  hint.className = "mlui-pick-hint";
  hint.innerHTML =
    '<span>Click to select</span><span class="mlui-pick-hint-sep"></span><kbd class="mlui-kbd">↑</kbd><span>parent</span><span class="mlui-pick-hint-sep"></span><kbd class="mlui-kbd">Esc</kbd><span>cancel</span>';

  layer.append(box, label, hint);
  options.container.appendChild(layer);

  let current: Element | null = null;
  const descended: Element[] = [];
  let torndown = false;

  function show(element: Element | null) {
    current = element;
    options.onHover?.(element);
    if (!element) {
      layer.removeAttribute("data-active");
      return;
    }
    const rect = element.getBoundingClientRect();
    const radius = window.getComputedStyle(element).borderTopLeftRadius;
    layer.setAttribute("data-active", "");
    box.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    box.style.borderRadius = radius && radius !== "0px" ? radius : "3px";

    labelName.textContent = nameElement(element).name;
    labelSize.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    const below = rect.bottom + 34 < window.innerHeight;
    const top = below ? rect.bottom + 6 : Math.max(6, rect.top - 30);
    const left = Math.min(Math.max(6, rect.left), window.innerWidth - 220);
    label.style.transform = `translate(${left}px, ${top}px)`;
  }

  function candidateAt(x: number, y: number): Element | null {
    const element = document.elementFromPoint(x, y);
    if (!element || options.isOwn(element)) return null;
    if (element === document.documentElement || element === document.body) return null;
    return element;
  }

  function onPointerMove(event: PointerEvent) {
    const element = candidateAt(event.clientX, event.clientY);
    if (element === current || (element && descended.includes(element))) return;
    descended.length = 0;
    show(element);
  }

  function onClick(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target : null;
    if (target && options.isOwn(target)) return;
    // Selecting must not also press whatever was underneath.
    event.preventDefault();
    event.stopPropagation();
    const element = current ?? candidateAt(event.clientX, event.clientY);
    if (!element) return;
    teardown();
    options.onSelect(element);
  }

  function swallow(event: Event) {
    const target = event.target instanceof Element ? event.target : null;
    if (target && options.isOwn(target)) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      teardown();
      options.onCancel();
      return;
    }
    if (event.key === "ArrowUp" && current?.parentElement && current.parentElement !== document.body) {
      event.preventDefault();
      descended.push(current);
      show(current.parentElement);
      return;
    }
    if (event.key === "ArrowDown" && descended.length > 0) {
      event.preventDefault();
      show(descended.pop() ?? null);
      return;
    }
    if (event.key === "Enter" && current) {
      event.preventDefault();
      const element = current;
      teardown();
      options.onSelect(element);
    }
  }

  function onViewportChange() {
    if (current?.isConnected) show(current);
  }

  function teardown() {
    if (torndown) return;
    torndown = true;
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("pointerdown", swallow, true);
    document.removeEventListener("mousedown", swallow, true);
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", onViewportChange, true);
    window.removeEventListener("resize", onViewportChange);
    layer.remove();
  }

  // Capture phase throughout, so the page cannot handle the selecting click
  // before MotionLab does.
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("pointerdown", swallow, true);
  document.addEventListener("mousedown", swallow, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", onViewportChange, true);
  window.addEventListener("resize", onViewportChange);

  return {
    cancel() {
      teardown();
    },
  };
}

/**
 * Temporarily hide the real element while its stand-in plays, and put it back
 * exactly as it was. The previous inline value is restored, including its
 * priority, so nothing about the page is left changed.
 */
export function hideElement(element: Element): () => void {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) return () => {};
  const style = element.style;
  const previous = style.getPropertyValue("visibility");
  const priority = style.getPropertyPriority("visibility");
  style.setProperty("visibility", "hidden", "important");
  return () => {
    if (previous) style.setProperty("visibility", previous, priority);
    else style.removeProperty("visibility");
    if (element.getAttribute("style") === "") element.removeAttribute("style");
  };
}

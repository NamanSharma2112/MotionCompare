import {
  interpolateMotionValues,
  type MotionKeyframes,
  type MotionValues,
} from "@motionlab/core";

/** The CSS a `MotionValues` snapshot corresponds to. */
export interface MotionStyle {
  opacity: string;
  transform: string;
  filter: string;
}

/**
 * Turn motion values into CSS.
 *
 * Lives in the DOM adapters rather than in the core: the core interpolates
 * numbers, and deciding that `y` means `translate3d`'s second argument is a
 * browser concern. The extension's DOM mode imports this same function, so a
 * value tuned in the React devtools renders identically on an arbitrary page.
 */
export function motionValuesToStyle(values: Required<MotionValues>): MotionStyle {
  const transforms: string[] = [];
  // translate3d rather than translate so the compositor handles it.
  if (values.x !== 0 || values.y !== 0) {
    transforms.push(`translate3d(${values.x}px, ${values.y}px, 0)`);
  }
  if (values.scale !== 1) transforms.push(`scale(${values.scale})`);
  if (values.rotate !== 0) transforms.push(`rotate(${values.rotate}deg)`);

  return {
    opacity: String(values.opacity),
    transform: transforms.length > 0 ? transforms.join(" ") : "none",
    filter: values.blur > 0 ? `blur(${values.blur}px)` : "none",
  };
}

/**
 * A driver that writes one variant's styles straight to its element.
 *
 * Playback writes to the DOM directly instead of going through React state:
 * a 60fps re-render of the developer's real component would make the
 * comparison measure React's render cost rather than the transition.
 */
export function createStyleDriver(keyframes: MotionKeyframes) {
  let element: HTMLElement | null = null;

  function apply(progress: number) {
    if (!element) return;
    const style = motionValuesToStyle(interpolateMotionValues(keyframes, progress));
    element.style.opacity = style.opacity;
    element.style.transform = style.transform;
    element.style.filter = style.filter;
  }

  return {
    attach(next: HTMLElement | null) {
      element = next;
      if (element) {
        element.style.willChange = "transform, opacity, filter";
        apply(0);
      }
    },
    apply,
    /** Hand the element back as we found it. */
    release() {
      if (!element) return;
      element.style.willChange = "";
      element.style.opacity = "";
      element.style.transform = "";
      element.style.filter = "";
      element = null;
    },
  };
}

export type StyleDriver = ReturnType<typeof createStyleDriver>;

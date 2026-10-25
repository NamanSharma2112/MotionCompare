import type { BezierDefinition, Easing } from "../types/index";
import { clamp } from "../utils/index";

/** The named easings MotionLab offers, in the order the UI shows them. */
export type NamedEasing = "linear" | "ease" | "easeIn" | "easeOut" | "easeInOut";

/** The named easings, expressed as the cubic beziers CSS uses. */
export const NAMED_EASINGS: Record<NamedEasing, BezierDefinition> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

export const EASING_NAMES: NamedEasing[] = ["linear", "ease", "easeIn", "easeOut", "easeInOut"];

export function isNamedEasing(value: unknown): value is NamedEasing {
  return typeof value === "string" && (EASING_NAMES as string[]).includes(value);
}

export function toBezier(ease: Easing): BezierDefinition {
  if (Array.isArray(ease)) return ease;
  return NAMED_EASINGS[ease] ?? NAMED_EASINGS.ease;
}

function bezierComponent(t: number, a: number, b: number): number {
  // Cubic bezier with implicit p0 = 0 and p3 = 1.
  const c = 3 * a;
  const bb = 3 * (b - a) - c;
  const aa = 1 - c - bb;
  return ((aa * t + bb) * t + c) * t;
}

function bezierSlope(t: number, a: number, b: number): number {
  const c = 3 * a;
  const bb = 3 * (b - a) - c;
  const aa = 1 - c - bb;
  return (3 * aa * t + 2 * bb) * t + c;
}

/**
 * Solve a cubic bezier for y given x, the way browsers do: Newton-Raphson
 * with a bisection fallback for the flat regions where the derivative is
 * too small to converge.
 */
export function cubicBezier(ease: Easing): (progress: number) => number {
  const [x1, y1, x2, y2] = toBezier(ease);

  if (x1 === y1 && x2 === y2) return (progress) => clamp(progress, 0, 1);

  return (progress: number) => {
    const x = clamp(progress, 0, 1);
    if (x === 0 || x === 1) return x;

    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const currentX = bezierComponent(t, x1, x2) - x;
      if (Math.abs(currentX) < 1e-6) return bezierComponent(t, y1, y2);
      const slope = bezierSlope(t, x1, x2);
      if (Math.abs(slope) < 1e-6) break;
      t -= currentX / slope;
    }

    let low = 0;
    let high = 1;
    t = x;
    for (let i = 0; i < 24; i += 1) {
      const currentX = bezierComponent(t, x1, x2);
      if (Math.abs(currentX - x) < 1e-6) break;
      if (currentX > x) high = t;
      else low = t;
      t = (low + high) / 2;
    }

    return bezierComponent(t, y1, y2);
  };
}

export function formatBezier(ease: Easing): string {
  const [x1, y1, x2, y2] = toBezier(ease);
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

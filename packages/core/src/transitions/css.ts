import type { BezierDefinition, Easing, MotionValues } from "../types/index";
import { round } from "../utils/index";

/**
 * Pure parsers for the strings browsers report in computed styles and in
 * `Animation.effect.getKeyframes()`. No DOM access here: an adapter reads the
 * string, the core interprets it.
 */

/** `"250ms"`, `"0.25s"`, `"0.25s, 1s"` → milliseconds of the first entry. */
export function parseCssTime(value: string | null | undefined): number {
  return parseCssTimeList(value)[0] ?? 0;
}

export function parseCssTimeList(value: string | null | undefined): number[] {
  if (!value) return [];
  return value.split(",").map((part) => {
    const trimmed = part.trim();
    const number = Number.parseFloat(trimmed);
    if (!Number.isFinite(number)) return 0;
    return trimmed.endsWith("ms") ? number : trimmed.endsWith("s") ? number * 1000 : number;
  });
}

/**
 * A CSS timing function as the easing MotionLab tunes.
 *
 * `linear(...)` and `steps(...)` have no cubic-bezier equivalent; they come
 * back as `null` so the caller can say so instead of silently substituting a
 * curve that is not what the page runs.
 */
export function parseCssEasing(value: string | null | undefined): Easing | null {
  const timing = (value ?? "").split(/,(?![^(]*\))/)[0]?.trim() ?? "";
  if (!timing) return "ease";

  const bezier = /^cubic-bezier\(([^)]+)\)$/.exec(timing);
  if (bezier?.[1]) {
    const parts = bezier[1].split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return parts.map((n) => round(n, 3)) as BezierDefinition;
    }
    return null;
  }

  switch (timing) {
    case "linear":
      return "linear";
    case "ease":
      return "ease";
    case "ease-in":
      return "easeIn";
    case "ease-out":
      return "easeOut";
    case "ease-in-out":
      return "easeInOut";
    default:
      return null;
  }
}

function parseLength(value: string | undefined): number {
  const number = Number.parseFloat(value ?? "");
  return Number.isFinite(number) ? number : 0;
}

function parseAngle(value: string): number {
  const match = /(-?[\d.]+)(deg|rad|turn|grad)?/.exec(value);
  if (!match?.[1]) return 0;
  const amount = Number.parseFloat(match[1]);
  switch (match[2]) {
    case "rad":
      return (amount * 180) / Math.PI;
    case "turn":
      return amount * 360;
    case "grad":
      return amount * 0.9;
    default:
      return amount;
  }
}

/**
 * Read a transform function list — `translateY(-6px) scale(0.97)` — which
 * is how Chromium reports a CSS transition's keyframes. Composes translate,
 * scale and rotate in order; skew and perspective are ignored, since
 * MotionLab does not replay them.
 */
function parseFunctionList(value: string): { x: number; y: number; scale: number; rotate: number } | null {
  const pattern = /([a-zA-Z0-9]+)\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  let found = false;
  let x = 0;
  let y = 0;
  let scale = 1;
  let rotate = 0;
  while ((match = pattern.exec(value))) {
    found = true;
    const name = match[1]!.toLowerCase();
    const args = match[2]!.split(/[\s,]+/).filter(Boolean);
    switch (name) {
      case "translate":
      case "translate3d":
        x += parseLength(args[0]);
        y += parseLength(args[1]);
        break;
      case "translatex":
        x += parseLength(args[0]);
        break;
      case "translatey":
        y += parseLength(args[0]);
        break;
      case "scale":
      case "scale3d": {
        const first = Number.parseFloat(args[0] ?? "1");
        if (Number.isFinite(first)) scale *= first;
        break;
      }
      case "scalex":
      case "scaley": {
        // A single-axis scale has no uniform equivalent; keep the larger
        // effect so the stand-in still visibly scales.
        const amount = Number.parseFloat(args[0] ?? "1");
        if (Number.isFinite(amount)) scale *= amount;
        break;
      }
      case "rotate":
      case "rotatez":
        rotate += parseAngle(args[0] ?? "0");
        break;
      default:
        break;
    }
  }
  return found ? { x, y, scale, rotate } : null;
}

/**
 * Read translate, scale and rotation out of a `transform` value — `none`,
 * `matrix(...)`, `matrix3d(...)` or a function list — and compose the
 * individual `translate` / `scale` / `rotate` properties on top.
 */
export function parseTransform(
  transform: string | null | undefined,
  individual: { translate?: string | null; scale?: string | null; rotate?: string | null } = {},
): Pick<Required<MotionValues>, "x" | "y" | "scale" | "rotate"> {
  let x = 0;
  let y = 0;
  let scale = 1;
  let rotate = 0;

  const value = (transform ?? "").trim();
  const matrix = /^matrix\(([^)]+)\)$/.exec(value);
  const matrix3d = /^matrix3d\(([^)]+)\)$/.exec(value);

  if (matrix?.[1]) {
    const [a = 1, b = 0, , , e = 0, f = 0] = matrix[1].split(",").map((n) => Number.parseFloat(n));
    scale = Math.sqrt(a * a + b * b);
    rotate = (Math.atan2(b, a) * 180) / Math.PI;
    x = e;
    y = f;
  } else if (matrix3d?.[1]) {
    const m = matrix3d[1].split(",").map((n) => Number.parseFloat(n));
    const a = m[0] ?? 1;
    const b = m[1] ?? 0;
    scale = Math.sqrt(a * a + b * b);
    rotate = (Math.atan2(b, a) * 180) / Math.PI;
    x = m[12] ?? 0;
    y = m[13] ?? 0;
  } else if (value && value !== "none") {
    const list = parseFunctionList(value);
    if (list) ({ x, y, scale, rotate } = list);
  }

  // The individual transform properties compose on top of `transform`.
  if (individual.translate && individual.translate !== "none") {
    const [tx, ty] = individual.translate.trim().split(/\s+/);
    x += parseLength(tx);
    y += parseLength(ty);
  }
  if (individual.scale && individual.scale !== "none") {
    const first = Number.parseFloat(individual.scale.trim().split(/\s+/)[0] ?? "1");
    if (Number.isFinite(first)) scale *= first;
  }
  if (individual.rotate && individual.rotate !== "none") {
    rotate += parseAngle(individual.rotate);
  }

  return { x: round(x, 2), y: round(y, 2), scale: round(scale, 4), rotate: round(rotate, 2) };
}

/** `"blur(4px)"` → 4. */
export function parseBlur(filter: string | null | undefined): number {
  const match = /blur\(\s*(-?[\d.]+)px\s*\)/.exec(filter ?? "");
  return match?.[1] ? round(Number.parseFloat(match[1]), 2) : 0;
}

/** Shared numeric helpers for the field and the slider. */

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Snap to the step grid, measured from `min`, without float residue. */
export function snapToStep(value: number, step: number, min: number): number {
  if (step <= 0) return value;
  const snapped = Math.round((value - min) / step) * step + min;
  const decimals = decimalsOf(step);
  return Number(snapped.toFixed(decimals));
}

export function decimalsOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * Display a value the way an instrument would: no trailing zeros, and a
 * leading-zero-free fraction for values under one ("0.80" reads ".8"), which
 * is how springs are usually written in a dense readout.
 */
export function formatNumber(value: number, precision: number): string {
  const fixed = value.toFixed(precision);
  const trimmed = precision > 0 ? fixed.replace(/\.?0+$/, "") : fixed;
  if (/^-?0\.\d/.test(trimmed)) return trimmed.replace(/^(-?)0\./, "$1.");
  return trimmed === "-0" ? "0" : trimmed;
}

/** Arrow-key step size: Shift is coarse (×10), Alt is fine (÷10). */
export function keyStep(step: number, event: { shiftKey: boolean; altKey: boolean }): number {
  if (event.shiftKey) return step * 10;
  if (event.altKey) return step / 10;
  return step;
}

/**
 * The shared design language.
 *
 * The V1 playground, the in-app React devtools and the browser extension all
 * read their typography, spacing and colour from here, so the three surfaces
 * feel like one product rather than three tools that happen to agree.
 *
 * These are plain strings, not a Tailwind config, for one specific reason: the
 * devtools and the extension have to look right inside an arbitrary host page
 * whose CSS MotionLab does not control and must not depend on.
 */
export const tokens = {
  font:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',

  bg: "#0b0b0d",
  surface: "#141418",
  surfaceRaised: "#1c1c22",
  surfaceSunken: "#0f0f12",
  border: "#2a2a32",
  borderStrong: "#3a3a46",

  text: "#f4f4f5",
  textMuted: "#a1a1ab",
  textFaint: "#6c6c78",

  accent: "#7c7cf8",
  accentText: "#ffffff",
  variantA: "#5aa9ff",
  variantB: "#ffa25a",
  success: "#4ec08f",
  danger: "#f2616b",

  radiusSm: "4px",
  radius: "8px",
  radiusLg: "12px",

  space1: "4px",
  space2: "8px",
  space3: "12px",
  space4: "16px",
  space5: "24px",
  space6: "32px",

  /** Above app chrome, below nothing. The devtools overlay must win. */
  zOverlay: 2147483000,
} as const;

export function variantColor(variant: "A" | "B"): string {
  return variant === "A" ? tokens.variantA : tokens.variantB;
}

/**
 * MotionLab design tokens.
 *
 * One source for the extension panel, the in-app devtools and (later) the
 * playground. Spacing runs on a 4px grid, radii stay restrained, and the type
 * scale is tight because this is an instrument read at arm's length, not a
 * page read from across the room.
 */

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
} as const;

export const radius = {
  /** Buttons, chips, segmented items. */
  control: 5,
  /** Number fields and text inputs. */
  input: 6,
  /** Menus, tooltips, popovers. */
  popover: 8,
  /** The floating panel. */
  panel: 10,
} as const;

export const fontSize = {
  /** Tiny section labels. 11px is the floor for functional text. */
  label: 11,
  /** Metadata: selectors, property lists, durations. */
  meta: 11,
  /** Default UI text. */
  ui: 12,
  /** The inspected component's name. */
  name: 13,
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
} as const;

export const font = {
  ui: '-apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", SFMono-Regular, "JetBrains Mono", Menlo, Consolas, "Liberation Mono", monospace',
} as const;

/**
 * Motion for MotionLab's own interface. Taken from Emil Kowalski's
 * standards: a strong ease-out for anything entering, exits faster than
 * entrances, and nothing over 200ms on a surface used all day.
 */
export const motion = {
  easeOut: "cubic-bezier(0.23, 1, 0.32, 1)",
  easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
  press: 140,
  hover: 120,
  tooltip: 125,
  popover: 160,
  view: 140,
  panelIn: 180,
  panelOut: 120,
} as const;

export const zIndex = {
  /** Above the host app, always. */
  layer: 2147483000,
} as const;

/**
 * Surfaces are a hierarchy, not a single grey: panel, raised control, hover,
 * active. Differences stay small on purpose — the inspected component is the
 * brightest, most saturated thing on screen, not MotionLab.
 */
export interface ColorScheme {
  panel: string;
  raised: string;
  sunken: string;
  hover: string;
  active: string;
  selected: string;
  separator: string;
  ring: string;
  text: string;
  muted: string;
  faint: string;
  inverse: string;
  inverseText: string;
  fill: string;
  track: string;
  accent: string;
  accentSoft: string;
  record: string;
  success: string;
  warning: string;
  shadowPanel: string;
  shadowPopover: string;
  backdrop: string;
}

export const dark: ColorScheme = {
  panel: "#161618",
  raised: "#202023",
  sunken: "#111113",
  hover: "rgba(255, 255, 255, 0.05)",
  active: "rgba(255, 255, 255, 0.08)",
  selected: "rgba(255, 255, 255, 0.065)",
  separator: "rgba(255, 255, 255, 0.07)",
  ring: "rgba(255, 255, 255, 0.09)",
  text: "#ededef",
  muted: "#a3a3ac",
  faint: "#82828c",
  inverse: "#ededef",
  inverseText: "#161618",
  fill: "#d9d9de",
  track: "rgba(255, 255, 255, 0.12)",
  accent: "#64a0ff",
  accentSoft: "rgba(100, 160, 255, 0.16)",
  record: "#ff6159",
  success: "#43c383",
  warning: "#e8b53a",
  shadowPanel: "0 1px 2px rgba(0, 0, 0, 0.3), 0 16px 40px -12px rgba(0, 0, 0, 0.55)",
  shadowPopover: "0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px -6px rgba(0, 0, 0, 0.5)",
  backdrop: "rgba(8, 8, 10, 0.32)",
};

export const light: ColorScheme = {
  panel: "#fcfcfd",
  raised: "#f1f1f3",
  sunken: "#f5f5f7",
  hover: "rgba(16, 16, 24, 0.045)",
  active: "rgba(16, 16, 24, 0.075)",
  selected: "rgba(16, 16, 24, 0.055)",
  separator: "rgba(16, 16, 24, 0.075)",
  ring: "rgba(16, 16, 24, 0.1)",
  text: "#17171b",
  muted: "#5c5c66",
  faint: "#6e6e78",
  inverse: "#17171b",
  inverseText: "#fcfcfd",
  fill: "#3a3a42",
  track: "rgba(16, 16, 24, 0.13)",
  accent: "#2a6ae0",
  accentSoft: "rgba(42, 106, 224, 0.12)",
  record: "#e5443b",
  success: "#1f9a5c",
  warning: "#b07d0a",
  shadowPanel: "0 1px 2px rgba(16, 16, 24, 0.06), 0 16px 40px -12px rgba(16, 16, 24, 0.22)",
  shadowPopover: "0 1px 2px rgba(16, 16, 24, 0.06), 0 8px 24px -6px rgba(16, 16, 24, 0.18)",
  backdrop: "rgba(16, 16, 24, 0.12)",
};

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

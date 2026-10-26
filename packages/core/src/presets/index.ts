import type { MotionPreset, TransitionConfig, TransitionType } from "../types/index";

/**
 * The five MotionLab presets. Every surface — playground, React devtools,
 * browser extension — offers exactly these, so a "Snappy" in one place feels
 * like a "Snappy" in another.
 */
export const PRESETS: MotionPreset[] = [
  {
    id: "smooth",
    name: "Smooth",
    description: "Neutral and unhurried. The safe default for most UI.",
    spring: { type: "spring", stiffness: 220, damping: 26, mass: 1 },
    easing: { type: "easing", duration: 320, ease: [0.33, 0, 0.2, 1] },
  },
  {
    id: "snappy",
    name: "Snappy",
    description: "Quick and decisive. Good for menus, toggles and toasts.",
    spring: { type: "spring", stiffness: 420, damping: 30, mass: 0.8 },
    easing: { type: "easing", duration: 180, ease: [0.2, 0, 0, 1] },
  },
  {
    id: "gentle",
    name: "Gentle",
    description: "Soft and slow. Suits large surfaces and sheets.",
    spring: { type: "spring", stiffness: 140, damping: 22, mass: 1 },
    easing: { type: "easing", duration: 480, ease: "easeInOut" },
  },
  {
    id: "bouncy",
    name: "Bouncy",
    description: "Overshoots and settles. Playful, use sparingly.",
    spring: { type: "spring", stiffness: 380, damping: 14, mass: 0.9 },
    easing: { type: "easing", duration: 420, ease: [0.34, 1.56, 0.64, 1] },
  },
  {
    id: "heavy",
    name: "Heavy",
    description: "Weighted and deliberate. Reads as substantial.",
    spring: { type: "spring", stiffness: 200, damping: 34, mass: 2.2 },
    easing: { type: "easing", duration: 560, ease: [0.4, 0, 0.2, 1] },
  },
];

export const PRESET_IDS = PRESETS.map((preset) => preset.id);

export function getPreset(id: string): MotionPreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

/** The preset's transition in the requested flavour, ready to apply. */
export function presetTransition(
  id: string,
  type: TransitionType = "spring",
): TransitionConfig | undefined {
  const preset = getPreset(id);
  if (!preset) return undefined;
  return type === "spring" ? { ...preset.spring } : { ...preset.easing };
}

/**
 * Which preset a transition currently matches, if any. Used to light up the
 * preset row without storing a separate "selected preset" field that could
 * drift out of sync with the dials.
 */
export function matchPreset(transition: TransitionConfig): MotionPreset | undefined {
  return PRESETS.find((preset) => {
    if (transition.type === "spring") {
      return (
        preset.spring.stiffness === transition.stiffness &&
        preset.spring.damping === transition.damping &&
        preset.spring.mass === transition.mass
      );
    }
    return (
      preset.easing.duration === transition.duration &&
      JSON.stringify(preset.easing.ease) === JSON.stringify(transition.ease)
    );
  });
}

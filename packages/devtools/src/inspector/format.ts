import {
  EASING_NAMES,
  animatedKeys,
  isSpring,
  transitionDuration,
  type Easing,
  type MotionKeyframes,
  type MotionValues,
  type TransitionConfig,
} from "@motionlab/core";
import { formatNumber } from "@motionlab/ui";

const EASE_LABEL: Record<string, string> = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
};

export function easeLabel(ease: Easing): string {
  if (Array.isArray(ease)) return "custom curve";
  return EASE_LABEL[ease] ?? ease;
}

export function durationLabel(transition: TransitionConfig): string {
  return `${Math.round(transitionDuration(transition))}ms`;
}

/** "Spring · 420 / 28 / .8" or "220ms · ease-out" — a one-line fingerprint. */
export function transitionSummary(transition: TransitionConfig): string {
  if (isSpring(transition)) {
    return `${formatNumber(transition.stiffness, 0)} / ${formatNumber(transition.damping, 1)} / ${formatNumber(transition.mass, 2)}`;
  }
  return `${Math.round(transition.duration)}ms · ${easeLabel(transition.ease)}`;
}

export function typeLabel(transition: TransitionConfig): string {
  return isSpring(transition) ? "Spring" : "Easing";
}

const PROPERTY_FOR_KEY: Record<keyof MotionValues, string> = {
  opacity: "opacity",
  x: "transform",
  y: "transform",
  scale: "transform",
  rotate: "transform",
  blur: "filter",
};

/** The CSS properties a keyframe pair animates: `["transform", "opacity"]`. */
export function cssPropertiesFor(keyframes: MotionKeyframes): string[] {
  const properties: string[] = [];
  for (const key of animatedKeys(keyframes)) {
    const property = PROPERTY_FOR_KEY[key];
    if (!properties.includes(property)) properties.push(property);
  }
  return properties;
}

export const VALUE_FIELDS: Record<
  keyof MotionValues,
  { label: string; min: number; max: number; step: number; precision: number; unit?: string }
> = {
  opacity: { label: "Opacity", min: 0, max: 1, step: 0.01, precision: 2 },
  x: { label: "X", min: -600, max: 600, step: 1, precision: 0, unit: "px" },
  y: { label: "Y", min: -600, max: 600, step: 1, precision: 0, unit: "px" },
  scale: { label: "Scale", min: 0, max: 3, step: 0.01, precision: 2 },
  rotate: { label: "Rotate", min: -360, max: 360, step: 1, precision: 0, unit: "°" },
  blur: { label: "Blur", min: 0, max: 40, step: 0.5, precision: 1, unit: "px" },
};

export const EASING_CHOICES: Array<{ value: string; label: string }> = [
  { value: "easeOut", label: "Ease out" },
  { value: "easeInOut", label: "Ease in-out" },
  { value: "ease", label: "Ease" },
  { value: "linear", label: "Linear" },
  { value: "easeIn", label: "Ease in" },
  { value: "custom", label: "Custom" },
];

export function isNamed(ease: Easing): boolean {
  return typeof ease === "string" && (EASING_NAMES as string[]).includes(ease);
}

import {
  DEFAULT_KEYFRAMES,
  createExperiment,
  presetTransition,
  type BezierDefinition,
  type Easing,
  type Experiment,
  type MotionKeyframes,
  type TransitionConfig,
} from "@motionlab/core";
import { describeElement } from "./clone";

export interface DetectedMotion {
  /** Human-readable list for the popup: "Transform", "Opacity", … */
  detected: string[];
  transition: TransitionConfig | null;
  keyframes: MotionKeyframes;
  source: "transition" | "animation" | "web-animations" | "none";
}

function parseFirstTime(value: string): number {
  const first = value.split(",")[0]?.trim() ?? "";
  if (first.endsWith("ms")) return Number.parseFloat(first);
  if (first.endsWith("s")) return Number.parseFloat(first) * 1000;
  return 0;
}

function parseTimingFunction(value: string): string {
  return value.split(",")[0]?.trim() ?? "ease";
}

/** Map a CSS timing function onto the easing MotionLab tunes. */
function toEase(timing: string): Easing {
  const bezier = /^cubic-bezier\(([^)]+)\)$/.exec(timing);
  if (bezier?.[1]) {
    const parts = bezier[1].split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return parts as BezierDefinition;
    }
  }
  switch (timing) {
    case "linear":
      return "linear";
    case "ease-in":
      return "easeIn";
    case "ease-out":
      return "easeOut";
    case "ease-in-out":
      return "easeInOut";
    default:
      return "ease";
  }
}

/**
 * Read whatever motion the page is already expressing.
 *
 * Deliberately narrow. MotionLab does not try to understand arbitrary
 * JavaScript animation: it reads CSS transitions, CSS animations and the Web
 * Animations API, which between them cover most of what a page declares, and
 * it falls back to a sensible default rather than guessing when it finds
 * nothing it recognizes.
 */
export function inspectMotion(element: Element): DetectedMotion {
  const computed = window.getComputedStyle(element);
  const detected: string[] = [];

  if (computed.transform && computed.transform !== "none") detected.push("Transform");
  if (computed.opacity && Number.parseFloat(computed.opacity) < 1) detected.push("Opacity");

  const transitionDuration = parseFirstTime(computed.transitionDuration || "0s");
  const animationDuration = parseFirstTime(computed.animationDuration || "0s");

  if (transitionDuration > 0) {
    detected.push(`Transition (${Math.round(transitionDuration)}ms)`);
  }
  if (animationDuration > 0 && computed.animationName !== "none") {
    detected.push(`Animation (${computed.animationName})`);
  }

  // The Web Animations API, where the browser exposes it.
  let waapiDuration = 0;
  try {
    const animations = typeof element.getAnimations === "function" ? element.getAnimations() : [];
    for (const animation of animations) {
      const timing = animation.effect?.getTiming();
      const duration = typeof timing?.duration === "number" ? timing.duration : 0;
      if (duration > waapiDuration) waapiDuration = duration;
    }
    if (waapiDuration > 0) detected.push(`Web Animation (${Math.round(waapiDuration)}ms)`);
  } catch {
    // getAnimations is not universally available; absence is not a failure.
  }

  const keyframes: MotionKeyframes = DEFAULT_KEYFRAMES;

  if (transitionDuration > 0) {
    return {
      detected,
      source: "transition",
      keyframes,
      transition: {
        type: "easing",
        duration: Math.round(transitionDuration),
        ease: toEase(parseTimingFunction(computed.transitionTimingFunction || "ease")),
      },
    };
  }

  if (animationDuration > 0) {
    return {
      detected,
      source: "animation",
      keyframes,
      transition: {
        type: "easing",
        duration: Math.round(animationDuration),
        ease: toEase(parseTimingFunction(computed.animationTimingFunction || "ease")),
      },
    };
  }

  if (waapiDuration > 0) {
    return {
      detected,
      source: "web-animations",
      keyframes,
      transition: { type: "easing", duration: Math.round(waapiDuration), ease: "easeOut" },
    };
  }

  return { detected, source: "none", keyframes, transition: null };
}

/**
 * Turn a selected element into an experiment.
 *
 * When the page already declares a transition, A starts as what the page
 * does today and B as a slower variant — so the first comparison is
 * "what we ship" against "an alternative", which is the question worth asking.
 * With nothing detected, A and B start from the Smooth and Snappy presets.
 */
export function experimentForElement(element: Element): {
  experiment: Experiment;
  detected: DetectedMotion;
  label: string;
} {
  const detected = inspectMotion(element);
  const label = describeElement(element);

  const variantA = detected.transition ?? presetTransition("smooth", "spring")!;
  const variantB: TransitionConfig = detected.transition
    ? detected.transition.type === "easing"
      ? { ...detected.transition, duration: Math.round(detected.transition.duration * 1.4) }
      : { ...detected.transition }
    : presetTransition("snappy", "spring")!;

  return {
    label,
    detected,
    experiment: createExperiment({
      label,
      source: "dom",
      keyframes: detected.keyframes,
      variantA: { transition: variantA, name: detected.transition ? "Page default" : "Smooth" },
      variantB: { transition: variantB, name: detected.transition ? "Slower" : "Snappy" },
    }),
  };
}

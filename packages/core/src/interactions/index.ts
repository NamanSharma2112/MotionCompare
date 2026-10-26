import { convertTransition, DEFAULT_EASING, normalizeTransition } from "../transitions/index";
import { createExperiment } from "../comparison/index";
import type {
  Experiment,
  MotionKeyframes,
  MotionValues,
  TransitionConfig,
} from "../types/index";
import { uid } from "../utils/index";

/**
 * What prompted a captured change. Drives the default label and nothing else:
 * the comparison is the same whatever started it.
 */
export type InteractionTrigger =
  | "state"
  | "enter"
  | "exit"
  | "hover"
  | "focus"
  | "press"
  | "declared"
  | "unknown";

/**
 * One piece of motion a component performs — "Closed → Open", "Item hover" —
 * and the A/B experiment run on it. A is what the component does today; B is
 * where the developer explores.
 */
export interface MotionInteraction {
  id: string;
  label: string;
  trigger: InteractionTrigger;
  /** CSS properties that moved, e.g. `["transform", "opacity"]`. */
  properties: string[];
  experiment: Experiment;
}

const NEUTRAL: Required<MotionValues> = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, blur: 0 };
const KEYS = ["opacity", "x", "y", "scale", "rotate", "blur"] as const;

/** Drop the values that do not change between the two keyframes. */
export function compactKeyframes(keyframes: MotionKeyframes): MotionKeyframes {
  const from: MotionValues = {};
  const to: MotionValues = {};
  for (const key of KEYS) {
    const a = keyframes.from[key] ?? NEUTRAL[key];
    const b = keyframes.to[key] ?? NEUTRAL[key];
    if (Math.abs(a - b) > 0.0005) {
      from[key] = a;
      to[key] = b;
    }
  }
  return { from, to };
}

/** The motion values that actually animate, in display order. */
export function animatedKeys(keyframes: MotionKeyframes): Array<keyof MotionValues> {
  return KEYS.filter((key) => {
    const a = keyframes.from[key] ?? NEUTRAL[key];
    const b = keyframes.to[key] ?? NEUTRAL[key];
    return Math.abs(a - b) > 0.0005;
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const OPEN_WORDS = /^(true|open|opened|expanded|visible|shown|show|active|on|checked|selected)$/i;
const CLOSED_WORDS = /^(false|closed|close|collapsed|hidden|hide|inactive|off|unchecked)$/i;

function stateWord(value: string | null): string {
  if (value === null || value === "") return "Closed";
  if (OPEN_WORDS.test(value)) return "Open";
  if (CLOSED_WORDS.test(value)) return "Closed";
  return capitalize(value.replace(/[-_]+/g, " "));
}

/**
 * A human label for an attribute change, in the vocabulary component authors
 * actually use: `aria-expanded false→true` reads "Closed → Open".
 */
export function labelForStateChange(
  attribute: string,
  from: string | null,
  to: string | null,
): string | null {
  switch (attribute) {
    case "open": {
      const before = from === null ? "Closed" : "Open";
      const after = to === null ? "Closed" : "Open";
      return before === after ? null : `${before} → ${after}`;
    }
    case "aria-expanded":
    case "data-state":
    case "data-open":
    case "aria-checked":
    case "aria-selected":
    case "aria-pressed": {
      const before = stateWord(from);
      const after = stateWord(to);
      return before === after ? null : `${before} → ${after}`;
    }
    case "hidden":
    case "aria-hidden": {
      const hiddenBefore = from !== null && from !== "false";
      const hiddenAfter = to !== null && to !== "false";
      if (hiddenBefore === hiddenAfter) return null;
      return hiddenAfter ? "Hide" : "Show";
    }
    default:
      return null;
  }
}

export interface CreateInteractionOptions {
  label: string;
  trigger: InteractionTrigger;
  properties: string[];
  keyframes: MotionKeyframes;
  /** What the component does today. Becomes variant A. */
  current: TransitionConfig | null;
  source?: Experiment["source"];
  /** Restores a previously tuned experiment for the same interaction. */
  saved?: Experiment;
  id?: string;
}

/**
 * Build an interaction and its experiment.
 *
 * A starts as the captured motion. B starts as the same pace re-expressed as
 * a spring, so the first replay already asks a real question — "would a
 * spring feel better here?" — instead of comparing two identical sides.
 */
export function createInteraction(options: CreateInteractionOptions): MotionInteraction {
  const current = normalizeTransition(options.current ?? DEFAULT_EASING);
  const experiment =
    options.saved ??
    createExperiment({
      label: options.label,
      source: options.source ?? "dom",
      keyframes: options.keyframes,
      variantA: { name: "Current", transition: current },
      variantB: {
        name: "Experiment",
        transition: current.type === "spring" ? { ...current } : convertTransition(current, "spring"),
      },
    });

  return {
    id: options.id ?? uid("interaction"),
    label: options.label,
    trigger: options.trigger,
    properties: options.properties,
    experiment: { ...experiment, label: options.label, keyframes: options.keyframes },
  };
}

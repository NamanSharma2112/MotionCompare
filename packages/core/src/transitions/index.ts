import type {
  EasingTransition,
  MotionKeyframes,
  MotionValues,
  SpringTransition,
  TransitionConfig,
  TransitionType,
} from "../types/index";
import { clamp, isFiniteNumber, lerp, round } from "../utils/index";
import { cubicBezier } from "./easing";
import { estimateSpringDuration, springProgressAt } from "./spring";

export * from "./easing";
export * from "./spring";

export const DEFAULT_SPRING: SpringTransition = {
  type: "spring",
  stiffness: 280,
  damping: 24,
  mass: 1,
};

export const DEFAULT_EASING: EasingTransition = {
  type: "easing",
  duration: 300,
  ease: "easeOut",
};

/** Bounds the UI dials respect and that `normalizeTransition` enforces. */
export const TRANSITION_LIMITS = {
  stiffness: { min: 1, max: 1000, step: 1 },
  damping: { min: 0, max: 100, step: 1 },
  mass: { min: 0.1, max: 10, step: 0.1 },
  velocity: { min: -20, max: 20, step: 0.5 },
  duration: { min: 0, max: 3000, step: 10 },
  delay: { min: 0, max: 2000, step: 10 },
} as const;

export function isSpring(transition: TransitionConfig): transition is SpringTransition {
  return transition.type === "spring";
}

export function isEasing(transition: TransitionConfig): transition is EasingTransition {
  return transition.type === "easing";
}

/** Clamp a transition into valid ranges and drop anything non-numeric. */
export function normalizeTransition(transition: TransitionConfig): TransitionConfig {
  if (isSpring(transition)) {
    const normalized: SpringTransition = {
      type: "spring",
      stiffness: clamp(
        isFiniteNumber(transition.stiffness) ? transition.stiffness : DEFAULT_SPRING.stiffness,
        TRANSITION_LIMITS.stiffness.min,
        TRANSITION_LIMITS.stiffness.max,
      ),
      damping: clamp(
        isFiniteNumber(transition.damping) ? transition.damping : DEFAULT_SPRING.damping,
        TRANSITION_LIMITS.damping.min,
        TRANSITION_LIMITS.damping.max,
      ),
      mass: clamp(
        isFiniteNumber(transition.mass) ? transition.mass : DEFAULT_SPRING.mass,
        TRANSITION_LIMITS.mass.min,
        TRANSITION_LIMITS.mass.max,
      ),
    };
    if (isFiniteNumber(transition.velocity) && transition.velocity !== 0) {
      normalized.velocity = clamp(
        transition.velocity,
        TRANSITION_LIMITS.velocity.min,
        TRANSITION_LIMITS.velocity.max,
      );
    }
    if (isFiniteNumber(transition.restDelta)) normalized.restDelta = transition.restDelta;
    if (isFiniteNumber(transition.delay) && transition.delay > 0) {
      normalized.delay = clamp(transition.delay, 0, TRANSITION_LIMITS.delay.max);
    }
    return normalized;
  }

  const normalized: EasingTransition = {
    type: "easing",
    duration: clamp(
      isFiniteNumber(transition.duration) ? transition.duration : DEFAULT_EASING.duration,
      TRANSITION_LIMITS.duration.min,
      TRANSITION_LIMITS.duration.max,
    ),
    ease: transition.ease ?? DEFAULT_EASING.ease,
  };
  if (isFiniteNumber(transition.delay) && transition.delay > 0) {
    normalized.delay = clamp(transition.delay, 0, TRANSITION_LIMITS.delay.max);
  }
  return normalized;
}

/** How long this transition takes to finish, in milliseconds, delay excluded. */
export function transitionDuration(transition: TransitionConfig): number {
  return isSpring(transition)
    ? estimateSpringDuration(transition)
    : Math.max(0, transition.duration);
}

export function transitionDelay(transition: TransitionConfig): number {
  return Math.max(0, transition.delay ?? 0);
}

/** Total wall-clock time a transition occupies, delay included. */
export function transitionTotalDuration(transition: TransitionConfig): number {
  return transitionDelay(transition) + transitionDuration(transition);
}

/**
 * Eased progress of a transition at `elapsedMs` since the shared clock
 * started. Pure, so both variants can be sampled from one timestamp.
 */
export function transitionProgressAt(transition: TransitionConfig, elapsedMs: number): number {
  const local = elapsedMs - transitionDelay(transition);
  if (local <= 0) return 0;

  if (isSpring(transition)) {
    const duration = estimateSpringDuration(transition);
    if (local >= duration) return 1;
    return springProgressAt(transition, local / 1000);
  }

  if (transition.duration <= 0) return 1;
  const linear = clamp(local / transition.duration, 0, 1);
  return cubicBezier(transition.ease)(linear);
}

export function isTransitionSettled(transition: TransitionConfig, elapsedMs: number): boolean {
  return elapsedMs >= transitionTotalDuration(transition);
}

/** Sample a transition into `[progressAtTime]` pairs, for curve plots and CSS. */
export function sampleTransition(
  transition: TransitionConfig,
  samples = 60,
): Array<{ time: number; progress: number }> {
  const duration = transitionDuration(transition) || 1;
  const points: Array<{ time: number; progress: number }> = [];
  for (let i = 0; i <= samples; i += 1) {
    const time = (duration * i) / samples;
    points.push({
      time,
      progress: transitionProgressAt(transition, time + transitionDelay(transition)),
    });
  }
  return points;
}

const MOTION_VALUE_KEYS = ["opacity", "x", "y", "scale", "rotate", "blur"] as const;

const NEUTRAL: Required<MotionValues> = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  blur: 0,
};

/** Fill in the properties a keyframe omitted with their no-op values. */
export function resolveMotionValues(values: MotionValues | undefined): Required<MotionValues> {
  const resolved = { ...NEUTRAL };
  if (!values) return resolved;
  for (const key of MOTION_VALUE_KEYS) {
    const value = values[key];
    if (isFiniteNumber(value)) resolved[key] = value;
  }
  return resolved;
}

/**
 * Interpolate between two keyframes. Progress may exceed 1 — that is exactly
 * what a bouncy spring does, and clamping it here would quietly delete the
 * overshoot the developer is trying to judge.
 */
export function interpolateMotionValues(
  keyframes: MotionKeyframes,
  progress: number,
): Required<MotionValues> {
  const from = resolveMotionValues(keyframes.from);
  const to = resolveMotionValues(keyframes.to);
  return {
    opacity: round(lerp(from.opacity, to.opacity, progress), 4),
    x: round(lerp(from.x, to.x, progress), 3),
    y: round(lerp(from.y, to.y, progress), 3),
    scale: round(lerp(from.scale, to.scale, progress), 4),
    rotate: round(lerp(from.rotate, to.rotate, progress), 3),
    blur: round(Math.max(0, lerp(from.blur, to.blur, progress)), 3),
  };
}

/** Swap a transition between spring and easing, keeping the feel as close as possible. */
export function convertTransition(
  transition: TransitionConfig,
  type: TransitionType,
): TransitionConfig {
  if (transition.type === type) return transition;

  if (type === "easing") {
    const duration = Math.round(transitionDuration(transition));
    const converted: EasingTransition = {
      type: "easing",
      duration: clamp(duration, TRANSITION_LIMITS.duration.min, TRANSITION_LIMITS.duration.max),
      ease: "easeOut",
    };
    if (transition.delay) converted.delay = transition.delay;
    return converted;
  }

  // Easing -> spring: pick a critically damped spring that settles in about
  // the same time, so switching type does not throw away the authored pace.
  const duration = Math.max(60, transitionDuration(transition));
  const naturalFrequency = 5.5 / (duration / 1000);
  const mass = 1;
  const stiffness = clamp(
    Math.round(naturalFrequency * naturalFrequency * mass),
    TRANSITION_LIMITS.stiffness.min,
    TRANSITION_LIMITS.stiffness.max,
  );
  const converted: SpringTransition = {
    type: "spring",
    stiffness,
    damping: clamp(
      Math.round(2 * Math.sqrt(stiffness * mass) * 0.9),
      TRANSITION_LIMITS.damping.min,
      TRANSITION_LIMITS.damping.max,
    ),
    mass,
  };
  if (transition.delay) converted.delay = transition.delay;
  return converted;
}

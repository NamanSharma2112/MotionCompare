/**
 * MotionLab core types.
 *
 * The core is deliberately framework-independent: nothing in this package may
 * reference React, the DOM, the browser or Next.js. Those belong to adapters
 * (`@motionlab/react`, `@motionlab/devtools`, the browser extension).
 */

/** The two sides of every comparison. */
export type VariantId = "A" | "B";

/** A cubic-bezier control point pair, `[x1, y1, x2, y2]`. */
export type BezierDefinition = [number, number, number, number];

/** Named easings understood by MotionLab, or an explicit cubic bezier. */
export type Easing =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | BezierDefinition;

/** A physics-based transition. Durations emerge from the simulation. */
export interface SpringTransition {
  type: "spring";
  stiffness: number;
  damping: number;
  mass: number;
  /** Initial velocity in progress units per second. */
  velocity?: number;
  /** Distance from the target at which the spring is considered settled. */
  restDelta?: number;
  /** Milliseconds to wait before this variant starts moving. */
  delay?: number;
}

/** A duration-based transition. */
export interface EasingTransition {
  type: "easing";
  /** Milliseconds. */
  duration: number;
  ease: Easing;
  /** Milliseconds to wait before this variant starts moving. */
  delay?: number;
}

export type TransitionConfig = SpringTransition | EasingTransition;

export type TransitionType = TransitionConfig["type"];

/**
 * The animatable properties MotionLab tunes. Every value is a plain number so
 * the whole model stays serializable across the extension boundary.
 */
export interface MotionValues {
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  /** Blur radius in pixels. */
  blur?: number;
}

/** The start and end state an experiment animates between. */
export interface MotionKeyframes {
  from: MotionValues;
  to: MotionValues;
}

export interface MotionVariant {
  id: VariantId;
  name?: string;
  transition: TransitionConfig;
}

/** Where the experiment came from. Drives persistence keys and UI affordances. */
export type ExperimentSource = "playground" | "react" | "dom";

export type PlaybackState = "idle" | "playing";

/**
 * The one model every MotionLab surface shares. The playground, the React SDK
 * and the browser extension all produce and consume this exact shape.
 */
export interface Experiment {
  id: string;
  label?: string;
  variantA: MotionVariant;
  variantB: MotionVariant;
  winner: VariantId | null;
  state: PlaybackState;
  source: ExperimentSource;
  /**
   * The states being animated between. Not part of the sketch in the V2 brief,
   * but an experiment is not reproducible without it: the extension reads it
   * from computed styles, the React SDK from `<MotionLabTarget from to>`.
   */
  keyframes: MotionKeyframes;
}

/** A named starting point for a transition, shared by every surface. */
export interface MotionPreset {
  id: string;
  name: string;
  description: string;
  spring: SpringTransition;
  easing: EasingTransition;
}

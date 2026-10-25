import { createExperiment } from "../comparison/index";
import { isNamedEasing, normalizeTransition } from "../transitions/index";
import type {
  Easing,
  Experiment,
  ExperimentSource,
  MotionKeyframes,
  MotionValues,
  TransitionConfig,
  VariantId,
} from "../types/index";
import { isFiniteNumber, slugify } from "../utils/index";

export const SERIALIZATION_VERSION = 1;

export interface SerializedExperiment {
  version: number;
  experiment: Experiment;
}

/** Persistence key for a React SDK target: `motionlab:target:checkout-card`. */
export function targetStorageKey(targetId: string): string {
  return `motionlab:target:${slugify(targetId)}`;
}

/** Persistence key for a DOM element the extension selected: `motionlab:domain:element`. */
export function domStorageKey(domain: string, elementSignature: string): string {
  return `motionlab:${slugify(domain)}:${slugify(elementSignature)}`;
}

export function playgroundStorageKey(experimentId: string): string {
  return `motionlab:playground:${slugify(experimentId)}`;
}

export function serializeExperiment(experiment: Experiment): string {
  const payload: SerializedExperiment = { version: SERIALIZATION_VERSION, experiment };
  return JSON.stringify(payload);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMotionValues(value: unknown): MotionValues {
  if (!isRecord(value)) return {};
  const keys = ["opacity", "x", "y", "scale", "rotate", "blur"] as const;
  const result: MotionValues = {};
  for (const key of keys) {
    const candidate = value[key];
    if (isFiniteNumber(candidate)) result[key] = candidate;
  }
  return result;
}

function parseKeyframes(value: unknown): MotionKeyframes | undefined {
  if (!isRecord(value)) return undefined;
  return { from: parseMotionValues(value.from), to: parseMotionValues(value.to) };
}

/**
 * Parse an untrusted transition. Anything that is not a recognizable
 * transition returns undefined rather than throwing — this runs on
 * localStorage contents and on messages arriving from the extension, and
 * neither is trustworthy enough to crash the devtools over.
 */
export function parseTransition(value: unknown): TransitionConfig | undefined {
  if (!isRecord(value)) return undefined;

  if (value.type === "spring") {
    if (
      !isFiniteNumber(value.stiffness) ||
      !isFiniteNumber(value.damping) ||
      !isFiniteNumber(value.mass)
    ) {
      return undefined;
    }
    return normalizeTransition({
      type: "spring",
      stiffness: value.stiffness,
      damping: value.damping,
      mass: value.mass,
      ...(isFiniteNumber(value.velocity) ? { velocity: value.velocity } : {}),
      ...(isFiniteNumber(value.restDelta) ? { restDelta: value.restDelta } : {}),
      ...(isFiniteNumber(value.delay) ? { delay: value.delay } : {}),
    });
  }

  if (value.type === "easing") {
    if (!isFiniteNumber(value.duration)) return undefined;
    const ease = value.ease;
    const isBezier =
      Array.isArray(ease) && ease.length === 4 && ease.every((n) => isFiniteNumber(n));
    if (!isBezier && !isNamedEasing(ease)) return undefined;
    return normalizeTransition({
      type: "easing",
      duration: value.duration,
      ease: ease as Easing,
      ...(isFiniteNumber(value.delay) ? { delay: value.delay } : {}),
    });
  }

  return undefined;
}

function parseVariant(value: unknown, id: VariantId) {
  if (!isRecord(value)) return undefined;
  const transition = parseTransition(value.transition);
  if (!transition) return undefined;
  return {
    id,
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    transition,
  };
}

const SOURCES: ExperimentSource[] = ["playground", "react", "dom"];

/** Parse a serialized experiment, returning undefined for anything malformed. */
export function deserializeExperiment(raw: string | null | undefined): Experiment | undefined {
  if (!raw) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (!isRecord(parsed)) return undefined;
  const body = isRecord(parsed.experiment) ? parsed.experiment : parsed;

  const variantA = parseVariant(body.variantA, "A");
  const variantB = parseVariant(body.variantB, "B");
  if (!variantA || !variantB) return undefined;

  const source = SOURCES.includes(body.source as ExperimentSource)
    ? (body.source as ExperimentSource)
    : "playground";

  const base = createExperiment({
    ...(typeof body.id === "string" ? { id: body.id } : {}),
    ...(typeof body.label === "string" ? { label: body.label } : {}),
    source,
    ...(parseKeyframes(body.keyframes) ? { keyframes: parseKeyframes(body.keyframes)! } : {}),
  });

  return {
    ...base,
    variantA,
    variantB,
    winner: body.winner === "A" || body.winner === "B" ? body.winner : null,
    state: "idle",
  };
}

import { DEFAULT_SPRING, normalizeTransition } from "../transitions/index";
import type {
  Experiment,
  ExperimentSource,
  MotionKeyframes,
  MotionVariant,
  PlaybackState,
  TransitionConfig,
  VariantId,
} from "../types/index";
import { uid } from "../utils/index";

export const DEFAULT_KEYFRAMES: MotionKeyframes = {
  from: { opacity: 0, y: 20, scale: 0.96 },
  to: { opacity: 1, y: 0, scale: 1 },
};

export interface CreateExperimentOptions {
  id?: string;
  label?: string;
  source?: ExperimentSource;
  keyframes?: MotionKeyframes;
  variantA?: Partial<Omit<MotionVariant, "id">>;
  variantB?: Partial<Omit<MotionVariant, "id">>;
}

/**
 * Build an experiment. A and B start from the same transition on purpose:
 * the first thing a developer does is change one side, and starting from a
 * shared baseline makes that change the only variable.
 */
export function createExperiment(options: CreateExperimentOptions = {}): Experiment {
  const baseline = options.variantA?.transition ?? DEFAULT_SPRING;
  return {
    id: options.id ?? uid("experiment"),
    ...(options.label !== undefined ? { label: options.label } : {}),
    variantA: {
      id: "A",
      name: options.variantA?.name ?? "Variant A",
      transition: normalizeTransition({ ...baseline }),
    },
    variantB: {
      id: "B",
      name: options.variantB?.name ?? "Variant B",
      transition: normalizeTransition({ ...(options.variantB?.transition ?? baseline) }),
    },
    winner: null,
    state: "idle",
    source: options.source ?? "playground",
    keyframes: options.keyframes ?? DEFAULT_KEYFRAMES,
  };
}

export function getVariant(experiment: Experiment, variant: VariantId): MotionVariant {
  return variant === "A" ? experiment.variantA : experiment.variantB;
}

function withVariant(
  experiment: Experiment,
  variant: VariantId,
  next: MotionVariant,
): Experiment {
  return variant === "A"
    ? { ...experiment, variantA: next }
    : { ...experiment, variantB: next };
}

export function setVariantTransition(
  experiment: Experiment,
  variant: VariantId,
  transition: TransitionConfig,
): Experiment {
  const current = getVariant(experiment, variant);
  return withVariant(experiment, variant, {
    ...current,
    transition: normalizeTransition(transition),
  });
}

export function setVariantName(
  experiment: Experiment,
  variant: VariantId,
  name: string,
): Experiment {
  return withVariant(experiment, variant, { ...getVariant(experiment, variant), name });
}

export function setKeyframes(experiment: Experiment, keyframes: MotionKeyframes): Experiment {
  return { ...experiment, keyframes };
}

export function setPlaybackState(experiment: Experiment, state: PlaybackState): Experiment {
  return experiment.state === state ? experiment : { ...experiment, state };
}

/** Pick a winner, or clear the pick by choosing the current winner again. */
export function chooseWinner(experiment: Experiment, variant: VariantId | null): Experiment {
  const winner = experiment.winner === variant ? null : variant;
  return { ...experiment, winner };
}

export function getWinnerVariant(experiment: Experiment): MotionVariant | null {
  return experiment.winner ? getVariant(experiment, experiment.winner) : null;
}

/** Swap the two sides, keeping the winner pointed at the same configuration. */
export function swapVariants(experiment: Experiment): Experiment {
  return {
    ...experiment,
    variantA: { ...experiment.variantB, id: "A", name: experiment.variantB.name },
    variantB: { ...experiment.variantA, id: "B", name: experiment.variantA.name },
    winner: experiment.winner === "A" ? "B" : experiment.winner === "B" ? "A" : null,
  };
}

/**
 * "Use B as baseline": the winner becomes A, and B becomes a copy of it that
 * is now free to be tuned further. This is the iterative loop — every round
 * starts from the best configuration found so far.
 */
export function promoteWinner(experiment: Experiment, variant?: VariantId): Experiment {
  const promoted = variant ?? experiment.winner;
  if (!promoted) return experiment;
  const source = getVariant(experiment, promoted);
  return {
    ...experiment,
    variantA: { id: "A", name: "Baseline", transition: { ...source.transition } },
    variantB: { id: "B", name: "Exploration", transition: { ...source.transition } },
    winner: null,
  };
}

export function resetExperiment(experiment: Experiment): Experiment {
  return {
    ...createExperiment({
      id: experiment.id,
      ...(experiment.label !== undefined ? { label: experiment.label } : {}),
      source: experiment.source,
      keyframes: experiment.keyframes,
    }),
  };
}

/** Whether A and B are actually configured differently. */
export function hasDivergence(experiment: Experiment): boolean {
  return (
    JSON.stringify(experiment.variantA.transition) !==
    JSON.stringify(experiment.variantB.transition)
  );
}

export type ExperimentListener = (experiment: Experiment) => void;

export interface ExperimentStore {
  get(): Experiment;
  set(next: Experiment | ((current: Experiment) => Experiment)): Experiment;
  subscribe(listener: ExperimentListener): () => void;
}

/**
 * A tiny observable box around one experiment. The React SDK subscribes to it,
 * the extension subscribes to it, and the playground subscribes to it — so the
 * comparison semantics live here rather than in any one UI.
 */
export function createExperimentStore(initial: Experiment): ExperimentStore {
  let current = initial;
  const listeners = new Set<ExperimentListener>();

  return {
    get: () => current,
    set(next) {
      const resolved = typeof next === "function" ? next(current) : next;
      if (resolved === current) return current;
      current = resolved;
      for (const listener of listeners) listener(current);
      return current;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

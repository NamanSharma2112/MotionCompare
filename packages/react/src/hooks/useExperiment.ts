"use client";

import { useCallback, useMemo } from "react";
import {
  chooseWinner,
  exportVariant,
  exportWinner,
  getVariant,
  promoteWinner,
  setVariantTransition,
  swapVariants,
  type ExportFormat,
  type TransitionConfig,
  type VariantId,
} from "@motionlab/core";
import { useMotionLab } from "../provider/context";

/**
 * The comparison workflow as React callbacks, over whichever experiment the
 * devtools currently has open. Each operation delegates to the core, so the
 * playground, the devtools and the extension cannot drift apart on what
 * "promote the winner" means.
 */
export function useExperimentActions() {
  const { experiment, updateExperiment } = useMotionLab();

  const setVariant = useCallback(
    (variant: VariantId, transition: TransitionConfig) =>
      updateExperiment((current) => setVariantTransition(current, variant, transition)),
    [updateExperiment],
  );

  const choose = useCallback(
    (variant: VariantId | null) => updateExperiment((current) => chooseWinner(current, variant)),
    [updateExperiment],
  );

  const swap = useCallback(
    () => updateExperiment((current) => swapVariants(current)),
    [updateExperiment],
  );

  const promote = useCallback(
    (variant?: VariantId) => updateExperiment((current) => promoteWinner(current, variant)),
    [updateExperiment],
  );

  return useMemo(
    () => ({
      experiment,
      setVariant,
      choose,
      swap,
      promote,
      variant: (id: VariantId) => (experiment ? getVariant(experiment, id) : null),
      exportAs: (id: VariantId, format: ExportFormat) =>
        experiment ? exportVariant(experiment, id, format) : null,
      exportWinnerAs: (format: ExportFormat = "motion") =>
        experiment ? exportWinner(experiment, format) : null,
    }),
    [experiment, setVariant, choose, swap, promote],
  );
}

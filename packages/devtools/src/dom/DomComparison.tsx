"use client";

import { useCallback } from "react";
import {
  transitionDuration,
  type Experiment,
  type VariantId,
} from "@motionlab/core";
import type { MotionLabAnimatorHandle } from "@motionlab/react";
import { ComparisonShell } from "../comparison/ComparisonShell";
import { DomVariantStage } from "./DomVariantStage";

export interface DomComparisonProps {
  experiment: Experiment;
  /** Called once per variant to produce that side's clone. */
  createNode(variant: VariantId): HTMLElement | null;
  onChange(next: Experiment | ((current: Experiment) => Experiment)): void;
  onClose(): void;
  /** A description of what was selected, e.g. `div.checkout-card`. */
  selectorLabel?: string;
}

/**
 * Generic DOM mode: an A/B experiment around an element on any page.
 *
 * Exactly the same shell, transport, DialKit controls, winner and export as
 * native React mode. Only the stage contents differ, which is what makes the
 * extension feel like the same product rather than a cut-down version of it.
 */
export function DomComparison({
  experiment,
  createNode,
  onChange,
  onClose,
  selectorLabel,
}: DomComparisonProps) {
  const createA = useCallback(() => createNode("A"), [createNode]);
  const createB = useCallback(() => createNode("B"), [createNode]);

  const renderStages = useCallback(
    ({
      onTrackReady,
    }: {
      playing: boolean;
      onTrackReady(variant: VariantId, handle: MotionLabAnimatorHandle | null): void;
    }) => (
      <>
        <DomVariantStage
          experiment={experiment}
          variant="A"
          createNode={createA}
          onTrackReady={onTrackReady}
          summary={`${experiment.variantA.transition.type} · ${Math.round(
            transitionDuration(experiment.variantA.transition),
          )}ms`}
        />
        <DomVariantStage
          experiment={experiment}
          variant="B"
          createNode={createB}
          onTrackReady={onTrackReady}
          summary={`${experiment.variantB.transition.type} · ${Math.round(
            transitionDuration(experiment.variantB.transition),
          )}ms`}
        />
      </>
    ),
    [experiment, createA, createB],
  );

  return (
    <ComparisonShell
      experiment={experiment}
      onChange={onChange}
      onClose={onClose}
      mode="dom"
      {...(selectorLabel
        ? { headerExtra: <span className="ml-mode">{selectorLabel}</span> }
        : {})}
      renderStages={renderStages}
    />
  );
}

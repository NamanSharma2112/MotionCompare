"use client";

import { useCallback } from "react";
import type { Experiment } from "@motionlab/core";
import type { MotionLabTargetDefinition } from "@motionlab/react";
import { ComparisonShell } from "./ComparisonShell";
import { VariantStage } from "./VariantStage";

export interface ReactComparisonProps {
  experiment: Experiment;
  target: MotionLabTargetDefinition;
  onChange(next: Experiment | ((current: Experiment) => Experiment)): void;
  onClose(): void;
}

/**
 * Native React mode: the developer's real component, rendered twice.
 *
 * `target.render` is invoked separately for each stage. That is the whole
 * point — one call per variant means two independent instances, each with its
 * own state, refs, effects and interactions. Calling it once and placing the
 * resulting element in both stages would share a single element description
 * and defeat the comparison for any component that holds state.
 */
export function ReactComparison({
  experiment,
  target,
  onChange,
  onClose,
}: ReactComparisonProps) {
  const renderStages = useCallback(
    ({
      playing,
      onTrackReady,
    }: {
      playing: boolean;
      onTrackReady: Parameters<
        NonNullable<React.ComponentProps<typeof ComparisonShell>["renderStages"]>
      >[0]["onTrackReady"];
    }) => (
      <>
        <VariantStage
          experiment={experiment}
          variant="A"
          playing={playing}
          render={(context) => target.render(context)}
          onTrackReady={onTrackReady}
          {...(target.stageWidth !== undefined ? { stageWidth: target.stageWidth } : {})}
        />
        <VariantStage
          experiment={experiment}
          variant="B"
          playing={playing}
          render={(context) => target.render(context)}
          onTrackReady={onTrackReady}
          {...(target.stageWidth !== undefined ? { stageWidth: target.stageWidth } : {})}
        />
      </>
    ),
    [experiment, target],
  );

  return (
    <ComparisonShell
      experiment={experiment}
      onChange={onChange}
      onClose={onClose}
      mode="react"
      renderStages={renderStages}
    />
  );
}

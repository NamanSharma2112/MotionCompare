"use client";

import { useCallback, useState, type ReactNode } from "react";
import { getVariant, transitionDuration, type Experiment, type VariantId } from "@motionlab/core";
import { variantColor } from "@motionlab/dialkit";
import {
  MotionLabAnimator,
  type MotionLabAnimatorHandle,
  type MotionLabRenderContext,
} from "@motionlab/react";
import { VariantErrorBoundary } from "./VariantErrorBoundary";

export interface VariantStageProps {
  experiment: Experiment;
  variant: VariantId;
  playing: boolean;
  /**
   * Renders this variant's content. Called once per stage with its own portal
   * container, so A and B are genuinely separate instances.
   */
  render(context: MotionLabRenderContext): ReactNode;
  /** Hands the stage's playback track up to the shared controller. */
  onTrackReady(variant: VariantId, handle: MotionLabAnimatorHandle | null): void;
  stageWidth?: number;
}

/**
 * One side of the comparison: the component, the animator driving it, and a
 * portal container of its own.
 */
export function VariantStage({
  experiment,
  variant,
  playing,
  render,
  onTrackReady,
  stageWidth,
}: VariantStageProps) {
  const color = variantColor(variant);
  const definition = getVariant(experiment, variant);
  const isWinner = experiment.winner === variant;

  // The portal container is state, not a ref, because `render` needs to
  // receive the real element — a ref would still be null on first render and
  // a Radix portal would quietly fall back to document.body, putting A's
  // dialog and B's dialog in the same place.
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  // React calls this with null when the animator unmounts, which is what
  // deregisters the track — no separate cleanup effect needed.
  const setHandle = useCallback(
    (handle: MotionLabAnimatorHandle | null) => onTrackReady(variant, handle),
    [onTrackReady, variant],
  );

  const duration = Math.round(transitionDuration(definition.transition));

  return (
    <div className="ml-stage">
      <div className="ml-stage-head">
        <span className="ml-stage-name" style={{ color }}>
          Variant {variant}
        </span>
        {isWinner ? (
          <span className="ml-stage-winner" style={{ background: color }}>
            Winner
          </span>
        ) : null}
        <span className="ml-stage-summary">
          {definition.transition.type === "spring"
            ? `spring · ${duration}ms`
            : `easing · ${duration}ms`}
        </span>
      </div>

      <div className="ml-stage-frame" style={stageWidth ? { minWidth: 0 } : undefined}>
        <MotionLabAnimator
          variant={variant}
          transition={definition.transition}
          keyframes={experiment.keyframes}
          handleRef={setHandle}
          className="ml-stage-mount"
        >
          <div style={stageWidth ? { width: stageWidth, maxWidth: "100%" } : undefined}>
            <VariantErrorBoundary variant={variant}>
              {render({ variant, portalContainer, playing })}
            </VariantErrorBoundary>
          </div>
        </MotionLabAnimator>

        {/*
          Each variant portals into its own container. Without this, two
          instances of the same modal would mount into one root and fight over
          focus traps, scroll locking and stacking order.
        */}
        <div ref={setPortalContainer} data-motionlab-portal={variant} />
      </div>
    </div>
  );
}

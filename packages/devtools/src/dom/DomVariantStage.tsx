"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  getVariant,
  type Experiment,
  type PlaybackTrack,
  type VariantId,
} from "@motionlab/core";
import { variantColor } from "@motionlab/dialkit";
import { createStyleDriver, type MotionLabAnimatorHandle } from "@motionlab/react";

export interface DomVariantStageProps {
  experiment: Experiment;
  variant: VariantId;
  /**
   * Produces this variant's content. Called once per stage so each side gets
   * its own clone — the DOM equivalent of calling `render()` twice.
   */
  createNode(): HTMLElement | null;
  onTrackReady(variant: VariantId, handle: MotionLabAnimatorHandle | null): void;
  summary?: string;
}

/**
 * One side of a DOM-mode comparison.
 *
 * Mounts a clone of the selected element, not the element itself. The live
 * page keeps its node, its position and its listeners; MotionLab animates a
 * copy inside its own stage. If cloning fails the stage says so and leaves the
 * page alone rather than trying something more invasive.
 */
export function DomVariantStage({
  experiment,
  variant,
  createNode,
  onTrackReady,
  summary,
}: DomVariantStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const animatedRef = useRef<HTMLDivElement | null>(null);
  const failedRef = useRef(false);
  const color = variantColor(variant);
  const definition = getVariant(experiment, variant);
  const transitionRef = useRef(definition.transition);
  transitionRef.current = definition.transition;

  const keyframes = experiment.keyframes;

  const handleError = useCallback((mount: HTMLElement) => {
    failedRef.current = true;
    const message = document.createElement("div");
    message.className = "ml-stage-error";
    message.setAttribute("role", "alert");
    const heading = document.createElement("strong");
    heading.textContent = "Unable to create preview";
    const detail = document.createElement("span");
    detail.className = "ml-stage-error-detail";
    detail.textContent =
      "This element could not be cloned into the MotionLab stage. The page has not been changed.";
    message.append(heading, detail);
    mount.replaceChildren(message);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const driver = createStyleDriver(keyframes);
    let node: HTMLElement | null = null;

    try {
      node = createNode();
    } catch {
      node = null;
    }

    if (!node) {
      handleError(mount);
      onTrackReady(variant, null);
      return () => {
        mount.replaceChildren();
      };
    }

    const animated = document.createElement("div");
    animated.className = "ml-stage-mount";
    animated.appendChild(node);
    mount.replaceChildren(animated);
    animatedRef.current = animated;
    driver.attach(animated);

    const track: PlaybackTrack = {
      variant,
      get transition() {
        return transitionRef.current;
      },
      onFrame: (progress) => driver.apply(progress),
    };

    onTrackReady(variant, { track, element: animated });

    return () => {
      driver.release();
      onTrackReady(variant, null);
      mount.replaceChildren();
      animatedRef.current = null;
    };
    // `createNode` is stable per selection; re-running on every render would
    // rebuild the clone and interrupt playback mid-comparison.
  }, [createNode, handleError, keyframes, onTrackReady, variant]);

  const isWinner = experiment.winner === variant;

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
        {summary ? <span className="ml-stage-summary">{summary}</span> : null}
      </div>
      <div className="ml-stage-frame">
        <div ref={mountRef} style={{ maxWidth: "100%" }} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from "react";
import {
  interpolateMotionValues,
  type MotionKeyframes,
  type PlaybackTrack,
  type TransitionConfig,
  type VariantId,
} from "@motionlab/core";
import { createStyleDriver, motionValuesToStyle } from "../style";

export interface MotionLabAnimatorHandle {
  /** The playback track this animator contributes to the shared clock. */
  track: PlaybackTrack;
  element: HTMLElement | null;
}

export interface MotionLabAnimatorProps {
  variant: VariantId;
  transition: TransitionConfig;
  keyframes: MotionKeyframes;
  children: ReactNode;
  handleRef?: Ref<MotionLabAnimatorHandle>;
  className?: string;
}

/**
 * Wraps one variant's component and applies the animated styles to it.
 *
 * It does not own a clock. It exposes a `PlaybackTrack` that the shared
 * controller drives, which is what keeps A and B starting on the same frame
 * no matter which surface is hosting them.
 */
export function MotionLabAnimator({
  variant,
  transition,
  keyframes,
  children,
  handleRef,
  className,
}: MotionLabAnimatorProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const driver = useMemo(() => createStyleDriver(keyframes), [keyframes]);
  const transitionRef = useRef(transition);
  transitionRef.current = transition;

  useEffect(() => {
    driver.attach(elementRef.current);
    return () => driver.release();
  }, [driver]);

  const track = useMemo<PlaybackTrack>(
    () => ({
      variant,
      // Read through the ref so retuning a dial does not rebuild the track and
      // drop it out of the controller mid-comparison.
      get transition() {
        return transitionRef.current;
      },
      onFrame: (progress) => driver.apply(progress),
    }),
    [variant, driver],
  );

  useImperativeHandle(handleRef, () => ({ track, element: elementRef.current }), [track]);

  // The resting pose is the `from` keyframe, so a newly opened comparison
  // shows the pre-animation state rather than a finished one.
  const initialStyle = motionValuesToStyle(interpolateMotionValues(keyframes, 0));

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: initialStyle.opacity,
        transform: initialStyle.transform,
        filter: initialStyle.filter,
      }}
    >
      {children}
    </div>
  );
}

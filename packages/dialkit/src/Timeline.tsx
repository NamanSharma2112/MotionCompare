"use client";

import { useMemo } from "react";
import {
  isSpring,
  sampleTransition,
  springOvershoot,
  transitionDuration,
  type TransitionConfig,
} from "@motionlab/core";

export interface TimelineProps {
  transition: TransitionConfig;
  color: string;
  /** Draw a second curve behind this one, for a side-by-side read. */
  compareWith?: TransitionConfig;
  compareColor?: string;
  height?: number;
  label?: string;
}

const WIDTH = 240;

function buildPath(transition: TransitionConfig, height: number, maxProgress: number): string {
  const points = sampleTransition(transition, 96);
  const duration = transitionDuration(transition) || 1;
  const headroom = height * 0.12;
  const usable = height - headroom * 2;

  return points
    .map(({ time, progress }, index) => {
      const x = (time / duration) * WIDTH;
      const y = height - headroom - (progress / maxProgress) * usable;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/**
 * The physics made visible.
 *
 * Numbers alone do not tell you that damping 14 overshoots and damping 30 does
 * not — the curve does, before you ever press Compare. When a second
 * transition is supplied both curves share a vertical scale so the overshoot
 * of one is readable against the other.
 */
export function Timeline({
  transition,
  color,
  compareWith,
  compareColor,
  height = 64,
  label,
}: TimelineProps) {
  const { path, comparePath, maxProgress, duration } = useMemo(() => {
    const peak = Math.max(
      1,
      isSpring(transition) ? springOvershoot(transition) : 1,
      compareWith && isSpring(compareWith) ? springOvershoot(compareWith) : 1,
    );
    const scale = peak * 1.04;
    return {
      path: buildPath(transition, height, scale),
      comparePath: compareWith ? buildPath(compareWith, height, scale) : null,
      maxProgress: scale,
      duration: transitionDuration(transition),
    };
  }, [transition, compareWith, height]);

  const headroom = height * 0.12;
  const restY = height - headroom - (1 / maxProgress) * (height - headroom * 2);

  return (
    <div>
      <svg
        className="dk-timeline"
        viewBox={`0 0 ${WIDTH} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label ?? `Motion curve, settles in ${Math.round(duration)} milliseconds`}
      >
        <line className="dk-timeline-grid" x1={0} y1={height - headroom} x2={WIDTH} y2={height - headroom} />
        <line className="dk-timeline-target" x1={0} y1={restY} x2={WIDTH} y2={restY} />
        {comparePath ? (
          <path
            className="dk-timeline-curve"
            d={comparePath}
            stroke={compareColor ?? "#555"}
            strokeDasharray="4 4"
            opacity={0.65}
          />
        ) : null}
        <path className="dk-timeline-curve" d={path} stroke={color} />
      </svg>
      <div className="dk-timeline-meta">
        <span className="dk-hint">0ms</span>
        <span className="dk-hint">
          {isSpring(transition) ? "settles" : "ends"} ~{Math.round(duration)}ms
        </span>
      </div>
    </div>
  );
}

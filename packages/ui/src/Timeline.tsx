"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  isSpring,
  sampleTransition,
  springOvershoot,
  transitionDuration,
  type TransitionConfig,
} from "@motionlab/core";

export interface TimelineLane {
  name: string;
  start: number;
  duration: number;
}

export interface MiniTimelineProps {
  lanes: TimelineLane[];
  total: number;
  playing?: boolean;
  /** Frame subscription from the playback engine; the playhead never goes through React state. */
  subscribeFrame?(listener: (elapsed: number, total: number) => void): () => void;
}

const NAME_COLUMN = 66;

/**
 * The tiny timeline: one lane per animated property, scaled to the longest.
 * The playhead is moved with a transform from the engine's frame callback,
 * so following playback costs no React renders.
 */
export function MiniTimeline({ lanes, total, playing, subscribeFrame }: MiniTimelineProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const width = useRef(0);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      width.current = Math.max(0, node.clientWidth - NAME_COLUMN);
    });
    observer.observe(node);
    width.current = Math.max(0, node.clientWidth - NAME_COLUMN);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!subscribeFrame) return;
    return subscribeFrame((elapsed, frameTotal) => {
      const head = headRef.current;
      if (!head) return;
      const ratio = frameTotal > 0 ? Math.min(1, elapsed / frameTotal) : 0;
      head.style.transform = `translateX(${ratio * width.current}px)`;
    });
  }, [subscribeFrame]);

  const safeTotal = Math.max(1, total);

  return (
    <div ref={rootRef} className="mlui-tl" data-playing={playing ? "" : undefined}>
      <div className="mlui-tl-ruler" style={{ marginLeft: NAME_COLUMN }}>
        <span>0ms</span>
        <span>{Math.round(total)}ms</span>
      </div>
      <div className="mlui-tl-lanes">
        {lanes.map((lane) => (
          <div key={lane.name} className="mlui-tl-lane">
            <span className="mlui-tl-name mlui-truncate">{lane.name}</span>
            <div className="mlui-tl-bar-wrap">
              <div
                className="mlui-tl-bar"
                style={{
                  left: `${(lane.start / safeTotal) * 100}%`,
                  width: `${Math.max(1.5, (lane.duration / safeTotal) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
        <div ref={headRef} className="mlui-tl-head" aria-hidden="true" />
      </div>
    </div>
  );
}

export interface CurvePlotProps {
  a: TransitionConfig;
  b: TransitionConfig;
  height?: number;
  label?: string;
}

const WIDTH = 320;

function path(transition: TransitionConfig, duration: number, height: number, peak: number, pad: number) {
  const usable = height - pad * 2;
  return sampleTransition(transition, 120)
    .map(({ time, progress }, index) => {
      const x = (time / duration) * WIDTH;
      const y = height - pad - (progress / peak) * usable;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Both curves on one shared time and progress scale: A dashed, B solid.
 * Shared scales are the point — B's overshoot is only readable against A's.
 */
export function CurvePlot({ a, b, height = 120, label }: CurvePlotProps) {
  const { pathA, pathB, restY } = useMemo(() => {
    const duration = Math.max(transitionDuration(a), transitionDuration(b), 1);
    const peak =
      Math.max(1, isSpring(a) ? springOvershoot(a) : 1, isSpring(b) ? springOvershoot(b) : 1) * 1.04;
    const pad = 10;
    return {
      pathA: path(a, duration, height, peak, pad),
      pathB: path(b, duration, height, peak, pad),
      restY: height - pad - (1 / peak) * (height - pad * 2),
    };
  }, [a, b, height]);

  return (
    <svg
      className="mlui-curve"
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ?? "Motion curves for A and B"}
    >
      <line className="mlui-curve-grid" x1={0} y1={height - 10} x2={WIDTH} y2={height - 10} />
      <line className="mlui-curve-rest" x1={0} y1={restY} x2={WIDTH} y2={restY} />
      <path className="mlui-curve-a" d={pathA} vectorEffect="non-scaling-stroke" />
      <path className="mlui-curve-b" d={pathB} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

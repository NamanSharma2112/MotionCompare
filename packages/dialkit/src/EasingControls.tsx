"use client";

import {
  EASING_NAMES,
  TRANSITION_LIMITS,
  toBezier,
  type BezierDefinition,
  type EasingTransition,
} from "@motionlab/core";
import { Dial } from "./Dial";

export interface EasingControlsProps {
  transition: EasingTransition;
  accent: string;
  onChange(transition: EasingTransition): void;
}

/** Duration plus a curve: either a named easing or four bezier handles. */
export function EasingControls({ transition, accent, onChange }: EasingControlsProps) {
  const set = (patch: Partial<EasingTransition>) => onChange({ ...transition, ...patch });
  const isCustom = Array.isArray(transition.ease);
  const bezier = toBezier(transition.ease);

  function setHandle(index: number, value: number) {
    const next = [...bezier] as BezierDefinition;
    next[index] = value;
    set({ ease: next });
  }

  return (
    <div className="dk-stack">
      <Dial
        label="duration"
        value={transition.duration}
        min={TRANSITION_LIMITS.duration.min}
        max={TRANSITION_LIMITS.duration.max}
        step={TRANSITION_LIMITS.duration.step}
        unit="ms"
        accent={accent}
        onChange={(duration) => set({ duration })}
      />

      <div className="dk-stack" style={{ gap: 4 }}>
        <span className="dk-label">curve</span>
        <div className="dk-chips">
          {EASING_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              className="dk-button"
              style={{ ["--dk-accent" as string]: accent }}
              data-selected={!isCustom && transition.ease === name}
              onClick={() => set({ ease: name })}
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            className="dk-button"
            style={{ ["--dk-accent" as string]: accent }}
            data-selected={isCustom}
            onClick={() => set({ ease: bezier })}
          >
            custom
          </button>
        </div>
      </div>

      {isCustom ? (
        <div className="dk-stack" style={{ gap: 4 }}>
          {(["x1", "y1", "x2", "y2"] as const).map((name, index) => (
            <Dial
              key={name}
              label={name}
              value={bezier[index] ?? 0}
              // y may leave 0–1: that is how a bezier overshoots, and tuning
              // bounce without it would mean dropping to a spring.
              min={name.startsWith("x") ? 0 : -1}
              max={name.startsWith("x") ? 1 : 2}
              step={0.01}
              precision={2}
              accent={accent}
              onChange={(value) => setHandle(index, value)}
            />
          ))}
        </div>
      ) : null}

      <Dial
        label="delay"
        value={transition.delay ?? 0}
        min={TRANSITION_LIMITS.delay.min}
        max={TRANSITION_LIMITS.delay.max}
        step={TRANSITION_LIMITS.delay.step}
        unit="ms"
        accent={accent}
        onChange={(delay) => set({ delay })}
      />
    </div>
  );
}

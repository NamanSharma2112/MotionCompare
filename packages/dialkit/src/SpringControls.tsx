"use client";

import {
  TRANSITION_LIMITS,
  estimateSpringDuration,
  springOvershoot,
  type SpringTransition,
} from "@motionlab/core";
import { Dial } from "./Dial";

export interface SpringControlsProps {
  transition: SpringTransition;
  accent: string;
  onChange(transition: SpringTransition): void;
}

/** Stiffness, damping and mass — the three numbers that define the feel. */
export function SpringControls({ transition, accent, onChange }: SpringControlsProps) {
  const set = (patch: Partial<SpringTransition>) => onChange({ ...transition, ...patch });
  const overshoot = springOvershoot(transition);
  const settle = Math.round(estimateSpringDuration(transition));

  return (
    <div className="dk-stack">
      <Dial
        label="stiffness"
        value={transition.stiffness}
        min={TRANSITION_LIMITS.stiffness.min}
        max={TRANSITION_LIMITS.stiffness.max}
        step={TRANSITION_LIMITS.stiffness.step}
        accent={accent}
        onChange={(stiffness) => set({ stiffness })}
      />
      <Dial
        label="damping"
        value={transition.damping}
        min={TRANSITION_LIMITS.damping.min}
        max={TRANSITION_LIMITS.damping.max}
        step={TRANSITION_LIMITS.damping.step}
        accent={accent}
        onChange={(damping) => set({ damping })}
      />
      <Dial
        label="mass"
        value={transition.mass}
        min={TRANSITION_LIMITS.mass.min}
        max={TRANSITION_LIMITS.mass.max}
        step={TRANSITION_LIMITS.mass.step}
        precision={2}
        accent={accent}
        onChange={(mass) => set({ mass })}
      />
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
      <div className="dk-spread">
        <span className="dk-hint">settles {settle}ms</span>
        <span className="dk-hint">
          {overshoot > 1.005 ? `overshoots ${Math.round((overshoot - 1) * 100)}%` : "no overshoot"}
        </span>
      </div>
    </div>
  );
}

"use client";

import {
  PRESETS,
  convertTransition,
  isSpring,
  matchPreset,
  presetTransition,
  type TransitionConfig,
  type VariantId,
} from "@motionlab/core";
import { EasingControls } from "./EasingControls";
import { SpringControls } from "./SpringControls";
import { Timeline } from "./Timeline";
import { variantColor } from "./tokens";

export interface TransitionControlsProps {
  variant: VariantId;
  transition: TransitionConfig;
  /** The other side, drawn behind this one in the timeline for comparison. */
  compareWith?: TransitionConfig;
  onChange(transition: TransitionConfig): void;
}

/**
 * One variant's full control column: type switch, presets, the dials for the
 * active type, and the curve they produce.
 *
 * Spring and easing are offered per variant rather than per experiment, so
 * "A spring against B easing" is a comparison MotionLab can actually make —
 * which is often the real question ("do we even need a spring here?").
 */
export function TransitionControls({
  variant,
  transition,
  compareWith,
  onChange,
}: TransitionControlsProps) {
  const accent = variantColor(variant);
  const activePreset = matchPreset(transition);

  return (
    <div className="dk-stack" style={{ gap: 12 }}>
      <div className="dk-spread">
        <span className="dk-label" style={{ color: accent }}>
          {variant}
        </span>
        <div className="dk-segment" style={{ ["--dk-accent" as string]: accent }}>
          {(["spring", "easing"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className="dk-button"
              data-selected={transition.type === type}
              onClick={() => onChange(convertTransition(transition, type))}
            >
              {type === "spring" ? "Spring" : "Easing"}
            </button>
          ))}
        </div>
      </div>

      <div className="dk-stack" style={{ gap: 4 }}>
        <span className="dk-label">presets</span>
        <div className="dk-chips">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="dk-button"
              style={{ ["--dk-accent" as string]: accent }}
              data-selected={activePreset?.id === preset.id}
              title={preset.description}
              onClick={() => {
                const next = presetTransition(preset.id, transition.type);
                if (next) onChange(next);
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {isSpring(transition) ? (
        <SpringControls
          transition={transition}
          accent={accent}
          onChange={onChange}
        />
      ) : (
        <EasingControls transition={transition} accent={accent} onChange={onChange} />
      )}

      <Timeline
        transition={transition}
        color={accent}
        {...(compareWith ? { compareWith } : {})}
        compareColor={variantColor(variant === "A" ? "B" : "A")}
        label={`Variant ${variant} motion curve`}
      />
    </div>
  );
}

"use client";

import { useId } from "react";
import { clamp } from "@motionlab/core";

export interface DialProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Decimal places shown in the number field. */
  precision?: number;
  unit?: string;
  disabled?: boolean;
  accent?: string;
  onChange(value: number): void;
}

/**
 * The DialKit primitive: a labelled numeric parameter with a drag track and a
 * typed field side by side.
 *
 * Both affordances matter for tuning motion — the track is for sweeping a
 * value until it feels right, the field is for entering the number you already
 * know. Typed input is committed on change but clamped, so a half-typed "4"
 * on the way to "420" does not snap the dial somewhere surprising.
 */
export function Dial({
  label,
  value,
  min,
  max,
  step = 1,
  precision = step < 1 ? 2 : 0,
  unit,
  disabled,
  accent,
  onChange,
}: DialProps) {
  const id = useId();
  const style = accent ? ({ "--dk-accent": accent } as React.CSSProperties) : undefined;

  function commit(raw: string) {
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(clamp(parsed, min, max));
  }

  return (
    <div className="dk-dial" style={style}>
      <div className="dk-dial-head">
        <label className="dk-dial-name" htmlFor={`${id}-field`}>
          {label}
        </label>
        <div className="dk-row" style={{ gap: 4 }}>
          <input
            id={`${id}-field`}
            className="dk-dial-input"
            type="number"
            inputMode="decimal"
            value={Number(value.toFixed(precision))}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(event) => commit(event.target.value)}
          />
          {unit ? <span className="dk-hint">{unit}</span> : null}
        </div>
      </div>
      <input
        className="dk-dial-track"
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

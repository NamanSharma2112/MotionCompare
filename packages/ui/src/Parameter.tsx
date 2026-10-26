"use client";

import { NumberField } from "./NumberField";
import { Slider } from "./Slider";
import { decimalsOf, formatNumber } from "./number";

export interface ParameterProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  precision?: number;
  unit?: string;
  onChange(value: number): void;
  onCommit?(value: number): void;
}

/**
 * One tunable parameter: name and editable value on a line, slider beneath.
 * This is the control MotionLab is used through most, so it is the one with
 * every input path — drag the slider, drag the number, type, or step.
 */
export function Parameter({
  label,
  value,
  min,
  max,
  step = 1,
  precision = decimalsOf(step),
  unit,
  onChange,
  onCommit,
}: ParameterProps) {
  return (
    <div className="mlui-param">
      <div className="mlui-param-head">
        <span className="mlui-param-label">{label}</span>
        <NumberField
          label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          precision={precision}
          {...(unit ? { unit } : {})}
          onChange={onChange}
          {...(onCommit ? { onCommit } : {})}
        />
      </div>
      <Slider
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        valueText={`${formatNumber(value, precision)}${unit ?? ""}`}
        onChange={onChange}
        {...(onCommit ? { onCommit } : {})}
      />
    </div>
  );
}

"use client";

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Icon } from "./icons";
import { NumberField } from "./NumberField";

export interface PropertyRowProps {
  label: string;
  from: number;
  to: number;
  min: number;
  max: number;
  step?: number;
  precision?: number;
  unit?: string;
  onChange(edge: "from" | "to", value: number): void;
  onCommit?(): void;
}

/** One animated property and its two ends, both directly editable. */
export function PropertyRow({
  label,
  from,
  to,
  min,
  max,
  step = 1,
  precision,
  unit,
  onChange,
  onCommit,
}: PropertyRowProps) {
  const shared = {
    min,
    max,
    step,
    ...(precision !== undefined ? { precision } : {}),
    ...(unit ? { unit } : {}),
    ...(onCommit ? { onCommit: () => onCommit() } : {}),
  };
  return (
    <div className="mlui-prop">
      <span className="mlui-row-label">{label}</span>
      <NumberField label={`${label} from`} value={from} onChange={(value) => onChange("from", value)} {...shared} />
      <span className="mlui-prop-arrow">
        <Icon name="arrow" size={11} />
      </span>
      <NumberField label={`${label} to`} value={to} onChange={(value) => onChange("to", value)} {...shared} />
    </div>
  );
}

export interface InteractionRowProps {
  title: string;
  duration: string;
  meta: string;
  current?: boolean;
  onSelect(): void;
  /** The primary per-row action, always visible: replay this interaction. */
  primaryAction?: ReactNode;
  /** Secondary actions, revealed on hover or focus. */
  secondaryActions?: ReactNode;
}

/**
 * An interaction in the list: name and duration on one line, the properties
 * it moves beneath. The row selects; its own controls stop propagation so
 * replaying a row does not also have to select it.
 */
export function InteractionRow({
  title,
  duration,
  meta,
  current,
  onSelect,
  primaryAction,
  secondaryActions,
}: InteractionRowProps) {
  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={current ? "true" : undefined}
      className="mlui-ix"
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <span className="mlui-ix-title mlui-truncate">{title}</span>
      <span className="mlui-ix-duration">{duration}</span>
      <span className="mlui-ix-meta mlui-truncate">{meta}</span>
      <span className="mlui-ix-actions" onClick={(event) => event.stopPropagation()}>
        {secondaryActions ? <span className="mlui-ix-reveal">{secondaryActions}</span> : null}
        {primaryAction}
      </span>
    </div>
  );
}

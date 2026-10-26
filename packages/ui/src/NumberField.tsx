"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clampNumber, decimalsOf, formatNumber, keyStep } from "./number";

export interface NumberFieldProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  precision?: number;
  unit?: string;
  label: string;
  /** Every intermediate value while dragging or stepping. */
  onChange(value: number): void;
  /** Once the gesture ends — the moment to replay the animation. */
  onCommit?(value: number): void;
}

const DRAG_THRESHOLD = 3;
/**
 * Pixels per step while scrubbing. Fixed per step rather than per range, so
 * a wide range (stiffness 1–1000) stays as precise to drag as a narrow one;
 * Shift moves ten times faster and the slider covers big jumps.
 */
const PIXELS_PER_STEP = 2;

/**
 * A number you can manipulate directly.
 *
 * Drag it horizontally to scrub (Shift for coarse, Alt for fine), click it to
 * type, or focus it and use the arrow keys. Every route updates the value on
 * every change — there is no Apply — and reports a single commit when the
 * gesture ends, which is when MotionLab replays the motion.
 */
export function NumberField({
  value,
  min,
  max,
  step = 1,
  precision = Math.min(3, decimalsOf(step)),
  unit,
  label,
  onChange,
  onCommit,
}: NumberFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [scrubbing, setScrubbing] = useState(false);
  const drag = useRef<{ x: number; value: number; moved: boolean; last: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function set(next: number) {
    // Round to the displayed precision rather than the step, so Alt-fine
    // adjustments survive while the readout never shows float residue.
    const resolved = Number(clampNumber(next, min, max).toFixed(precision));
    if (resolved !== valueRef.current) onChange(resolved);
    return resolved;
  }

  function beginEdit(initial?: string) {
    setDraft(initial ?? formatNumber(value, precision).replace(/^(-?)\./, "$10."));
    setEditing(true);
  }

  function commitDraft() {
    const parsed = Number.parseFloat(draft);
    setEditing(false);
    if (Number.isFinite(parsed)) onCommit?.(set(parsed));
    // Hand focus back to the field so the keyboard path continues.
    requestAnimationFrame(() => fieldRef.current?.focus());
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, value, moved: false, last: value };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!state.moved) {
      state.moved = true;
      setScrubbing(true);
    }
    const factor = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
    state.last = set(state.value + (dx / PIXELS_PER_STEP) * step * factor);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!state) return;
    if (state.moved) {
      setScrubbing(false);
      onCommit?.(state.last);
    } else {
      beginEdit();
    }
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const delta = keyStep(step, event);
    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        event.preventDefault();
        set(valueRef.current + delta);
        return;
      case "ArrowDown":
      case "ArrowLeft":
        event.preventDefault();
        set(valueRef.current - delta);
        return;
      case "Enter":
        event.preventDefault();
        beginEdit();
        return;
      default:
        if (/^[\d.-]$/.test(event.key) && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          beginEdit(event.key);
        }
    }
  }

  function onKeyUp(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (/^Arrow/.test(event.key)) onCommit?.(valueRef.current);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="mlui-number-input"
        aria-label={label}
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraft();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setEditing(false);
            requestAnimationFrame(() => fieldRef.current?.focus());
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const current = Number.parseFloat(draft);
            const base = Number.isFinite(current) ? current : value;
            const next = set(base + (event.key === "ArrowUp" ? 1 : -1) * keyStep(step, event));
            setDraft(formatNumber(next, precision).replace(/^(-?)\./, "$10."));
          }
        }}
      />
    );
  }

  return (
    <div
      ref={fieldRef}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${formatNumber(value, precision)}${unit ?? ""}`}
      className="mlui-number"
      data-scrubbing={scrubbing ? "" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      {formatNumber(value, precision)}
      {unit ? <span className="mlui-number-unit">{unit}</span> : null}
    </div>
  );
}

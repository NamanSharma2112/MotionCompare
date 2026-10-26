"use client";

import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clampNumber, formatNumber, keyStep, snapToStep } from "./number";

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  valueText?: string;
  onChange(value: number): void;
  onCommit?(value: number): void;
}

/**
 * The MotionLab slider: a 2px track inside a 20px hit area.
 *
 * Pressing anywhere on it jumps the value there and keeps dragging, so a
 * single gesture both places and fine-tunes. The fill moves with `transform`
 * so dragging never triggers layout, and the value is reported every move
 * with no throttling — the animation is the feedback, so the number cannot
 * lag behind the hand.
 */
export function Slider({ value, min, max, step = 1, label, valueText, onChange, onCommit }: SliderProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const ratio = max === min ? 0 : clampNumber((value - min) / (max - min), 0, 1);

  function valueAt(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    const position = clampNumber((clientX - rect.left) / rect.width, 0, 1);
    return snapToStep(min + position * (max - min), step, min);
  }

  function set(next: number) {
    const resolved = snapToStep(clampNumber(next, min, max), step, min);
    if (resolved !== valueRef.current) onChange(resolved);
    return resolved;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    set(valueAt(event.clientX));
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    set(valueAt(event.clientX));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onCommit?.(valueRef.current);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const delta = keyStep(step, event);
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = valueRef.current + delta;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = valueRef.current - delta;
        break;
      case "PageUp":
        next = valueRef.current + step * 10;
        break;
      case "PageDown":
        next = valueRef.current - step * 10;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    set(next);
  }

  function onKeyUp(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (/^(Arrow|Page|Home|End)/.test(event.key)) onCommit?.(valueRef.current);
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText ?? formatNumber(value, 3)}
      className="mlui-slider"
      data-dragging={dragging ? "" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <div className="mlui-slider-track">
        <div className="mlui-slider-fill" style={{ width: "100%", transform: `scaleX(${ratio})` }} />
      </div>
      <div className="mlui-slider-thumb" style={{ left: `${ratio * 100}%` }} />
    </div>
  );
}

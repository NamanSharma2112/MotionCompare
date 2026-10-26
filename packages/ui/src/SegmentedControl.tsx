"use client";

import { useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when `label` is not plain text. */
  name?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: Array<SegmentedOption<T>>;
  label: string;
  block?: boolean;
  onChange(value: T): void;
}

/**
 * A radio group drawn as segments. Arrow keys move and select, matching how
 * native radio groups behave, with roving focus so Tab enters once.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  label,
  block,
  onChange,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!direction) return;
    event.preventDefault();
    const next = (index + direction + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }

  return (
    <div className="mlui-seg" role="radiogroup" aria-label={label} data-block={block ? "" : undefined}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.name}
            tabIndex={checked ? 0 : -1}
            className="mlui-seg-item"
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

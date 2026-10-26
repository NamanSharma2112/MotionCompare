"use client";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

export interface ChipGroupProps<T extends string> {
  options: Array<ChipOption<T>>;
  /** The chip currently in effect, if any. */
  value: T | undefined;
  label: string;
  onSelect(value: T): void;
}

/**
 * Small toggle chips for presets. Pills are earned here: a preset is a
 * compact, mutually exclusive filter on the parameter space, which is the
 * thing pills mean.
 */
export function ChipGroup<T extends string>({ options, value, label, onSelect }: ChipGroupProps<T>) {
  return (
    <div className="mlui-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="mlui-chip"
          aria-pressed={option.value === value}
          title={option.title}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

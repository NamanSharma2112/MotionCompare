"use client";

export interface SwitchProps {
  checked: boolean;
  label: string;
  onChange(checked: boolean): void;
}

export function Switch({ checked, label, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="mlui-switch"
      onClick={() => onChange(!checked)}
    />
  );
}

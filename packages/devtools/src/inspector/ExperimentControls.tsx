"use client";

import { useState } from "react";
import {
  PRESETS,
  TRANSITION_LIMITS,
  convertTransition,
  matchPreset,
  presetTransition,
  toBezier,
  type BezierDefinition,
  type EasingTransition,
  type MotionKeyframes,
  type MotionValues,
  type SpringTransition,
  type TransitionConfig,
} from "@motionlab/core";
import {
  ChipGroup,
  Icon,
  InspectorRow,
  NumberField,
  Parameter,
  PropertyRow,
  SegmentedControl,
} from "@motionlab/ui";
import { EASING_CHOICES, VALUE_FIELDS, isNamed } from "./format";

export interface TransitionEditorProps {
  transition: TransitionConfig;
  onChange(next: TransitionConfig): void;
  /** Replays the motion: called when a gesture ends or a preset is picked. */
  onCommit(): void;
}

/**
 * Contextual controls: a spring shows stiffness, damping and mass; an easing
 * shows curve, duration and delay. Nothing irrelevant is ever on screen, and
 * the rarely-touched settings wait behind Advanced.
 */
export function TransitionEditor({ transition, onChange, onCommit }: TransitionEditorProps) {
  const preset = matchPreset(transition);

  return (
    <div className="mlui-stack">
      <InspectorRow label="Type">
        <SegmentedControl
          label="Transition type"
          value={transition.type}
          options={[
            { value: "spring", label: "Spring" },
            { value: "easing", label: "Easing" },
          ]}
          onChange={(type) => {
            onChange(convertTransition(transition, type));
            onCommit();
          }}
        />
      </InspectorRow>

      <div style={{ margin: "6px 0 10px" }}>
        <ChipGroup
          label="Presets"
          value={preset?.id}
          options={PRESETS.map((entry) => ({ value: entry.id, label: entry.name, title: entry.description }))}
          onSelect={(id) => {
            const next = presetTransition(id, transition.type);
            if (next) {
              onChange(next);
              // Picking a preset is the cheapest comparison there is: replay at
              // once so the difference is felt, not imagined.
              onCommit();
            }
          }}
        />
      </div>

      {transition.type === "spring" ? (
        <SpringFields transition={transition} onChange={onChange} onCommit={onCommit} />
      ) : (
        <EasingFields transition={transition} onChange={onChange} onCommit={onCommit} />
      )}
    </div>
  );
}

function SpringFields({
  transition,
  onChange,
  onCommit,
}: {
  transition: SpringTransition;
  onChange(next: TransitionConfig): void;
  onCommit(): void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const set = (patch: Partial<SpringTransition>) => onChange({ ...transition, ...patch });
  const limits = TRANSITION_LIMITS;

  return (
    <>
      <Parameter
        label="Stiffness"
        value={transition.stiffness}
        min={limits.stiffness.min}
        max={limits.stiffness.max}
        step={1}
        onChange={(stiffness) => set({ stiffness })}
        onCommit={onCommit}
      />
      <Parameter
        label="Damping"
        value={transition.damping}
        min={limits.damping.min}
        max={limits.damping.max}
        step={1}
        onChange={(damping) => set({ damping })}
        onCommit={onCommit}
      />
      <Parameter
        label="Mass"
        value={transition.mass}
        min={limits.mass.min}
        max={limits.mass.max}
        step={0.05}
        precision={2}
        onChange={(mass) => set({ mass })}
        onCommit={onCommit}
      />
      <AdvancedToggle open={advanced} onToggle={() => setAdvanced((value) => !value)} />
      {advanced ? (
        <div style={{ paddingBottom: 2 }}>
          <Parameter
            label="Velocity"
            value={transition.velocity ?? 0}
            min={limits.velocity.min}
            max={limits.velocity.max}
            step={0.5}
            precision={1}
            onChange={(velocity) => set({ velocity })}
            onCommit={onCommit}
          />
          <Parameter
            label="Delay"
            value={transition.delay ?? 0}
            min={limits.delay.min}
            max={limits.delay.max}
            step={10}
            unit="ms"
            onChange={(delay) => set({ delay })}
            onCommit={onCommit}
          />
        </div>
      ) : null}
    </>
  );
}

function EasingFields({
  transition,
  onChange,
  onCommit,
}: {
  transition: EasingTransition;
  onChange(next: TransitionConfig): void;
  onCommit(): void;
}) {
  const set = (patch: Partial<EasingTransition>) => onChange({ ...transition, ...patch });
  const custom = !isNamed(transition.ease);
  const bezier = toBezier(transition.ease);

  return (
    <>
      <div className="mlui-param">
        <div className="mlui-param-head">
          <span className="mlui-param-label">Curve</span>
        </div>
        <ChipGroup
          label="Curve"
          value={custom ? "custom" : String(transition.ease)}
          options={EASING_CHOICES}
          onSelect={(value) => {
            set({ ease: value === "custom" ? bezier : (value as EasingTransition["ease"]) });
            onCommit();
          }}
        />
        {custom ? (
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginTop: 6 }}
            aria-label="Cubic bezier handles"
            role="group"
          >
            {(["x1", "y1", "x2", "y2"] as const).map((name, index) => (
              <div key={name} className="mlui-hstack" style={{ gap: 0, justifyContent: "space-between" }}>
                <span className="mlui-meta mlui-faint" style={{ paddingLeft: 2 }}>
                  {name}
                </span>
                <NumberField
                  label={`Bezier ${name}`}
                  value={bezier[index] ?? 0}
                  min={name.startsWith("x") ? 0 : -1}
                  max={name.startsWith("x") ? 1 : 2}
                  step={0.01}
                  precision={2}
                  onChange={(value) => {
                    const next = [...bezier] as BezierDefinition;
                    next[index] = value;
                    set({ ease: next });
                  }}
                  onCommit={onCommit}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ height: 6 }} />
      <Parameter
        label="Duration"
        value={transition.duration}
        min={TRANSITION_LIMITS.duration.min}
        max={1200}
        step={10}
        unit="ms"
        onChange={(duration) => set({ duration })}
        onCommit={onCommit}
      />
      <Parameter
        label="Delay"
        value={transition.delay ?? 0}
        min={TRANSITION_LIMITS.delay.min}
        max={1000}
        step={10}
        unit="ms"
        onChange={(delay) => set({ delay })}
        onCommit={onCommit}
      />
    </>
  );
}

function AdvancedToggle({ open, onToggle }: { open: boolean; onToggle(): void }) {
  return (
    <button
      type="button"
      className="mlui-add"
      aria-expanded={open}
      onClick={onToggle}
      style={{ marginTop: 6, height: 24, fontSize: 11 }}
    >
      <span className="mlui-disclosure" data-open={open ? "" : undefined}>
        <Icon name="expand" size={12} />
      </span>
      Advanced
    </button>
  );
}

export interface ValuesEditorProps {
  keyframes: MotionKeyframes;
  onChange(next: MotionKeyframes): void;
  onCommit(): void;
}

/**
 * The two ends of the motion, for only the properties that move. Opacity
 * shows From → To; a slide shows the offset; nothing else appears.
 */
const VALUE_ORDER = ["opacity", "x", "y", "scale", "rotate", "blur"] as const;

export function ValuesEditor({ keyframes, onChange, onCommit }: ValuesEditorProps) {
  // Keys present on either end, not only the ones currently differing: a
  // row must not vanish while someone drags "from" past "to".
  const keys = VALUE_ORDER.filter((key) => key in keyframes.from || key in keyframes.to);
  if (keys.length === 0) return null;

  return (
    <div className="mlui-stack">
      {keys.map((key) => {
        const field = VALUE_FIELDS[key];
        const neutral = key === "opacity" || key === "scale" ? 1 : 0;
        return (
          <PropertyRow
            key={key}
            label={field.label}
            from={keyframes.from[key] ?? neutral}
            to={keyframes.to[key] ?? neutral}
            min={field.min}
            max={field.max}
            step={field.step}
            precision={field.precision}
            {...(field.unit ? { unit: field.unit } : {})}
            onChange={(edge, value) => {
              const next: MotionKeyframes = {
                from: { ...keyframes.from },
                to: { ...keyframes.to },
              };
              (next[edge] as MotionValues)[key] = value;
              onChange(next);
            }}
            onCommit={onCommit}
          />
        );
      })}
    </div>
  );
}

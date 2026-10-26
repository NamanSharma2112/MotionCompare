"use client";

import type { ReactNode } from "react";
import {
  exportVariant,
  getVariant,
  type Experiment,
  type ExportFormat,
  type MotionInteraction,
  type VariantId,
} from "@motionlab/core";
import {
  Button,
  CurvePlot,
  EmptyState,
  Icon,
  IconButton,
  InspectorRow,
  InteractionRow,
  MiniTimeline,
  Popover,
  Section,
  SegmentedControl,
  StatusDot,
  Switch,
  type TimelineLane,
} from "@motionlab/ui";
import { TransitionEditor, ValuesEditor } from "./ExperimentControls";
import {
  cssPropertiesFor,
  durationLabel,
  transitionSummary,
  typeLabel,
} from "./format";
import type { InspectedComponent } from "./types";

/* ----------------------------------------------------------------- empty -- */

export function NothingSelected({
  canPick,
  onPick,
  components,
  onSelectComponent,
  componentsLabel,
}: {
  canPick: boolean;
  onPick?(): void;
  components?: Array<{ id: string; label: string; detail?: string }>;
  onSelectComponent?(id: string): void;
  componentsLabel: string;
}) {
  const hasComponents = Boolean(components && components.length > 0);
  return (
    <>
      {canPick || !hasComponents ? (
        <EmptyState
          title="Select something to inspect"
          body={
            canPick
              ? "Pick a component on the page and interact with it to inspect its motion."
              : "Register a component with <MotionLabTarget> and it will appear here."
          }
          action={
            canPick ? (
              <Button variant="primary" icon="inspect" onClick={onPick}>
                Inspect component
              </Button>
            ) : null
          }
        />
      ) : null}
      {hasComponents ? (
        <Section label={componentsLabel}>
          <div className="mlui-ix-list">
            {components!.map((component) => (
              <InteractionRow
                key={component.id}
                title={component.label}
                duration=""
                meta={component.detail ?? component.id}
                onSelect={() => onSelectComponent?.(component.id)}
                primaryAction={<Icon name="arrow" size={13} style={{ color: "var(--ml-faint)", marginRight: 6 }} />}
              />
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}

export function Picking({ onCancel }: { onCancel(): void }) {
  return (
    <EmptyState
      title="Click a component on the page"
      body="Hover to preview the outline. Press ↑ to select the parent instead."
      action={
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      }
    />
  );
}

/* ------------------------------------------------------------- component -- */

export function ComponentSection({
  component,
  onPick,
  onSelectPath,
}: {
  component: InspectedComponent;
  onPick?(): void;
  onSelectPath?(index: number): void;
}) {
  const crumbs = component.breadcrumb;
  const name = crumbs.at(-1) ?? component.name;
  return (
    <Section
      label="Component"
      aside={
        onPick ? <IconButton icon="inspect" label="Inspect another component" size="sm" onClick={onPick} /> : null
      }
    >
      <div className="mlui-crumbs" aria-label="Component path">
        {crumbs.slice(0, -1).map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="mlui-hstack" style={{ gap: 5 }}>
            <span className="mlui-crumb" data-ancestor="">
              {crumb}
            </span>
            <span className="mlui-crumb-sep">/</span>
          </span>
        ))}
        {component.path && component.path.length > 1 && onSelectPath ? (
          <Popover
            trigger={
              <button type="button" className="mlui-crumb" data-current="" style={{ cursor: "pointer" }} title="Show DOM path">
                {name}
              </button>
            }
          >
            <div className="mlui-menu-label">DOM path</div>
            {component.path.map((entry, index) => {
              const isSelf = index === component.path!.length - 1;
              return (
                <button
                  key={`${entry.detail}-${index}`}
                  type="button"
                  className="mlui-menu-item"
                  style={{ width: "100%", border: 0, background: isSelf ? "var(--ml-selected)" : "transparent", cursor: "pointer" }}
                  onClick={() => onSelectPath(index)}
                >
                  <span className="mlui-grow mlui-truncate" style={{ textAlign: "left" }}>
                    {entry.name}
                  </span>
                  <span className="mlui-mono mlui-faint mlui-truncate" style={{ maxWidth: 140 }}>
                    {entry.detail}
                  </span>
                </button>
              );
            })}
          </Popover>
        ) : (
          <span className="mlui-crumb" data-current="">
            {name}
          </span>
        )}
      </div>
      <div className="mlui-hstack" style={{ marginTop: 4 }}>
        <span className="mlui-mono mlui-faint mlui-truncate mlui-grow">{component.detail}</span>
        <span className="mlui-hstack mlui-meta" style={{ gap: 6 }}>
          {component.mode === "dom" ? "DOM" : "React"}
          <StatusDot tone="success" />
        </span>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------- interactions -- */

export function InteractionsSection({
  interactions,
  currentId,
  onSelect,
  onReplay,
  onRemove,
  onCapture,
}: {
  interactions: MotionInteraction[];
  currentId: string | null;
  onSelect(id: string): void;
  onReplay(id: string): void;
  onRemove?(id: string): void;
  onCapture?(): void;
}) {
  if (interactions.length === 0) {
    return (
      <Section label="Interactions">
        <div style={{ padding: "6px 0 2px" }}>
          <div className="mlui-name" style={{ fontSize: 12 }}>
            No motion captured yet.
          </div>
          <p className="mlui-note" style={{ margin: "4px 0 12px" }}>
            Use the component while MotionLab records what changes.
          </p>
          {onCapture ? (
            <Button variant="primary" onClick={onCapture}>
              <StatusDot tone="record" />
              Capture interaction
            </Button>
          ) : null}
        </div>
      </Section>
    );
  }

  return (
    <Section label="Interactions">
      <div className="mlui-ix-list">
        {interactions.map((interaction) => (
          <InteractionRow
            key={interaction.id}
            title={interaction.label}
            duration={durationLabel(interaction.experiment.variantA.transition)}
            meta={(interaction.properties.length ? interaction.properties : cssPropertiesFor(interaction.experiment.keyframes)).join(" · ")}
            current={interaction.id === currentId}
            onSelect={() => onSelect(interaction.id)}
            secondaryActions={
              onRemove ? (
                <IconButton icon="remove" label="Remove interaction" size="sm" onClick={() => onRemove(interaction.id)} />
              ) : null
            }
            primaryAction={
              <IconButton icon="play" label="Replay as captured" size="sm" onClick={() => onReplay(interaction.id)} />
            }
          />
        ))}
      </div>
      {onCapture ? (
        <button type="button" className="mlui-add" onClick={onCapture}>
          <Icon name="add" size={13} />
          Capture interaction
        </button>
      ) : null}
    </Section>
  );
}

/* ------------------------------------------------------------ experiment -- */

export function ExperimentSection({
  experiment,
  editing,
  onEditingChange,
  onExperimentChange,
  onCommit,
  onFocus,
  onTimeline,
  subscribeFrame,
  playing,
}: {
  experiment: Experiment;
  editing: VariantId;
  onEditingChange(variant: VariantId): void;
  onExperimentChange(next: Experiment): void;
  onCommit(): void;
  onFocus(): void;
  onTimeline(): void;
  subscribeFrame(listener: (elapsed: number, total: number) => void): () => void;
  playing: boolean;
}) {
  const variant = getVariant(experiment, editing);
  const lanes = laneFor(experiment, editing);

  return (
    <>
      <Section
        label="Experiment"
        aside={<IconButton icon="focus" label={`Focus on ${editing}`} size="sm" onClick={onFocus} />}
      >
        <div style={{ marginBottom: 10 }}>
          <SegmentedControl
            block
            label="Variant to tune"
            value={editing}
            options={[
              { value: "A", label: <VariantLabel id="A" name={experiment.variantA.name ?? "Current"} />, name: "A, current" },
              { value: "B", label: <VariantLabel id="B" name={experiment.variantB.name ?? "Experiment"} />, name: "B, experiment" },
            ]}
            onChange={onEditingChange}
          />
        </div>
        <TransitionEditor
          transition={variant.transition}
          onChange={(transition) =>
            onExperimentChange(
              editing === "A"
                ? { ...experiment, variantA: { ...experiment.variantA, transition } }
                : { ...experiment, variantB: { ...experiment.variantB, transition } },
            )
          }
          onCommit={onCommit}
        />
      </Section>

      <Section label="Values">
        <ValuesEditor
          keyframes={experiment.keyframes}
          onChange={(keyframes) => onExperimentChange({ ...experiment, keyframes })}
          onCommit={onCommit}
        />
      </Section>

      <Section
        label="Timeline"
        aside={<IconButton icon="timeline" label="Expand timeline" size="sm" onClick={onTimeline} />}
      >
        <MiniTimeline
          lanes={lanes.lanes}
          total={lanes.total}
          playing={playing}
          subscribeFrame={subscribeFrame}
        />
      </Section>
    </>
  );
}

function VariantLabel({ id, name }: { id: VariantId; name: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
      <span style={{ fontWeight: 600 }}>{id}</span>
      <span>{name}</span>
    </span>
  );
}

function laneFor(experiment: Experiment, editing: VariantId): { lanes: TimelineLane[]; total: number } {
  const transition = getVariant(experiment, editing).transition;
  const delay = transition.delay ?? 0;
  const duration = Number.parseFloat(durationLabel(transition));
  const properties = cssPropertiesFor(experiment.keyframes);
  return {
    lanes: (properties.length ? properties : ["transform"]).map((name) => ({ name, start: delay, duration })),
    total: delay + duration,
  };
}

/* ------------------------------------------------------------- recording -- */

export function Recording({ signal, onCancel }: { signal: string; onCancel(): void }) {
  return (
    <div style={{ padding: "20px 16px 16px" }}>
      <div className="mlui-hstack" style={{ gap: 8 }}>
        <StatusDot tone="record" pulse />
        <span className="mlui-name">Recording interaction</span>
      </div>
      <p className="mlui-note" style={{ margin: "8px 0 0" }}>
        Use the component normally. MotionLab stops on its own once the motion settles.
      </p>
      <div className="mlui-hstack" style={{ marginTop: 18 }}>
        <span className="mlui-meta mlui-grow" aria-live="polite">
          {signal}
        </span>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function Captured({
  interaction,
  note,
  onReplay,
  onContinue,
}: {
  interaction: MotionInteraction;
  note?: string;
  onReplay(): void;
  onContinue(): void;
}) {
  return (
    <div style={{ padding: "20px 16px 16px" }}>
      <div className="mlui-hstack" style={{ gap: 7, color: "var(--ml-success)" }}>
        <Icon name="check" size={14} />
        <span className="mlui-meta" style={{ color: "inherit", fontWeight: 500 }}>
          Captured
        </span>
      </div>
      <div className="mlui-name" style={{ marginTop: 8 }}>
        {interaction.label}
      </div>
      <div className="mlui-meta" style={{ marginTop: 2 }}>
        {durationLabel(interaction.experiment.variantA.transition)}
        <span className="mlui-faint"> · </span>
        {interaction.properties.join(" · ") || cssPropertiesFor(interaction.experiment.keyframes).join(" · ")}
      </div>
      {note ? (
        <p className="mlui-note" style={{ margin: "10px 0 0" }}>
          {note}
        </p>
      ) : null}
      <div className="mlui-hstack" style={{ marginTop: 16 }}>
        <Button variant="secondary" icon="play" onClick={onReplay}>
          Replay
        </Button>
        <span className="mlui-grow" />
        <Button variant="ghost" onClick={onContinue}>
          Tune
          <Icon name="arrow" size={13} />
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- compare -- */

export function Compare({
  interaction,
  sync,
  onSync,
  loop,
  onLoop,
  speed,
  onSpeed,
  onReplay,
  playing,
}: {
  interaction: MotionInteraction;
  sync: boolean;
  onSync(value: boolean): void;
  loop: boolean;
  onLoop(value: boolean): void;
  speed: number;
  onSpeed(value: number): void;
  onReplay(): void;
  playing: boolean;
}) {
  const { variantA, variantB, winner } = interaction.experiment;
  return (
    <>
      <Section label="Compare">
        <div className="mlui-name">{interaction.label}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          {[variantA, variantB].map((variant) => (
            <div key={variant.id} className="mlui-stack" style={{ gap: 2 }}>
              <span className="mlui-hstack" style={{ gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{variant.id}</span>
                {winner === variant.id ? <Icon name="check" size={12} style={{ color: "var(--ml-success)" }} /> : null}
              </span>
              <span className="mlui-meta">{variant.name ?? (variant.id === "A" ? "Current" : "Experiment")}</span>
              <span style={{ marginTop: 8 }}>{typeLabel(variant.transition)}</span>
              <span className="mlui-meta mlui-num">{transitionSummary(variant.transition)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <Button variant="primary" icon={playing ? "replay" : "play"} onClick={onReplay}>
            Replay
          </Button>
        </div>
      </Section>
      <Section>
        <InspectorRow label="Sync">
          <span className="mlui-hstack" style={{ gap: 8 }}>
            <span className="mlui-meta">{sync ? "Side by side" : "One after another"}</span>
            <Switch label="Play A and B at the same time" checked={sync} onChange={onSync} />
          </span>
        </InspectorRow>
        <InspectorRow label="Loop">
          <Switch label="Loop" checked={loop} onChange={onLoop} />
        </InspectorRow>
        <InspectorRow label="Speed">
          <SegmentedControl
            label="Playback speed"
            value={String(speed)}
            options={[
              { value: "1", label: "1×" },
              { value: "0.5", label: "½×", name: "Half speed" },
              { value: "0.25", label: "¼×", name: "Quarter speed" },
            ]}
            onChange={(value) => onSpeed(Number(value))}
          />
        </InspectorRow>
      </Section>
    </>
  );
}

/* ----------------------------------------------------------------- focus -- */

export function Focus({
  experiment,
  variant,
  onExperimentChange,
  onCommit,
  onReplay,
}: {
  experiment: Experiment;
  variant: VariantId;
  onExperimentChange(next: Experiment): void;
  onCommit(): void;
  onReplay(): void;
}) {
  const definition = getVariant(experiment, variant);
  return (
    <Section>
      <div className="mlui-name" style={{ marginBottom: 12 }}>
        {variant === "A" ? "Current" : "Experiment"} {variant}
      </div>
      <TransitionEditor
        transition={definition.transition}
        onChange={(transition) =>
          onExperimentChange(
            variant === "A"
              ? { ...experiment, variantA: { ...experiment.variantA, transition } }
              : { ...experiment, variantB: { ...experiment.variantB, transition } },
          )
        }
        onCommit={onCommit}
      />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <Button variant="secondary" icon="play" onClick={onReplay}>
          Replay
        </Button>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- export -- */

const FORMATS: Array<{ value: ExportFormat; label: string }> = [
  { value: "motion", label: "Motion" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
];

export function Export({
  experiment,
  variant,
  format,
  onFormat,
  onCopy,
}: {
  experiment: Experiment;
  variant: VariantId;
  format: ExportFormat;
  onFormat(format: ExportFormat): void;
  onCopy(code: string): void;
}) {
  const result = exportVariant(experiment, variant, format);
  return (
    <Section>
      <div className="mlui-hstack" style={{ marginBottom: 10 }}>
        <span className="mlui-grow">
          <span style={{ fontWeight: 600 }}>{variant}</span>{" "}
          <span className="mlui-meta">{experiment.winner === variant ? "winner" : getVariant(experiment, variant).name}</span>
        </span>
        <SegmentedControl label="Export format" value={format} options={FORMATS} onChange={onFormat} />
      </div>
      <pre className="mlui-code">
        <code>{result.code}</code>
      </pre>
      {result.caveat ? <p className="mlui-note" style={{ margin: "10px 0 0" }}>{result.caveat}</p> : null}
      <div style={{ marginTop: 12 }}>
        <Button variant="primary" block icon="copy" onClick={() => onCopy(result.code)}>
          Copy {FORMATS.find((entry) => entry.value === format)?.label}
        </Button>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- timeline -- */

export function TimelineDetail({ experiment }: { experiment: Experiment }) {
  return (
    <Section>
      <CurvePlot a={experiment.variantA.transition} b={experiment.variantB.transition} height={150} />
      <div className="mlui-stack" style={{ marginTop: 12, gap: 6 }}>
        {[experiment.variantA, experiment.variantB].map((variant) => (
          <div key={variant.id} className="mlui-hstack">
            <svg width="18" height="6" aria-hidden="true">
              <line
                x1="0"
                y1="3"
                x2="18"
                y2="3"
                stroke={variant.id === "A" ? "var(--ml-muted)" : "var(--ml-text)"}
                strokeWidth={variant.id === "A" ? 1.5 : 1.75}
                strokeDasharray={variant.id === "A" ? "3 3" : undefined}
              />
            </svg>
            <span style={{ fontWeight: 600 }}>{variant.id}</span>
            <span className="mlui-meta mlui-grow">{variant.name}</span>
            <span className="mlui-meta mlui-num">{transitionSummary(variant.transition)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function ViewBody({ children, viewKey }: { children: ReactNode; viewKey: string }) {
  return (
    <div key={viewKey} className="mlui-view">
      {children}
    </div>
  );
}

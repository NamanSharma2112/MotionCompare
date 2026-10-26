import { exportCSS, exportMotion } from "../exporters/index";
import { parseTransition } from "../serialization/index";
import type {
  Experiment,
  MotionKeyframes,
  MotionValues,
  TransitionConfig,
  VariantId,
} from "../types/index";
import { isFiniteNumber } from "../utils/index";

/**
 * A decision: the developer compared A and B on a component and picked one.
 *
 * This is what MotionLab hands to a coding agent (Claude Code, Codex). It
 * carries everything the agent needs to apply the change without guessing —
 * which component, which motion, the exact values, ready-made code — and
 * what was rejected, so the agent can say what changed.
 */
export interface MotionDecision {
  id: string;
  /** "pending" until an agent has applied it to the code. */
  status: "pending" | "applied";
  component: {
    id: string;
    label: string;
    /** Source file, when the target declared one. Agents search by id/label otherwise. */
    file?: string;
    /** CSS selector, for decisions made in the browser extension on a live page. */
    selector?: string;
    /** Page the decision was made on. */
    url?: string;
  };
  /** "Enter", "Closed → Open", … */
  interaction: string;
  chosen: VariantId;
  transition: TransitionConfig;
  keyframes: MotionKeyframes;
  /** The option that lost, for context. */
  rejected: { variant: VariantId; transition: TransitionConfig };
  code: { motion: string; css: string };
  decidedAt: string;
}

export interface DecisionFile {
  version: 1;
  decisions: MotionDecision[];
}

export interface CreateDecisionOptions {
  experiment: Experiment;
  component: MotionDecision["component"];
  interaction: string;
  /** Defaults to the experiment's winner, then B. */
  chosen?: VariantId;
  now?: Date;
}

export function createDecision({
  experiment,
  component,
  interaction,
  chosen,
  now = new Date(),
}: CreateDecisionOptions): MotionDecision {
  const winner: VariantId = chosen ?? experiment.winner ?? "B";
  const loser: VariantId = winner === "A" ? "B" : "A";
  const transition = (winner === "A" ? experiment.variantA : experiment.variantB).transition;
  const rejected = (loser === "A" ? experiment.variantA : experiment.variantB).transition;

  return {
    id: `${component.id}::${interaction}`,
    status: "pending",
    component,
    interaction,
    chosen: winner,
    transition,
    keyframes: experiment.keyframes,
    rejected: { variant: loser, transition: rejected },
    code: {
      motion: exportMotion(transition).code,
      css: exportCSS(transition, { from: experiment.keyframes.from, to: experiment.keyframes.to }).code,
    },
    decidedAt: now.toISOString(),
  };
}

function describeValues(values: MotionValues): string {
  const parts: string[] = [];
  if (values.opacity !== undefined) parts.push(`opacity ${values.opacity}`);
  if (values.x !== undefined) parts.push(`x ${values.x}px`);
  if (values.y !== undefined) parts.push(`y ${values.y}px`);
  if (values.scale !== undefined) parts.push(`scale ${values.scale}`);
  if (values.rotate !== undefined) parts.push(`rotate ${values.rotate}deg`);
  if (values.blur !== undefined) parts.push(`blur ${values.blur}px`);
  return parts.join(", ") || "unchanged";
}

/**
 * The decision as an instruction an agent can act on directly — used when
 * MotionLab cannot write to the project and the developer pastes instead.
 */
export function decisionPrompt(decision: MotionDecision): string {
  const where = decision.component.file
    ? `\`${decision.component.file}\``
    : decision.component.selector
      ? `the element matching \`${decision.component.selector}\`${decision.component.url ? ` on ${decision.component.url}` : ""}`
      : `the component registered as \`${decision.component.id}\``;

  return [
    `Apply this MotionLab motion decision.`,
    ``,
    `Component: ${decision.component.label} — ${where}`,
    `Motion: ${decision.interaction} (${describeValues(decision.keyframes.from)} → ${describeValues(decision.keyframes.to)})`,
    `I compared A and B and chose ${decision.chosen}.`,
    ``,
    `Use this transition (Motion / Framer Motion):`,
    "```tsx",
    decision.code.motion,
    "```",
    ``,
    `If the component animates with CSS instead:`,
    "```css",
    decision.code.css,
    "```",
    ``,
    `Replace the component's existing transition for this motion with the values above. Keep everything else as it is. If the component has no animation yet, add one that goes from the start values to the end values listed under Motion.`,
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseValues(value: unknown): MotionValues {
  const result: MotionValues = {};
  if (!isRecord(value)) return result;
  for (const key of ["opacity", "x", "y", "scale", "rotate", "blur"] as const) {
    if (isFiniteNumber(value[key])) result[key] = value[key];
  }
  return result;
}

function shortString(value: unknown, max = 300): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : undefined;
}

/**
 * Validate a decision arriving at the dev server. Everything is checked field
 * by field and rebuilt, so what reaches the file is exactly a decision and
 * nothing else — the endpoint writes into the developer's repository.
 */
export function parseDecision(value: unknown): MotionDecision | undefined {
  if (!isRecord(value) || !isRecord(value.component)) return undefined;
  const id = shortString(value.component.id, 120);
  const label = shortString(value.component.label, 120);
  const interaction = shortString(value.interaction, 120);
  const transition = parseTransition(value.transition);
  const rejected = isRecord(value.rejected) ? parseTransition(value.rejected.transition) : undefined;
  if (!id || !label || !interaction || !transition) return undefined;
  if (value.chosen !== "A" && value.chosen !== "B") return undefined;
  const keyframes = isRecord(value.keyframes)
    ? { from: parseValues(value.keyframes.from), to: parseValues(value.keyframes.to) }
    : { from: {}, to: {} };

  const file = shortString(value.component.file);
  const selector = shortString(value.component.selector);
  const url = shortString(value.component.url);
  const decision = createDecision({
    experiment: {
      id,
      variantA: { id: "A", transition: value.chosen === "A" ? transition : (rejected ?? transition) },
      variantB: { id: "B", transition: value.chosen === "B" ? transition : (rejected ?? transition) },
      winner: value.chosen,
      state: "idle",
      source: "react",
      keyframes,
    },
    component: {
      id,
      label,
      // A file path is only ever a hint for the agent; keep it relative.
      ...(file && !file.startsWith("/") && !file.includes("..") ? { file } : {}),
      ...(selector ? { selector } : {}),
      ...(url ? { url } : {}),
    },
    interaction,
    chosen: value.chosen,
  });
  return {
    ...decision,
    status: value.status === "applied" ? "applied" : "pending",
  };
}

/** Add or replace a decision; the latest choice for a component's motion wins. */
export function upsertDecision(file: DecisionFile, decision: MotionDecision): DecisionFile {
  const rest = file.decisions.filter((entry) => entry.id !== decision.id);
  return { version: 1, decisions: [...rest, decision] };
}

export function parseDecisionFile(raw: string | null | undefined): DecisionFile {
  if (!raw) return { version: 1, decisions: [] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.decisions)) return { version: 1, decisions: [] };
    const decisions = parsed.decisions
      .map((entry) => parseDecision(entry))
      .filter((entry): entry is MotionDecision => Boolean(entry));
    return { version: 1, decisions };
  } catch {
    return { version: 1, decisions: [] };
  }
}

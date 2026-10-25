import {
  formatBezier,
  isSpring,
  sampleTransition,
  toBezier,
  transitionDuration,
} from "../transitions/index";
import type {
  Easing,
  Experiment,
  MotionValues,
  TransitionConfig,
  VariantId,
} from "../types/index";
import { round } from "../utils/index";

export type ExportFormat = "motion" | "json" | "css";

export interface ExportResult {
  format: ExportFormat;
  language: "tsx" | "json" | "css";
  code: string;
  /** Set when the format cannot represent the transition exactly. */
  caveat?: string;
}

function formatNumber(value: number): string {
  return String(round(value, 4));
}

function formatEase(ease: Easing): string {
  if (Array.isArray(ease)) return `[${ease.map((n) => formatNumber(n)).join(", ")}]`;
  return JSON.stringify(ease);
}

/**
 * The Motion / Framer Motion `transition` prop — the thing a developer
 * actually pastes back into their component.
 */
export function exportMotion(transition: TransitionConfig, indent = ""): ExportResult {
  const pad = `${indent}  `;
  const lines: string[] = [];

  if (isSpring(transition)) {
    lines.push(`${pad}type: "spring",`);
    lines.push(`${pad}stiffness: ${formatNumber(transition.stiffness)},`);
    lines.push(`${pad}damping: ${formatNumber(transition.damping)},`);
    lines.push(`${pad}mass: ${formatNumber(transition.mass)},`);
    if (transition.velocity) lines.push(`${pad}velocity: ${formatNumber(transition.velocity)},`);
    if (transition.restDelta) lines.push(`${pad}restDelta: ${formatNumber(transition.restDelta)},`);
  } else {
    // Motion takes seconds, the MotionLab dials are in milliseconds.
    lines.push(`${pad}duration: ${formatNumber(transition.duration / 1000)},`);
    lines.push(`${pad}ease: ${formatEase(transition.ease)},`);
  }

  if (transition.delay) lines.push(`${pad}delay: ${formatNumber(transition.delay / 1000)},`);

  return {
    format: "motion",
    language: "tsx",
    code: `transition={{\n${lines.join("\n")}\n${indent}}}`,
  };
}

export function exportJSON(value: TransitionConfig | Experiment): ExportResult {
  return { format: "json", language: "json", code: JSON.stringify(value, null, 2) };
}

const CSS_PROPERTY_FOR_VALUE: Record<keyof MotionValues, string> = {
  opacity: "opacity",
  x: "transform",
  y: "transform",
  scale: "transform",
  rotate: "transform",
  blur: "filter",
};

function animatedCssProperties(
  from: MotionValues | undefined,
  to: MotionValues | undefined,
): string[] {
  const keys = new Set<keyof MotionValues>();
  for (const source of [from, to]) {
    if (!source) continue;
    for (const key of Object.keys(source) as Array<keyof MotionValues>) {
      if (source[key] !== undefined) keys.add(key);
    }
  }
  const properties = new Set<string>();
  for (const key of keys) properties.add(CSS_PROPERTY_FOR_VALUE[key]);
  return properties.size > 0 ? [...properties] : ["opacity", "transform"];
}

/**
 * CSS export.
 *
 * For an easing transition this is exact. For a spring it is not, and the
 * export says so rather than pretending otherwise: what comes out is a
 * `linear()` timing function sampled from the real simulation, which tracks
 * the physics closely but is a sampled approximation of it, not the physics.
 */
export function exportCSS(
  transition: TransitionConfig,
  options: { from?: MotionValues; to?: MotionValues; selector?: string } = {},
): ExportResult {
  const properties = animatedCssProperties(options.from, options.to);
  const duration = Math.round(transitionDuration(transition));
  const delay = transition.delay ? ` ${Math.round(transition.delay)}ms` : "";

  if (!isSpring(transition)) {
    const timing = formatBezier(transition.ease);
    const declarations = properties
      .map((property) => `${property} ${duration}ms ${timing}${delay}`)
      .join(`,\n    `);
    const [x1, y1, x2, y2] = toBezier(transition.ease);
    const overshoots = y1 > 1 || y2 > 1 || y1 < 0 || y2 < 0;
    return {
      format: "css",
      language: "css",
      code: `${options.selector ?? ".your-element"} {\n  transition:\n    ${declarations};\n}`,
      ...(overshoots
        ? {
            caveat:
              `This bezier leaves the 0–1 range (${x1}, ${y1}, ${x2}, ${y2}), so it overshoots. ` +
              `Browsers support that for transforms and opacity, but a clamped property will flatten it.`,
          }
        : {}),
    };
  }

  // linear() samples: one point per ~16ms of the simulation, capped so the
  // declaration stays readable.
  const sampleCount = Math.max(12, Math.min(80, Math.round(duration / 16)));
  const samples = sampleTransition(transition, sampleCount)
    .map(({ progress }) => `${round(progress * 100, 2)}%`)
    .join(", ");

  const declarations = properties
    .map((property) => `${property} ${duration}ms var(--motionlab-spring)${delay}`)
    .join(`,\n    `);

  return {
    format: "css",
    language: "css",
    code: [
      `/* Sampled from a spring (stiffness ${transition.stiffness}, damping ${transition.damping}, mass ${transition.mass}). */`,
      `/* CSS has no spring primitive — this traces the curve, it does not run the physics. */`,
      `${options.selector ?? ".your-element"} {`,
      `  --motionlab-spring: linear(${samples});`,
      `  transition:`,
      `    ${declarations};`,
      `}`,
    ].join("\n"),
    caveat:
      "CSS cannot express spring physics. This is a sampled approximation with a fixed duration — " +
      "it will not respond to interruption or velocity the way a real spring does. Use the Motion " +
      "export if you want the actual spring.",
  };
}

/** Export one variant of an experiment in the requested format. */
export function exportVariant(
  experiment: Experiment,
  variant: VariantId,
  format: ExportFormat,
): ExportResult {
  const transition =
    variant === "A" ? experiment.variantA.transition : experiment.variantB.transition;

  switch (format) {
    case "motion":
      return exportMotion(transition);
    case "json":
      return exportJSON(transition);
    case "css":
      return exportCSS(transition, {
        ...(experiment.keyframes.from !== undefined ? { from: experiment.keyframes.from } : {}),
        ...(experiment.keyframes.to !== undefined ? { to: experiment.keyframes.to } : {}),
        selector: experiment.label ? `.${slug(experiment.label)}` : ".your-element",
      });
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Export the chosen winner. Returns null while no winner has been picked. */
export function exportWinner(
  experiment: Experiment,
  format: ExportFormat = "motion",
): ExportResult | null {
  if (!experiment.winner) return null;
  return exportVariant(experiment, experiment.winner, format);
}

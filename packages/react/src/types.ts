import type { ReactNode } from "react";
import type {
  Experiment,
  MotionValues,
  TransitionConfig,
  VariantId,
} from "@motionlab/core";

/**
 * Handed to a target's `render` function so a component can cooperate with the
 * comparison when it needs to — chiefly to place a portal.
 */
export interface MotionLabRenderContext {
  variant: VariantId;
  /**
   * The element this variant occupies. Pass it to Radix's `portal container`,
   * Headless UI's `Portal`, or your own modal root so A and B do not render
   * into the same container and fight over focus, scroll lock or stacking.
   */
  portalContainer: HTMLElement | null;
  /** True while the comparison is playing. */
  playing: boolean;
}

export type MotionLabRender = (context: MotionLabRenderContext) => ReactNode;

/** A component MotionLab knows how to test. */
export interface MotionLabTargetDefinition {
  id: string;
  label: string;
  render: MotionLabRender;
  from: MotionValues;
  to: MotionValues;
  /** Starting transition for both variants. Defaults to the Smooth preset's spring. */
  transition?: TransitionConfig;
  /** An explicit portal container, for advanced setups that need a fixed one. */
  portalContainer?: HTMLElement | null;
  /** Width of each variant stage in pixels, when the component needs room. */
  stageWidth?: number;
}

export interface MotionLabContextValue {
  /** False in production unless the developer explicitly activated MotionLab. */
  enabled: boolean;
  targets: MotionLabTargetDefinition[];
  registerTarget(definition: MotionLabTargetDefinition): void;
  unregisterTarget(id: string): void;
  getTarget(id: string): MotionLabTargetDefinition | undefined;

  /** Which target the devtools currently has open, if any. */
  openTargetId: string | null;
  openTarget(id: string): void;
  closeTarget(): void;

  /** The live experiment for the open target. */
  experiment: Experiment | null;
  updateExperiment(next: Experiment | ((current: Experiment) => Experiment)): void;
  setVariant(variant: VariantId, transition: TransitionConfig): void;
}

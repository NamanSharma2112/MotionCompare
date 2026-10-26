import type { ReactNode } from "react";
import type {
  Experiment,
  MotionDecision,
  MotionInteraction,
  PlaybackTrack,
  VariantId,
} from "@motionlab/core";
import type { ThemePreference } from "@motionlab/ui";
import type { StageSlotSpec } from "../stage/StageLayer";

/** What the panel says about the thing being inspected. */
export interface InspectedComponent {
  /** Changes whenever a different component is selected. */
  key: string;
  name: string;
  /** "Checkout / Payment / Dropdown" — ancestors first, the component last. */
  breadcrumb: string[];
  /** `button.checkout-trigger`, or the target id in React mode. */
  detail: string;
  mode: "dom" | "react";
  /** Ancestors on demand (DOM mode), nearest last, for re-targeting. */
  path?: Array<{ name: string; detail: string }>;
}

export interface CaptureHandlers {
  onSignal(text: string): void;
  onCaptured(interaction: MotionInteraction, note?: string): void;
}

export interface InspectorStageProps {
  visible: boolean;
  experiment: Experiment;
  slots: StageSlotSpec[];
  showTags: boolean;
  avoidRect(): DOMRect | null;
  onTrackReady(variant: VariantId, track: PlaybackTrack | null): void;
}

export interface InspectorSettings {
  theme: ThemePreference;
  dock: "float" | "right";
  /** Floating position, measured from the top-right corner. */
  position: { top: number; right: number };
}

export const DEFAULT_SETTINGS: InspectorSettings = {
  theme: "system",
  dock: "float",
  position: { top: 16, right: 16 },
};

/**
 * Everything an environment provides to the shared inspector. The extension
 * implements it over the DOM; the React SDK over registered targets. The
 * panel itself does not know which one it is talking to.
 */
export interface InspectorHost {
  mode: "dom" | "react";
  component: InspectedComponent | null;

  /** Components that can be opened by name (React targets, native mode). */
  components?: Array<{ id: string; label: string; detail?: string }>;
  onSelectComponent?(id: string): void;

  /** DOM picking. Absent in React mode, where targets are named instead. */
  picking?: boolean;
  onStartPicking?(): void;
  onCancelPicking?(): void;
  /** Go back to choosing a component, where there is no picker (React mode). */
  onChangeComponent?(): void;
  /** Re-target to an ancestor from the path popover. */
  onSelectPath?(index: number): void;

  /** Record an interaction. Absent where motion is declared, not observed. */
  onCapture?(handlers: CaptureHandlers): () => void;

  interactions: MotionInteraction[];
  onInteractionsChange(next: MotionInteraction[]): void;
  /** Notes recorded at capture time, e.g. "curve estimated". */
  notes?: Record<string, string>;

  renderStage(props: InspectorStageProps): ReactNode;

  /** How the selected component is named in a decision handed to an agent. */
  decisionComponent?(): MotionDecision["component"];
  /**
   * Save a decision where a coding agent can read it (the project's
   * `motionlab/decisions.json`). Resolve null when that is not possible —
   * the panel then copies a ready-made prompt instead.
   */
  saveDecision?(decision: MotionDecision): Promise<{ file: string } | null>;

  settings: InspectorSettings;
  onSettingsChange(next: InspectorSettings): void;
  onClose(): void;
}

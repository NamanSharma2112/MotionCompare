import type { TargetDescriptor, TransitionConfig, VariantId } from "@motionlab/core";

/**
 * The extension's own internal protocol: popup ⇄ background ⇄ content script.
 *
 * Separate from the page protocol in `@motionlab/core/bridge`, which is the
 * one that crosses into untrusted territory. These messages never leave the
 * extension, but they are still validated at the content script because a
 * content script shares a tab with the page.
 */
export type ExtensionCommand =
  | { type: "PING" }
  | { type: "START_SELECTION" }
  | { type: "CANCEL_SELECTION" }
  | { type: "CLOSE_EXPERIMENT" }
  | { type: "GET_STATUS" }
  | { type: "OPEN_NATIVE_TARGET"; targetId: string };

export type ExtensionStatus = {
  /** Whether the page is running the MotionLab SDK. */
  sdk: boolean;
  nativeTargets: TargetDescriptor[];
  selecting: boolean;
  experimentOpen: boolean;
  selectorLabel?: string;
};

export type ExtensionResponse =
  | { ok: true; status: ExtensionStatus }
  | { ok: false; error: string };

export interface VariantUpdate {
  variant: VariantId;
  transition: TransitionConfig;
}

export const CONTENT_SCRIPT_FILE = "content.js";

export function isExtensionCommand(value: unknown): value is ExtensionCommand {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  switch (type) {
    case "PING":
    case "START_SELECTION":
    case "CANCEL_SELECTION":
    case "CLOSE_EXPERIMENT":
    case "GET_STATUS":
      return true;
    case "OPEN_NATIVE_TARGET":
      return typeof (value as { targetId?: unknown }).targetId === "string";
    default:
      return false;
  }
}

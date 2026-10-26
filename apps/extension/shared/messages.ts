import type { TargetDescriptor } from "@motionlab/core";

/**
 * The extension's own protocol: popup ⇄ background ⇄ content script.
 *
 * Separate from the page protocol in `@motionlab/core/bridge`, which crosses
 * into untrusted territory. These never leave the extension, but are still
 * validated at the content script, which shares a tab with the page.
 */
export type ExtensionCommand =
  | { type: "PING" }
  | { type: "GET_STATUS" }
  | { type: "OPEN_PANEL" }
  | { type: "START_INSPECT" }
  | { type: "CLOSE_PANEL" }
  | { type: "OPEN_NATIVE_TARGET"; targetId: string };

export interface ExtensionStatus {
  /** Whether the page runs the MotionLab SDK. */
  sdk: boolean;
  nativeTargets: TargetDescriptor[];
  panelOpen: boolean;
  picking: boolean;
  /** What is being inspected, if anything. */
  inspecting?: string;
}

export type ExtensionResponse =
  | { ok: true; status: ExtensionStatus }
  | { ok: false; error: string };

export const CONTENT_SCRIPT_FILE = "content.js";

export function isExtensionCommand(value: unknown): value is ExtensionCommand {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  switch (type) {
    case "PING":
    case "GET_STATUS":
    case "OPEN_PANEL":
    case "START_INSPECT":
    case "CLOSE_PANEL":
      return true;
    case "OPEN_NATIVE_TARGET":
      return typeof (value as { targetId?: unknown }).targetId === "string";
    default:
      return false;
  }
}

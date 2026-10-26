import { parseTransition } from "../serialization/index";
import type { Experiment, TransitionConfig, VariantId } from "../types/index";

/**
 * The protocol spoken between the browser extension and a page running the
 * MotionLab SDK.
 *
 * Everything here is plain JSON. React components, render functions and DOM
 * nodes never cross this boundary — the extension gets target *descriptions*
 * and sends back *configuration*, which is the whole reason native mode can
 * be deep without the extension needing access to page JavaScript.
 */
export const MOTIONLAB_PROTOCOL = "motionlab";
export const MOTIONLAB_PROTOCOL_VERSION = 1;

/** A target as it looks once stripped of everything unserializable. */
export interface TargetDescriptor {
  id: string;
  label: string;
  source: "react" | "dom";
}

export type MotionLabMessage =
  | { type: "HELLO" }
  | { type: "HELLO_ACK"; version: number; sdk: boolean }
  | { type: "GET_TARGETS" }
  | { type: "TARGETS"; targets: TargetDescriptor[] }
  | { type: "OPEN_TARGET"; targetId: string }
  | { type: "CLOSE_TARGET"; targetId: string }
  | { type: "REPLAY"; targetId: string }
  | { type: "RESET"; targetId: string }
  | {
      type: "UPDATE_VARIANT";
      targetId: string;
      variant: VariantId;
      transition: TransitionConfig;
    }
  | { type: "CHOOSE_WINNER"; targetId: string; variant: VariantId | null }
  | { type: "EXPERIMENT"; targetId: string; experiment: Experiment }
  | { type: "ERROR"; message: string };

/** A message on the wire, namespaced so unrelated `postMessage` traffic is ignored. */
export interface MotionLabEnvelope {
  protocol: typeof MOTIONLAB_PROTOCOL;
  version: number;
  /** Which side sent it, so a bridge never processes its own echo. */
  from: "extension" | "page";
  message: MotionLabMessage;
}

export function envelope(
  from: MotionLabEnvelope["from"],
  message: MotionLabMessage,
): MotionLabEnvelope {
  return {
    protocol: MOTIONLAB_PROTOCOL,
    version: MOTIONLAB_PROTOCOL_VERSION,
    from,
    message,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVariantId(value: unknown): value is VariantId {
  return value === "A" || value === "B";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

/**
 * Validate an incoming message.
 *
 * This is the trust boundary. A content script runs on pages MotionLab does
 * not control, and the page side is reachable by anything that can call
 * `postMessage` — so each variant is checked field by field and anything
 * unrecognized is dropped. No message ever carries code, and nothing here
 * evaluates a string.
 */
export function parseMotionLabMessage(value: unknown): MotionLabMessage | undefined {
  if (!isRecord(value)) return undefined;

  switch (value.type) {
    case "HELLO":
    case "GET_TARGETS":
      return { type: value.type };

    case "HELLO_ACK":
      return typeof value.version === "number" && typeof value.sdk === "boolean"
        ? { type: "HELLO_ACK", version: value.version, sdk: value.sdk }
        : undefined;

    case "TARGETS": {
      if (!Array.isArray(value.targets)) return undefined;
      const targets: TargetDescriptor[] = [];
      for (const entry of value.targets.slice(0, 200)) {
        if (!isRecord(entry) || !isNonEmptyString(entry.id)) continue;
        targets.push({
          id: entry.id,
          label: isNonEmptyString(entry.label) ? entry.label : entry.id,
          source: entry.source === "dom" ? "dom" : "react",
        });
      }
      return { type: "TARGETS", targets };
    }

    case "OPEN_TARGET":
    case "CLOSE_TARGET":
    case "REPLAY":
    case "RESET":
      return isNonEmptyString(value.targetId)
        ? { type: value.type, targetId: value.targetId }
        : undefined;

    case "UPDATE_VARIANT": {
      if (!isNonEmptyString(value.targetId) || !isVariantId(value.variant)) return undefined;
      const transition = parseTransition(value.transition);
      if (!transition) return undefined;
      return {
        type: "UPDATE_VARIANT",
        targetId: value.targetId,
        variant: value.variant,
        transition,
      };
    }

    case "CHOOSE_WINNER":
      if (!isNonEmptyString(value.targetId)) return undefined;
      if (value.variant !== null && !isVariantId(value.variant)) return undefined;
      return {
        type: "CHOOSE_WINNER",
        targetId: value.targetId,
        variant: value.variant as VariantId | null,
      };

    case "EXPERIMENT":
      // The experiment body is re-validated by `deserializeExperiment` at the
      // point of use; here we only check the envelope shape.
      return isNonEmptyString(value.targetId) && isRecord(value.experiment)
        ? {
            type: "EXPERIMENT",
            targetId: value.targetId,
            experiment: value.experiment as unknown as Experiment,
          }
        : undefined;

    case "ERROR":
      return isNonEmptyString(value.message)
        ? { type: "ERROR", message: value.message.slice(0, 512) }
        : undefined;

    default:
      return undefined;
  }
}

/** Unwrap and validate an envelope, rejecting anything not addressed to us. */
export function parseMotionLabEnvelope(
  value: unknown,
  expectedFrom?: MotionLabEnvelope["from"],
): MotionLabMessage | undefined {
  if (!isRecord(value)) return undefined;
  if (value.protocol !== MOTIONLAB_PROTOCOL) return undefined;
  if (value.version !== MOTIONLAB_PROTOCOL_VERSION) return undefined;
  if (expectedFrom && value.from !== expectedFrom) return undefined;
  if (value.from !== "extension" && value.from !== "page") return undefined;
  return parseMotionLabMessage(value.message);
}

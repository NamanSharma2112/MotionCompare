import {
  envelope,
  parseMotionLabEnvelope,
  type MotionLabMessage,
  type TargetDescriptor,
} from "@motionlab/core";

/**
 * The extension's half of the page bridge.
 *
 * A content script runs in an isolated world and cannot read page JavaScript
 * state, but it does share the `window` object for messaging — so this talks
 * to the SDK over `postMessage` with the namespaced, validated envelope from
 * the core, and injects nothing into the page.
 */

const HELLO_TIMEOUT_MS = 400;

function send(message: MotionLabMessage): void {
  window.postMessage(envelope("extension", message), window.location.origin);
}

function once(
  predicate: (message: MotionLabMessage) => boolean,
  timeoutMs: number,
): Promise<MotionLabMessage | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(null);
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const message = parseMotionLabEnvelope(event.data, "page");
      if (!message || !predicate(message)) return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(message);
    }

    window.addEventListener("message", onMessage);
  });
}

/** Whether this page is running the MotionLab SDK. */
export async function detectSdk(): Promise<boolean> {
  const reply = once((message) => message.type === "HELLO_ACK", HELLO_TIMEOUT_MS);
  send({ type: "HELLO" });
  const message = await reply;
  return message?.type === "HELLO_ACK" ? message.sdk : false;
}

/** The targets the page has registered, in native mode. */
export async function getNativeTargets(): Promise<TargetDescriptor[]> {
  const reply = once((message) => message.type === "TARGETS", HELLO_TIMEOUT_MS);
  send({ type: "GET_TARGETS" });
  const message = await reply;
  return message?.type === "TARGETS" ? message.targets : [];
}

/**
 * Hand a target to the page's own devtools.
 *
 * This is the deep path: rather than cloning DOM and guessing at styles, the
 * extension asks the SDK to open the real component in its own overlay, where
 * the comparison runs against actual React instances.
 */
export function openNativeTarget(targetId: string): void {
  send({ type: "OPEN_TARGET", targetId });
}

export function closeNativeTarget(targetId: string): void {
  send({ type: "CLOSE_TARGET", targetId });
}

export function replayNativeTarget(targetId: string): void {
  send({ type: "REPLAY", targetId });
}

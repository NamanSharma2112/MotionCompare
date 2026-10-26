import {
  chooseWinner,
  envelope,
  parseMotionLabEnvelope,
  setVariantTransition,
  type Experiment,
  type MotionLabMessage,
  type TargetDescriptor,
  type TransitionConfig,
  type VariantId,
} from "@motionlab/core";

/** The handle the extension looks for to decide that a page has the SDK. */
export const MOTIONLAB_GLOBAL = "__MOTIONLAB__";

export interface PageBridgeHandlers {
  getTargets(): TargetDescriptor[];
  getExperiment(): Experiment | null;
  openTarget(id: string): void;
  closeTarget(): void;
  setVariant(variant: VariantId, transition: TransitionConfig): void;
  updateExperiment(updater: (current: Experiment) => Experiment): void;
}

export interface MotionLabPageGlobal {
  version: number;
  getTargets(): TargetDescriptor[];
}

/**
 * The page-side half of the extension bridge.
 *
 * A content script runs in an isolated world and cannot read page JavaScript
 * state directly, so communication goes over `window.postMessage` with a
 * namespaced, validated envelope. Nothing executable crosses it: the page
 * sends target descriptions and experiments, and accepts only the handful of
 * commands in the protocol.
 *
 * Returns a teardown function, so an unmounting provider leaves no listener
 * and no global behind.
 */
export function createPageBridge(handlers: PageBridgeHandlers): () => void {
  if (typeof window === "undefined") return () => {};

  const globalHandle: MotionLabPageGlobal = {
    version: 1,
    getTargets: () => handlers.getTargets(),
  };
  (window as unknown as Record<string, unknown>)[MOTIONLAB_GLOBAL] = globalHandle;

  function reply(message: MotionLabMessage) {
    // Same-origin only. The bridge is a local channel between this page and
    // the content script sitting on top of it, never a cross-origin API.
    window.postMessage(envelope("page", message), window.location.origin);
  }

  function onMessage(event: MessageEvent) {
    if (event.source !== window) return;
    const message = parseMotionLabEnvelope(event.data, "extension");
    if (!message) return;

    switch (message.type) {
      case "HELLO":
        reply({ type: "HELLO_ACK", version: globalHandle.version, sdk: true });
        return;

      case "GET_TARGETS":
        reply({ type: "TARGETS", targets: handlers.getTargets() });
        return;

      case "OPEN_TARGET": {
        handlers.openTarget(message.targetId);
        // Read back on a microtask so the state update has landed.
        void Promise.resolve().then(() => {
          const experiment = handlers.getExperiment();
          if (experiment) reply({ type: "EXPERIMENT", targetId: experiment.id, experiment });
        });
        return;
      }

      case "CLOSE_TARGET":
        handlers.closeTarget();
        return;

      case "UPDATE_VARIANT":
        handlers.updateExperiment((current) =>
          current.id === message.targetId
            ? setVariantTransition(current, message.variant, message.transition)
            : current,
        );
        return;

      case "CHOOSE_WINNER":
        handlers.updateExperiment((current) =>
          current.id === message.targetId ? chooseWinner(current, message.variant) : current,
        );
        return;

      // REPLAY/RESET are handled by the overlay, which owns the playback
      // controller; the bridge forwards them as DOM events it can listen for.
      case "REPLAY":
      case "RESET":
        window.dispatchEvent(
          new CustomEvent("motionlab:playback", {
            detail: { action: message.type === "REPLAY" ? "replay" : "reset", targetId: message.targetId },
          }),
        );
        return;

      default:
        return;
    }
  }

  window.addEventListener("message", onMessage);

  return () => {
    window.removeEventListener("message", onMessage);
    if ((window as unknown as Record<string, unknown>)[MOTIONLAB_GLOBAL] === globalHandle) {
      delete (window as unknown as Record<string, unknown>)[MOTIONLAB_GLOBAL];
    }
  };
}

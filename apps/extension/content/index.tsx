import {
  isExtensionCommand,
  type ExtensionResponse,
  type ExtensionStatus,
} from "../shared/messages";
import { experimentForElement } from "./inspect";
import { detectSdk, getNativeTargets, openNativeTarget } from "./nativeBridge";
import { startSelection, type SelectionHandle } from "./selector";
import { mountStage, type MountedStage } from "./stage";

/**
 * The MotionLab content script.
 *
 * Injected on demand when the developer opens the popup. It can select an
 * element, inspect its motion, and open a comparison over the page — or, when
 * the page runs the MotionLab SDK, step aside and let the SDK's own devtools
 * handle the target natively.
 *
 * Everything it adds to the page is removable, and the page's own elements are
 * never modified: the selector draws its own overlay, and the comparison runs
 * on clones inside a shadow root.
 */

declare global {
  interface Window {
    __MOTIONLAB_CONTENT__?: boolean;
  }
}

// The background script injects on demand and may do so more than once.
if (!window.__MOTIONLAB_CONTENT__) {
  window.__MOTIONLAB_CONTENT__ = true;
  install();
}

function install(): void {
  let selection: SelectionHandle | null = null;
  let stage: MountedStage | null = null;
  let selectorLabel: string | undefined;
  let sdk = false;
  let nativeTargets: Awaited<ReturnType<typeof getNativeTargets>> = [];

  function status(): ExtensionStatus {
    return {
      sdk,
      nativeTargets,
      selecting: selection !== null,
      experimentOpen: stage !== null,
      ...(selectorLabel ? { selectorLabel } : {}),
    };
  }

  async function refreshSdk(): Promise<void> {
    sdk = await detectSdk();
    nativeTargets = sdk ? await getNativeTargets() : [];
  }

  function closeStage(): void {
    stage?.close();
    stage = null;
    selectorLabel = undefined;
  }

  function cancelSelection(): void {
    selection?.cancel();
    selection = null;
  }

  function beginSelection(): void {
    cancelSelection();
    closeStage();

    selection = startSelection({
      onSelect(element) {
        selection = null;
        const { experiment, label } = experimentForElement(element);
        selectorLabel = label;
        stage = mountStage({
          experiment,
          element,
          selectorLabel: label,
          onClosed() {
            stage = null;
            selectorLabel = undefined;
          },
        });
      },
      onCancel() {
        selection = null;
      },
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isExtensionCommand(message)) {
      sendResponse({ ok: false, error: "Unrecognized command." } satisfies ExtensionResponse);
      return false;
    }

    void (async () => {
      try {
        switch (message.type) {
          case "PING":
          case "GET_STATUS":
            await refreshSdk();
            break;

          case "START_SELECTION":
            beginSelection();
            break;

          case "CANCEL_SELECTION":
            cancelSelection();
            break;

          case "CLOSE_EXPERIMENT":
            closeStage();
            break;

          case "OPEN_NATIVE_TARGET":
            // Native mode: the page's own devtools open the real component.
            // MotionLab does not clone or guess when it does not have to.
            openNativeTarget(message.targetId);
            break;
        }
        sendResponse({ ok: true, status: status() } satisfies ExtensionResponse);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "MotionLab could not complete that.",
        } satisfies ExtensionResponse);
      }
    })();

    return true;
  });

  // Leave nothing behind if the page navigates away mid-experiment.
  window.addEventListener("pagehide", () => {
    cancelSelection();
    closeStage();
  });
}

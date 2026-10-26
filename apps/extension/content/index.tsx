import { StrictMode, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { injectUiStyles } from "@motionlab/ui";
import {
  isExtensionCommand,
  type ExtensionResponse,
  type ExtensionStatus,
} from "../shared/messages";
import { App, type AppHandle } from "./App";
import { detectSdk, getNativeTargets, openNativeTarget } from "./nativeBridge";

/**
 * The MotionLab content script.
 *
 * Injected on demand when the developer opens the popup. Everything MotionLab
 * draws lives in one shadow root on one host element; closing the panel
 * unmounts it and removes that element, which is the entire cleanup — the
 * page's own elements are never modified, apart from the selected one being
 * hidden while its stand-in replays, which is restored when playback stops.
 */

declare global {
  interface Window {
    __MOTIONLAB_CONTENT__?: boolean;
  }
}

if (!window.__MOTIONLAB_CONTENT__) {
  window.__MOTIONLAB_CONTENT__ = true;
  install();
}

function install(): void {
  let mounted: { root: Root; host: HTMLElement; handle: React.RefObject<AppHandle | null> } | null = null;

  function mount(): React.RefObject<AppHandle | null> {
    if (mounted) return mounted.handle;
    const host = document.createElement("div");
    host.setAttribute("data-motionlab-extension", "");
    host.style.cssText = "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483000";
    const shadow = host.attachShadow({ mode: "open" });
    injectUiStyles(shadow);
    const uiMount = document.createElement("div");
    // The stage sits outside MotionLab's typography so the clone renders with
    // only its own (inlined) styles.
    const stageMount = document.createElement("div");
    shadow.append(stageMount, uiMount);
    document.documentElement.appendChild(host);

    const handle = createRef<AppHandle>();
    const root = createRoot(uiMount);
    root.render(
      <StrictMode>
        <App handleRef={handle} shadowHost={host} stageMount={stageMount} onClose={unmount} />
      </StrictMode>,
    );
    mounted = { root, host, handle };
    return handle;
  }

  function unmount(): void {
    const current = mounted;
    mounted = null;
    if (!current) return;
    // Let the closing click finish before tearing the tree down.
    queueMicrotask(() => {
      current.root.unmount();
      current.host.remove();
    });
  }

  async function status(): Promise<ExtensionStatus> {
    const live = mounted?.handle.current?.status();
    if (live) return live;
    const sdk = await detectSdk();
    return {
      sdk,
      nativeTargets: sdk ? await getNativeTargets() : [],
      panelOpen: false,
      picking: false,
    };
  }

  /** Wait a frame or two for a freshly mounted panel to expose its handle. */
  async function ready(handle: React.RefObject<AppHandle | null>): Promise<AppHandle | null> {
    for (let attempt = 0; attempt < 20 && !handle.current; attempt += 1) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }
    return handle.current;
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
            break;
          case "OPEN_PANEL":
            await ready(mount());
            break;
          case "START_INSPECT":
            (await ready(mount()))?.startInspect();
            break;
          case "CLOSE_PANEL":
            unmount();
            break;
          case "OPEN_NATIVE_TARGET":
            openNativeTarget(message.targetId);
            unmount();
            break;
        }
        sendResponse({ ok: true, status: await status() } satisfies ExtensionResponse);
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "MotionLab could not complete that.",
        } satisfies ExtensionResponse);
      }
    })();

    return true;
  });

  window.addEventListener("pagehide", unmount);
}

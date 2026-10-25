import {
  CONTENT_SCRIPT_FILE,
  isExtensionCommand,
  type ExtensionCommand,
  type ExtensionResponse,
} from "../shared/messages";

/**
 * The background service worker.
 *
 * Owns extension lifecycle and relays commands from the popup to the content
 * script in the active tab, injecting that content script on demand.
 *
 * Injection is deliberate rather than declarative: the manifest asks for
 * `activeTab` and no host permissions, so MotionLab has no standing access to
 * any site. Nothing is injected until the developer opens the popup and asks
 * for it on the tab they are looking at.
 */

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    if (pong) return;
  } catch {
    // No receiver yet — that is the normal first-run path, not an error.
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: [CONTENT_SCRIPT_FILE],
  });
}

async function relay(tabId: number, command: ExtensionCommand): Promise<ExtensionResponse> {
  await ensureContentScript(tabId);
  return (await chrome.tabs.sendMessage(tabId, command)) as ExtensionResponse;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isExtensionCommand(message)) {
    sendResponse({ ok: false, error: "Unrecognized command." } satisfies ExtensionResponse);
    return false;
  }

  void (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        sendResponse({ ok: false, error: "No active tab." } satisfies ExtensionResponse);
        return;
      }
      if (tab.url && /^(chrome|edge|about|chrome-extension|devtools):/i.test(tab.url)) {
        sendResponse({
          ok: false,
          error: "MotionLab cannot run on browser pages. Open a website and try again.",
        } satisfies ExtensionResponse);
        return;
      }
      sendResponse(await relay(tab.id, message));
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Could not reach the page.",
      } satisfies ExtensionResponse);
    }
  })();

  // Keeps the message channel open for the async response above.
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.info("[MotionLab] Installed. Open the popup on a page to begin.");
});

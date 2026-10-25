import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { injectDialKitStyles, tokens } from "@motionlab/dialkit";
import { injectDevtoolsStyles } from "@motionlab/devtools";
import type {
  ExtensionCommand,
  ExtensionResponse,
  ExtensionStatus,
} from "../shared/messages";

function send(command: ExtensionCommand): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(command) as Promise<ExtensionResponse>;
}

/**
 * Turn Chrome's wording into something a developer can act on.
 *
 * MotionLab asks for `activeTab` rather than access to every site, and Chrome
 * grants that only when the extension is invoked from its toolbar icon. Seeing
 * the raw "manifest must request permission" string here usually means the
 * popup was opened some other way.
 */
function explain(error: string): string {
  if (/host permissions|respective host|Cannot access contents/i.test(error)) {
    return "No access to this tab yet. MotionLab only asks for the tab you are on, and Chrome grants that when you open it from the toolbar icon — click the MotionLab icon on this page and try again.";
  }
  return error;
}

/**
 * The popup.
 *
 * Activation, status and — when the page runs the MotionLab SDK — the list of
 * registered targets, so the developer can jump straight into native mode
 * instead of hunting for the right element.
 */
function Popup() {
  const [status, setStatus] = useState<ExtensionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (command: ExtensionCommand, closeAfter = false) => {
    setBusy(true);
    setError(null);
    try {
      const response = await send(command);
      if (response.ok) {
        setStatus(response.status);
        if (closeAfter) window.close();
      } else {
        setError(response.error);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach the page.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    injectDialKitStyles();
    injectDevtoolsStyles();
    void run({ type: "GET_STATUS" });
  }, [run]);

  return (
    <div
      className="ml dk"
      style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div className="ml-brand">
        <span className="ml-launcher-dot" aria-hidden="true" />
        MotionLab
      </div>

      {status?.sdk ? (
        <>
          <p className="dk-hint" style={{ lineHeight: 1.5 }}>
            This page runs the MotionLab SDK. Open a registered component and compare the real
            thing — no DOM guessing.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {status.nativeTargets.length > 0 ? (
              status.nativeTargets.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  className="ml-target"
                  disabled={busy}
                  onClick={() =>
                    void run({ type: "OPEN_NATIVE_TARGET", targetId: target.id }, true)
                  }
                >
                  <span className="ml-target-dot" aria-hidden="true" />
                  <span>{target.label}</span>
                </button>
              ))
            ) : (
              <span className="dk-hint">No targets registered on this page yet.</span>
            )}
          </div>
          <hr style={{ border: 0, borderTop: `1px solid ${tokens.border}`, margin: 0 }} />
        </>
      ) : null}

      <button
        type="button"
        className="dk-button dk-button-lg"
        data-accent="true"
        disabled={busy}
        onClick={() => void run({ type: "START_SELECTION" }, true)}
      >
        Select element
      </button>

      {status?.experimentOpen ? (
        <button
          type="button"
          className="dk-button"
          disabled={busy}
          onClick={() => void run({ type: "CLOSE_EXPERIMENT" })}
        >
          Close experiment{status.selectorLabel ? ` · ${status.selectorLabel}` : ""}
        </button>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span className="dk-label">Status</span>
        <span className="dk-hint">
          {error
            ? explain(error)
            : !status
              ? "Checking page…"
              : status.selecting
                ? "Selecting — click an element on the page"
                : status.experimentOpen
                  ? `Comparing ${status.selectorLabel ?? "element"}`
                  : status.sdk
                    ? "Ready · MotionLab SDK detected"
                    : "Ready · generic DOM mode"}
        </span>
      </div>

      <p className="dk-hint" style={{ lineHeight: 1.5 }}>
        MotionLab animates a copy of the element inside its own stage. Your page is not modified,
        and closing the experiment leaves it exactly as it was.
      </p>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Popup />
    </StrictMode>,
  );
}

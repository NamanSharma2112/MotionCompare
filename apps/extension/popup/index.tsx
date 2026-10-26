import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrandMark, Button, Icon, StatusDot, UiRoot, injectUiStyles } from "@motionlab/ui";
import type { ExtensionCommand, ExtensionResponse, ExtensionStatus } from "../shared/messages";

function send(command: ExtensionCommand): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(command) as Promise<ExtensionResponse>;
}

/**
 * Chrome grants `activeTab` only when MotionLab is opened from its toolbar
 * icon. Its raw wording ("manifest must request permission…") means nothing
 * to a developer, so it is translated into what to do.
 */
function explain(error: string): string {
  if (/host permissions|respective host|Cannot access contents/i.test(error)) {
    return "Open MotionLab from its toolbar icon on this tab to give it access.";
  }
  return error;
}

/**
 * The popup does one thing: start MotionLab on this page. The product lives
 * in the panel on the page itself.
 */
function Popup() {
  const [status, setStatus] = useState<ExtensionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (command: ExtensionCommand, closeAfter = false) => {
    // Checking status never disables anything: the SDK probe can take a few
    // hundred milliseconds, and a greyed-out primary button reads as broken.
    const acting = command.type !== "GET_STATUS";
    if (acting) setBusy(true);
    setError(null);
    try {
      const response = await send(command);
      if (response.ok) {
        setStatus(response.status);
        if (closeAfter) window.close();
      } else {
        setError(explain(response.error));
      }
    } catch (cause) {
      setError(explain(cause instanceof Error ? cause.message : "Could not reach the page."));
    } finally {
      if (acting) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run({ type: "GET_STATUS" });
  }, [run]);

  const line = error
    ? error
    : !status
      ? "Checking this page…"
      : status.sdk
        ? `MotionLab SDK · ${status.nativeTargets.length} component${status.nativeTargets.length === 1 ? "" : "s"}`
        : status.panelOpen
          ? status.inspecting
            ? `Inspecting ${status.inspecting}`
            : "Panel open on this page"
          : "Ready on this page";

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="mlui-brand">
        <BrandMark />
        MotionLab
      </div>
      <div className="mlui-hstack" style={{ gap: 7, minHeight: 18 }}>
        <StatusDot tone={error ? "warning" : status ? "success" : undefined} />
        <span className="mlui-meta" style={{ lineHeight: 1.45 }}>
          {line}
        </span>
      </div>
      <Button
        variant="primary"
        block
        icon="inspect"
        disabled={busy || Boolean(error)}
        onClick={() => void run({ type: "START_INSPECT" }, true)}
      >
        Inspect component
      </Button>
      <button
        type="button"
        className="mlui-add"
        style={{ margin: "-4px -6px 0", justifyContent: "space-between" }}
        disabled={busy || Boolean(error)}
        onClick={() => void run({ type: status?.panelOpen ? "CLOSE_PANEL" : "OPEN_PANEL" }, !status?.panelOpen)}
      >
        {status?.panelOpen ? "Close panel" : "Open panel"}
        <Icon name="arrow" size={13} />
      </button>
    </div>
  );
}

injectUiStyles();
const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <UiRoot theme="system">
        <Popup />
      </UiRoot>
    </StrictMode>,
  );
}

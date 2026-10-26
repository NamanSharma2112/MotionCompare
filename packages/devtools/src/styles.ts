import { tokens } from "@motionlab/dialkit";

/**
 * The devtools stylesheet, as text.
 *
 * Injected alongside DialKit's, scoped under `.ml` so nothing here can leak
 * into the host application, and written with explicit values rather than
 * utility classes so the overlay renders the same inside a Tailwind app, a
 * styled-components app, and a content script on a stranger's website.
 */
export const DEVTOOLS_CSS = `
.ml, .ml * { box-sizing: border-box; }
.ml {
  font-family: ${tokens.font};
  color: ${tokens.text};
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
}

/* --- Launcher ----------------------------------------------------------- */
.ml-launcher {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: ${tokens.zOverlay};
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${tokens.text};
  background: ${tokens.surface};
  border: 1px solid ${tokens.borderStrong};
  border-radius: 999px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
.ml-launcher:hover { background: ${tokens.surfaceRaised}; }
.ml-launcher:focus-visible { outline: 2px solid ${tokens.accent}; outline-offset: 2px; }
.ml-launcher-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${tokens.accent};
  box-shadow: 0 0 0 3px color-mix(in srgb, ${tokens.accent} 25%, transparent);
}

/* --- Target picker ------------------------------------------------------ */
.ml-picker {
  position: fixed;
  right: 16px;
  bottom: 64px;
  z-index: ${tokens.zOverlay};
  width: 260px;
  max-height: min(60vh, 420px);
  display: flex;
  flex-direction: column;
  background: ${tokens.surface};
  border: 1px solid ${tokens.borderStrong};
  border-radius: ${tokens.radiusLg};
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}
.ml-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid ${tokens.border};
}
.ml-picker-title { font-size: 12px; font-weight: 700; letter-spacing: 0.02em; }
.ml-picker-list { overflow-y: auto; padding: 6px; }
.ml-target {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  font: inherit;
  font-size: 12px;
  text-align: left;
  color: ${tokens.text};
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${tokens.radiusSm};
  cursor: pointer;
}
.ml-target:hover { background: ${tokens.surfaceRaised}; border-color: ${tokens.border}; }
.ml-target:focus-visible { outline: 2px solid ${tokens.accent}; outline-offset: -2px; }
.ml-target-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: 1px solid ${tokens.borderStrong};
  flex: none;
}
.ml-target[data-open="true"] .ml-target-dot { background: ${tokens.accent}; border-color: ${tokens.accent}; }
.ml-target-id { margin-left: auto; font-family: ${tokens.mono}; font-size: 10px; color: ${tokens.textFaint}; }
.ml-empty { padding: 18px 14px; font-size: 12px; color: ${tokens.textMuted}; line-height: 1.6; }
.ml-empty code { font-family: ${tokens.mono}; font-size: 11px; color: ${tokens.text}; }

/* --- Overlay ------------------------------------------------------------ */
.ml-overlay {
  position: fixed;
  inset: 0;
  z-index: ${tokens.zOverlay};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(4, 4, 6, 0.74);
  backdrop-filter: blur(3px);
}
.ml-shell {
  display: flex;
  flex-direction: column;
  width: min(1080px, 100%);
  max-height: 100%;
  background: ${tokens.bg};
  border: 1px solid ${tokens.borderStrong};
  border-radius: ${tokens.radiusLg};
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}
.ml-shell-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid ${tokens.border};
  background: ${tokens.surface};
  flex: none;
}
.ml-brand { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; }
.ml-shell-label { margin-left: auto; font-size: 12px; color: ${tokens.textMuted}; }
.ml-mode {
  font-family: ${tokens.mono};
  font-size: 10px;
  padding: 2px 6px;
  color: ${tokens.textMuted};
  border: 1px solid ${tokens.border};
  border-radius: 999px;
}
.ml-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  color: ${tokens.textMuted};
  background: transparent;
  border: 1px solid ${tokens.border};
  border-radius: ${tokens.radiusSm};
  cursor: pointer;
}
.ml-close:hover { color: ${tokens.text}; background: ${tokens.surfaceRaised}; }

.ml-shell-body { overflow-y: auto; }

/* --- Stage -------------------------------------------------------------- */
.ml-stages {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: ${tokens.border};
}
.ml-stage {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
  background: ${tokens.surfaceSunken};
}
.ml-stage-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.ml-stage-name { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.ml-stage-summary { margin-left: auto; font-family: ${tokens.mono}; font-size: 10px; color: ${tokens.textFaint}; }
.ml-stage-winner {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 999px;
  color: ${tokens.bg};
}
.ml-stage-frame {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 20px;
  border: 1px dashed ${tokens.border};
  border-radius: ${tokens.radius};
  /* The component under test sits on a neutral checkerboard so a change in
     opacity is readable instead of blending into a flat panel. */
  background-color: #17171c;
  background-image:
    linear-gradient(45deg, rgba(255, 255, 255, 0.022) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.022) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.022) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.022) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  overflow: hidden;
}
.ml-stage-mount { max-width: 100%; }

/* Each variant's portal container. Transparent to hit-testing so it does not
   sit over the component, but whatever is portalled into it stays
   interactive — a dialog you cannot click is not a dialog you can judge. */
[data-motionlab-portal] {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
[data-motionlab-portal] > * { pointer-events: auto; }

.ml-stage-error {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  text-align: center;
  color: ${tokens.danger};
  font-size: 12px;
}
.ml-stage-error-detail {
  font-family: ${tokens.mono};
  font-size: 10px;
  color: ${tokens.textMuted};
  max-width: 320px;
  word-break: break-word;
}

/* --- Transport ---------------------------------------------------------- */
.ml-transport {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid ${tokens.border};
  border-bottom: 1px solid ${tokens.border};
  background: ${tokens.surface};
}

/* --- Controls ----------------------------------------------------------- */
.ml-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: ${tokens.border}; }
.ml-control-column { padding: 16px; background: ${tokens.bg}; min-width: 0; }
.ml-choose-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: ${tokens.border}; }
.ml-choose-cell { padding: 12px 16px; background: ${tokens.bg}; }
.ml-choose-cell .dk-button { width: 100%; }

.ml-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid ${tokens.border};
  background: ${tokens.surface};
}
.ml-footer-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ml-winner-readout { font-size: 12px; color: ${tokens.textMuted}; }
.ml-winner-readout strong { color: ${tokens.text}; }

.ml-export { display: flex; flex-direction: column; gap: 6px; }
.ml-code {
  margin: 0;
  padding: 10px 12px;
  font-family: ${tokens.mono};
  font-size: 11px;
  line-height: 1.55;
  color: ${tokens.text};
  background: ${tokens.surfaceSunken};
  border: 1px solid ${tokens.border};
  border-radius: ${tokens.radiusSm};
  overflow-x: auto;
  white-space: pre;
  max-height: 180px;
}
.ml-caveat {
  font-size: 10px;
  line-height: 1.5;
  color: ${tokens.textMuted};
  padding: 7px 9px;
  border-left: 2px solid ${tokens.borderStrong};
  background: ${tokens.surfaceSunken};
  border-radius: 0 ${tokens.radiusSm} ${tokens.radiusSm} 0;
}

@media (max-width: 860px) {
  .ml-stages, .ml-controls, .ml-choose-row { grid-template-columns: 1fr; }
  .ml-overlay { padding: 0; }
  .ml-shell { border-radius: 0; height: 100%; width: 100%; }
}
`;

let injectedRoots: WeakSet<object> | null = null;

/** Inject the devtools stylesheet into a document or shadow root, once. */
export function injectDevtoolsStyles(root?: Document | ShadowRoot): void {
  if (typeof document === "undefined") return;
  const target = root ?? document;
  injectedRoots ??= new WeakSet();
  if (injectedRoots.has(target)) return;

  const container = target instanceof Document ? target.head : target;
  if (!container) return;
  if (target instanceof Document && target.getElementById("motionlab-devtools-styles")) {
    injectedRoots.add(target);
    return;
  }

  const style = (target instanceof Document ? target : document).createElement("style");
  style.id = "motionlab-devtools-styles";
  style.textContent = DEVTOOLS_CSS;
  container.appendChild(style);
  injectedRoots.add(target);
}

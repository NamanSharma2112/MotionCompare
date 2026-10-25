import { tokens } from "./tokens";

/**
 * The DialKit stylesheet, as text.
 *
 * Shipped as a string and injected once per document (or per shadow root, in
 * the extension) so the controls look identical in a Next.js app, in a
 * devtools overlay and inside a content script on someone else's site,
 * without inheriting or fighting the host page's CSS.
 */
export const DIALKIT_CSS = `
.dk, .dk * { box-sizing: border-box; }
.dk {
  font-family: ${tokens.font};
  font-size: 12px;
  line-height: 1.45;
  color: ${tokens.text};
  -webkit-font-smoothing: antialiased;
}

.dk-stack { display: flex; flex-direction: column; gap: ${tokens.space2}; }
.dk-row { display: flex; align-items: center; gap: ${tokens.space2}; }
.dk-spread { display: flex; align-items: center; justify-content: space-between; gap: ${tokens.space2}; }

.dk-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${tokens.textFaint};
}

.dk-value {
  font-family: ${tokens.mono};
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${tokens.text};
}

/* --- Dial: the primitive every numeric parameter is tuned with ----------- */
.dk-dial { display: flex; flex-direction: column; gap: 3px; }
.dk-dial-head { display: flex; align-items: baseline; justify-content: space-between; gap: ${tokens.space2}; }
.dk-dial-name { font-size: 11px; color: ${tokens.textMuted}; }

.dk-dial-input {
  width: 56px;
  padding: 2px 4px;
  text-align: right;
  font-family: ${tokens.mono};
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${tokens.text};
  background: ${tokens.surfaceSunken};
  border: 1px solid ${tokens.border};
  border-radius: ${tokens.radiusSm};
}
.dk-dial-input:focus-visible { outline: 2px solid var(--dk-accent, ${tokens.accent}); outline-offset: 1px; }
.dk-dial-input::-webkit-outer-spin-button,
.dk-dial-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.dk-dial-track {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 16px;
  margin: 0;
  background: transparent;
  cursor: ew-resize;
}
.dk-dial-track::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: ${tokens.surfaceSunken};
  border: 1px solid ${tokens.border};
}
.dk-dial-track::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: ${tokens.surfaceSunken};
  border: 1px solid ${tokens.border};
}
.dk-dial-track::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -5px;
  border-radius: 999px;
  background: var(--dk-accent, ${tokens.accent});
  border: 2px solid ${tokens.surface};
  cursor: ew-resize;
}
.dk-dial-track::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 2px solid ${tokens.surface};
  border-radius: 999px;
  background: var(--dk-accent, ${tokens.accent});
  cursor: ew-resize;
}
.dk-dial-track:focus-visible { outline: 2px solid var(--dk-accent, ${tokens.accent}); outline-offset: 2px; }

/* --- Buttons, segments, chips ------------------------------------------- */
.dk-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  font: inherit;
  font-size: 11px;
  font-weight: 500;
  color: ${tokens.text};
  background: ${tokens.surfaceRaised};
  border: 1px solid ${tokens.border};
  border-radius: ${tokens.radiusSm};
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.dk-button:hover:not(:disabled) { background: ${tokens.borderStrong}; }
.dk-button:disabled { opacity: 0.45; cursor: not-allowed; }
.dk-button:focus-visible { outline: 2px solid var(--dk-accent, ${tokens.accent}); outline-offset: 1px; }
.dk-button[data-accent="true"] {
  background: var(--dk-accent, ${tokens.accent});
  border-color: transparent;
  color: ${tokens.accentText};
  font-weight: 600;
}
.dk-button[data-accent="true"]:hover:not(:disabled) { filter: brightness(1.1); }
.dk-button[data-selected="true"] {
  border-color: var(--dk-accent, ${tokens.accent});
  color: ${tokens.text};
  background: color-mix(in srgb, var(--dk-accent, ${tokens.accent}) 18%, transparent);
}
.dk-button-lg { padding: 9px 16px; font-size: 12px; }

.dk-segment { display: inline-flex; padding: 2px; gap: 2px; background: ${tokens.surfaceSunken}; border: 1px solid ${tokens.border}; border-radius: ${tokens.radiusSm}; }
.dk-segment .dk-button { border: none; background: transparent; padding: 4px 10px; }
.dk-segment .dk-button[data-selected="true"] { background: var(--dk-accent, ${tokens.accent}); color: ${tokens.accentText}; }

.dk-chips { display: flex; flex-wrap: wrap; gap: ${tokens.space1}; }

.dk-panel {
  padding: ${tokens.space3};
  background: ${tokens.surface};
  border: 1px solid ${tokens.border};
  border-radius: ${tokens.radius};
}

.dk-hint { font-size: 10px; color: ${tokens.textFaint}; }
.dk-hint kbd {
  font-family: ${tokens.mono};
  font-size: 9px;
  padding: 1px 4px;
  border: 1px solid ${tokens.border};
  border-bottom-width: 2px;
  border-radius: 3px;
  background: ${tokens.surfaceSunken};
  color: ${tokens.textMuted};
}

/* --- Timeline: the curve the numbers actually produce -------------------- */
.dk-timeline { display: block; width: 100%; height: auto; border-radius: ${tokens.radiusSm}; background: ${tokens.surfaceSunken}; border: 1px solid ${tokens.border}; }
.dk-timeline-grid { stroke: ${tokens.border}; stroke-width: 1; }
.dk-timeline-target { stroke: ${tokens.borderStrong}; stroke-width: 1; stroke-dasharray: 3 3; }
.dk-timeline-curve { fill: none; stroke-width: 2; stroke-linecap: round; }
.dk-timeline-meta { display: flex; justify-content: space-between; margin-top: 3px; }

@media (prefers-reduced-motion: reduce) {
  .dk-button { transition: none; }
}
`;

let injectedDocuments: WeakSet<object> | null = null;

/**
 * Inject the stylesheet into a document or shadow root, once.
 *
 * Idempotent per root, because the devtools, the playground and the extension
 * stage can all mount in the same page and each one asks for its styles.
 */
export function injectDialKitStyles(root?: Document | ShadowRoot): void {
  if (typeof document === "undefined") return;
  const target = root ?? document;
  injectedDocuments ??= new WeakSet();
  if (injectedDocuments.has(target)) return;

  const container = target instanceof Document ? target.head : target;
  if (!container) return;
  if (target instanceof Document && target.getElementById("motionlab-dialkit-styles")) {
    injectedDocuments.add(target);
    return;
  }

  const style = (target instanceof Document ? target : document).createElement("style");
  style.id = "motionlab-dialkit-styles";
  style.textContent = DIALKIT_CSS;
  container.appendChild(style);
  injectedDocuments.add(target);
}

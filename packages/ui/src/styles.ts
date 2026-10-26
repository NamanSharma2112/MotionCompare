import { dark, font, fontSize, fontWeight, light, motion, radius, zIndex, type ColorScheme } from "./tokens";

function vars(scheme: ColorScheme): string {
  return `
  --ml-panel: ${scheme.panel};
  --ml-raised: ${scheme.raised};
  --ml-sunken: ${scheme.sunken};
  --ml-hover: ${scheme.hover};
  --ml-active: ${scheme.active};
  --ml-selected: ${scheme.selected};
  --ml-separator: ${scheme.separator};
  --ml-ring: ${scheme.ring};
  --ml-text: ${scheme.text};
  --ml-muted: ${scheme.muted};
  --ml-faint: ${scheme.faint};
  --ml-inverse: ${scheme.inverse};
  --ml-inverse-text: ${scheme.inverseText};
  --ml-fill: ${scheme.fill};
  --ml-track: ${scheme.track};
  --ml-accent: ${scheme.accent};
  --ml-accent-soft: ${scheme.accentSoft};
  --ml-record: ${scheme.record};
  --ml-success: ${scheme.success};
  --ml-warning: ${scheme.warning};
  --ml-shadow-panel: ${scheme.shadowPanel};
  --ml-shadow-popover: ${scheme.shadowPopover};
  --ml-backdrop: ${scheme.backdrop};`;
}

const E = motion.easeOut;

/**
 * The MotionLab stylesheet.
 *
 * Every rule is scoped under `.mlui` and uses explicit values, because it is
 * injected into shadow roots on arbitrary websites and into a host app whose
 * CSS reset MotionLab cannot predict. Colour comes from custom properties
 * switched by `data-theme`, so light and dark are the same component tree.
 */
export const UI_CSS = `
.mlui {
  ${vars(dark)}
  --ml-font: ${font.ui};
  --ml-mono: ${font.mono};
  --ml-ease-out: ${E};
  --ml-ease-in-out: ${motion.easeInOut};
  color-scheme: dark;
  font-family: var(--ml-font);
  font-size: ${fontSize.ui}px;
  line-height: 1.4;
  font-weight: ${fontWeight.regular};
  color: var(--ml-text);
  letter-spacing: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-variant-numeric: tabular-nums;
}
.mlui[data-theme="light"] {
  ${vars(light)}
  color-scheme: light;
}
.mlui *, .mlui *::before, .mlui *::after { box-sizing: border-box; }
.mlui ::selection { background: var(--ml-accent-soft); color: var(--ml-text); }
.mlui button { font: inherit; color: inherit; margin: 0; }
.mlui svg { display: block; flex: none; }
.mlui :focus { outline: none; }
.mlui :focus-visible {
  outline: 2px solid var(--ml-accent);
  outline-offset: 1px;
}

/* Floating surfaces portal here; they must stack above the panel. */
.mlui-portal { position: relative; z-index: ${zIndex.layer + 1}; }
/* Hosts pass the pointer through to the page; popups opt back in. */
.mlui-portal > * { pointer-events: auto; }

/* Scrollbars belong to the design too. */
.mlui-scroll {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--ml-track) transparent;
}
.mlui-scroll::-webkit-scrollbar { width: 8px; }
.mlui-scroll::-webkit-scrollbar-thumb {
  background: var(--ml-track);
  border-radius: 8px;
  border: 2px solid var(--ml-panel);
}

/* ---------------------------------------------------------------- panel -- */
.mlui-panel {
  position: fixed;
  z-index: ${zIndex.layer};
  display: flex;
  flex-direction: column;
  width: 360px;
  max-height: calc(100vh - 32px);
  background: var(--ml-panel);
  border-radius: ${radius.panel}px;
  box-shadow: 0 0 0 1px var(--ml-ring), var(--ml-shadow-panel);
  pointer-events: auto;
  overflow: hidden;
  transform-origin: var(--ml-panel-origin, top right);
  transition:
    opacity ${motion.panelIn}ms ${E},
    transform ${motion.panelIn}ms ${E};
}
@starting-style {
  .mlui-panel { opacity: 0; transform: scale(0.98) translateY(-2px); }
}
.mlui-panel[data-closing] {
  opacity: 0;
  transform: scale(0.985);
  transition-duration: ${motion.panelOut}ms;
}
.mlui-panel[data-dock="right"] {
  top: 0 !important;
  right: 0 !important;
  left: auto !important;
  bottom: 0;
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
  box-shadow: -1px 0 0 var(--ml-ring), -12px 0 32px -16px rgba(0, 0, 0, 0.35);
}

.mlui-head {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 6px 0 12px;
  flex: none;
  user-select: none;
  -webkit-user-select: none;
}
.mlui-panel[data-dock="float"] .mlui-head { cursor: grab; }
.mlui-panel[data-dragging] .mlui-head { cursor: grabbing; }
.mlui-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: ${fontSize.ui}px;
  font-weight: ${fontWeight.medium};
  color: var(--ml-text);
}
.mlui-brand-mark { color: var(--ml-text); }
.mlui-head-title {
  font-size: ${fontSize.ui}px;
  font-weight: ${fontWeight.medium};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mlui-head-spacer { flex: 1; }

.mlui-body { flex: 1; min-height: 0; position: relative; }
.mlui-view {
  transition: opacity ${motion.view}ms ${E}, transform ${motion.view}ms ${E};
}
@starting-style {
  .mlui-view { opacity: 0; transform: translateY(3px); }
}

.mlui-foot {
  flex: none;
  border-top: 1px solid var(--ml-separator);
  background: var(--ml-panel);
}

/* -------------------------------------------------------------- sections -- */
.mlui-section { padding: 12px 12px 14px; }
.mlui-section + .mlui-section { border-top: 1px solid var(--ml-separator); }
.mlui-section-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 20px;
  margin-bottom: 8px;
}
.mlui-section-label {
  font-size: ${fontSize.label}px;
  font-weight: ${fontWeight.medium};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ml-faint);
}
.mlui-section-aside { margin-left: auto; display: flex; align-items: center; gap: 2px; }
.mlui-subhead {
  font-size: ${fontSize.meta}px;
  color: var(--ml-muted);
  margin: 12px 0 6px;
}

.mlui-stack { display: flex; flex-direction: column; }
.mlui-gap-1 { gap: 4px; }
.mlui-gap-2 { gap: 8px; }
.mlui-gap-3 { gap: 12px; }
.mlui-hstack { display: flex; align-items: center; gap: 8px; }
.mlui-grow { flex: 1; min-width: 0; }

.mlui-name {
  font-size: ${fontSize.name}px;
  font-weight: ${fontWeight.medium};
  color: var(--ml-text);
  line-height: 1.3;
}
.mlui-meta { font-size: ${fontSize.meta}px; color: var(--ml-muted); }
.mlui-faint { color: var(--ml-faint); }
.mlui-mono { font-family: var(--ml-mono); font-size: ${fontSize.meta}px; letter-spacing: -0.01em; }
.mlui-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mlui-num { font-variant-numeric: tabular-nums; }

/* breadcrumb: the name line, ancestors muted */
.mlui-crumbs {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 5px;
  font-size: ${fontSize.name}px;
  line-height: 1.35;
}
.mlui-crumb {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  color: var(--ml-muted);
  border-radius: 3px;
  transition: color ${motion.hover}ms ease;
}
.mlui-crumb[data-current] { color: var(--ml-text); font-weight: ${fontWeight.medium}; cursor: default; }
.mlui-crumb-sep { color: var(--ml-faint); }
@media (hover: hover) and (pointer: fine) {
  .mlui-crumb:not([data-current]):hover { color: var(--ml-text); }
}

/* ---------------------------------------------------------------- buttons -- */
.mlui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: ${radius.control}px;
  font-size: ${fontSize.ui}px;
  font-weight: ${fontWeight.medium};
  white-space: nowrap;
  cursor: pointer;
  background: var(--ml-raised);
  color: var(--ml-text);
  transition:
    transform ${motion.press}ms ${E},
    background-color ${motion.hover}ms ease,
    color ${motion.hover}ms ease,
    opacity ${motion.hover}ms ease;
}
.mlui-btn:active:not(:disabled) { transform: scale(0.97); }
.mlui-btn:disabled { opacity: 0.4; cursor: default; }
.mlui-btn[data-variant="primary"] { background: var(--ml-inverse); color: var(--ml-inverse-text); }
.mlui-btn[data-variant="ghost"] { background: transparent; color: var(--ml-muted); }
.mlui-btn[data-size="sm"] { height: 24px; padding: 0 8px; font-size: ${fontSize.meta}px; }
.mlui-btn[data-block] { width: 100%; }
@media (hover: hover) and (pointer: fine) {
  .mlui-btn:hover:not(:disabled) { background: var(--ml-active); }
  .mlui-btn[data-variant="primary"]:hover:not(:disabled) { background: var(--ml-inverse); opacity: 0.88; }
  .mlui-btn[data-variant="ghost"]:hover:not(:disabled) { background: var(--ml-hover); color: var(--ml-text); }
}

.mlui-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: ${radius.control}px;
  background: transparent;
  color: var(--ml-muted);
  cursor: pointer;
  transition:
    transform ${motion.press}ms ${E},
    background-color ${motion.hover}ms ease,
    color ${motion.hover}ms ease;
}
.mlui-icon-btn[data-size="sm"] { width: 22px; height: 22px; }
.mlui-icon-btn:active:not(:disabled) { transform: scale(0.94); }
.mlui-icon-btn:disabled { opacity: 0.35; cursor: default; }
.mlui-icon-btn[data-active] { color: var(--ml-accent); background: var(--ml-accent-soft); }
.mlui-icon-btn[data-popup-open] { background: var(--ml-active); color: var(--ml-text); }
@media (hover: hover) and (pointer: fine) {
  .mlui-icon-btn:hover:not(:disabled):not([data-active]) { background: var(--ml-hover); color: var(--ml-text); }
}
.mlui-icon-btn-text {
  width: auto;
  min-width: 28px;
  padding: 0 6px;
  font-size: ${fontSize.meta}px;
  font-weight: ${fontWeight.medium};
  font-variant-numeric: tabular-nums;
}

.mlui-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 4px;
  font-family: var(--ml-font);
  font-size: 11px;
  font-weight: ${fontWeight.medium};
  color: var(--ml-muted);
  background: var(--ml-active);
}
.mlui-kbds { display: inline-flex; gap: 3px; }

/* ----------------------------------------------------- floating surfaces -- */
.mlui-tooltip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 7px;
  border-radius: 6px;
  background: var(--ml-raised);
  color: var(--ml-text);
  font-size: ${fontSize.meta}px;
  box-shadow: 0 0 0 1px var(--ml-ring), var(--ml-shadow-popover);
  transform-origin: var(--transform-origin);
  transition: opacity ${motion.tooltip}ms ${E}, transform ${motion.tooltip}ms ${E};
}
.mlui-tooltip[data-starting-style],
.mlui-tooltip[data-ending-style] { opacity: 0; transform: scale(0.97); }
.mlui-tooltip[data-instant] { transition-duration: 0ms; }

.mlui-popup {
  min-width: 180px;
  padding: 4px;
  border-radius: ${radius.popover}px;
  background: var(--ml-panel);
  color: var(--ml-text);
  box-shadow: 0 0 0 1px var(--ml-ring), var(--ml-shadow-popover);
  transform-origin: var(--transform-origin);
  transition: opacity ${motion.popover}ms ${E}, transform ${motion.popover}ms ${E};
  outline: none;
}
.mlui-popup[data-starting-style],
.mlui-popup[data-ending-style] { opacity: 0; transform: scale(0.97); }
.mlui-popup[data-ending-style] { transition-duration: 100ms; }

.mlui-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 28px;
  padding: 0 8px;
  border-radius: ${radius.control}px;
  font-size: ${fontSize.ui}px;
  color: var(--ml-text);
  cursor: default;
  user-select: none;
  outline: none;
}
.mlui-menu-item[data-highlighted] { background: var(--ml-hover); }
.mlui-menu-item[data-disabled] { opacity: 0.4; }
.mlui-menu-item-icon { color: var(--ml-muted); width: 14px; display: flex; justify-content: center; }
.mlui-menu-item-hint { margin-left: auto; color: var(--ml-faint); font-size: ${fontSize.meta}px; }
.mlui-menu-sep { height: 1px; margin: 4px 0; background: var(--ml-separator); }
.mlui-menu-label {
  padding: 6px 8px 4px;
  font-size: ${fontSize.label}px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ml-faint);
}

/* --------------------------------------------------------- parameter row -- */
.mlui-param { display: flex; flex-direction: column; gap: 2px; }
.mlui-param + .mlui-param { margin-top: 6px; }
.mlui-param-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
}
.mlui-param-label { font-size: ${fontSize.ui}px; color: var(--ml-muted); }

/* A number you can drag, click to type, and step with the arrow keys. */
.mlui-number {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 44px;
  height: 22px;
  padding: 0 6px;
  border: 0;
  border-radius: ${radius.input}px;
  background: transparent;
  color: var(--ml-text);
  font-size: ${fontSize.ui}px;
  font-weight: ${fontWeight.medium};
  font-variant-numeric: tabular-nums;
  text-align: right;
  cursor: ew-resize;
  transition: background-color ${motion.hover}ms ease;
  touch-action: none;
}
.mlui-number[data-scrubbing] { background: var(--ml-active); }
.mlui-number-unit { margin-left: 2px; color: var(--ml-faint); font-weight: ${fontWeight.regular}; }
@media (hover: hover) and (pointer: fine) {
  .mlui-number:hover { background: var(--ml-hover); }
}
.mlui-number-input {
  width: 64px;
  height: 22px;
  padding: 0 6px;
  border: 0;
  border-radius: ${radius.input}px;
  background: var(--ml-raised);
  box-shadow: inset 0 0 0 1px var(--ml-accent);
  color: var(--ml-text);
  font: inherit;
  font-size: ${fontSize.ui}px;
  font-weight: ${fontWeight.medium};
  font-variant-numeric: tabular-nums;
  text-align: right;
  caret-color: var(--ml-accent);
}
.mlui-number-input:focus-visible { outline: none; }

/* The slider is drawn thin and hit generously: a 2px track inside a 20px target. */
.mlui-slider {
  position: relative;
  height: 20px;
  cursor: pointer;
  touch-action: none;
  user-select: none;
}
.mlui-slider-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 9px;
  height: 2px;
  border-radius: 2px;
  background: var(--ml-track);
  overflow: hidden;
}
.mlui-slider-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--ml-fill);
  transform-origin: left center;
}
.mlui-slider-thumb {
  position: absolute;
  top: 4px;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 50%;
  background: var(--ml-inverse);
  box-shadow: 0 0 0 3px var(--ml-panel), 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: transform ${motion.press}ms ${E};
  pointer-events: none;
}
.mlui-slider[data-dragging] .mlui-slider-thumb { transform: scale(1.15); }
.mlui-slider:focus-visible { outline: none; }
.mlui-slider:focus-visible .mlui-slider-thumb {
  box-shadow: 0 0 0 3px var(--ml-panel), 0 0 0 5px var(--ml-accent);
}
@media (hover: hover) and (pointer: fine) {
  .mlui-slider:hover .mlui-slider-track { background: var(--ml-active); }
  .mlui-slider:hover .mlui-slider-thumb { transform: scale(1.1); }
}

/* ------------------------------------------------- segmented / chips etc -- */
.mlui-seg {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  border-radius: ${radius.input}px;
  background: var(--ml-sunken);
  box-shadow: inset 0 0 0 1px var(--ml-separator);
}
.mlui-seg[data-block] { display: flex; }
.mlui-seg-item {
  flex: 1;
  height: 22px;
  padding: 0 9px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--ml-muted);
  font-size: ${fontSize.meta}px;
  font-weight: ${fontWeight.medium};
  white-space: nowrap;
  cursor: pointer;
  transition: background-color ${motion.hover}ms ease, color ${motion.hover}ms ease;
}
.mlui-seg-item[aria-checked="true"] {
  background: var(--ml-raised);
  color: var(--ml-text);
  box-shadow: 0 0 0 1px var(--ml-ring), 0 1px 1px rgba(0, 0, 0, 0.12);
}
@media (hover: hover) and (pointer: fine) {
  .mlui-seg-item[aria-checked="false"]:hover { color: var(--ml-text); }
}

.mlui-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.mlui-chip {
  height: 22px;
  padding: 0 9px;
  border: 0;
  border-radius: 999px;
  background: var(--ml-raised);
  color: var(--ml-muted);
  font-size: ${fontSize.meta}px;
  font-weight: ${fontWeight.medium};
  cursor: pointer;
  transition:
    transform ${motion.press}ms ${E},
    background-color ${motion.hover}ms ease,
    color ${motion.hover}ms ease;
}
.mlui-chip:active { transform: scale(0.96); }
.mlui-chip[aria-pressed="true"] { background: var(--ml-accent-soft); color: var(--ml-accent); }
@media (hover: hover) and (pointer: fine) {
  .mlui-chip[aria-pressed="false"]:hover { color: var(--ml-text); background: var(--ml-active); }
}

.mlui-switch {
  position: relative;
  width: 26px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--ml-track);
  cursor: pointer;
  transition: background-color ${motion.hover}ms ease;
}
.mlui-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--ml-panel);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform ${motion.popover}ms ${E};
}
.mlui-switch[aria-checked="true"] { background: var(--ml-accent); }
.mlui-switch[aria-checked="true"]::after { transform: translateX(10px); background: #fff; }

/* A label/value line. */
.mlui-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
}
.mlui-row-label { color: var(--ml-muted); }

/* From → To editing for one animated property. */
.mlui-prop {
  display: grid;
  grid-template-columns: 1fr auto 12px auto;
  align-items: center;
  gap: 2px;
  min-height: 26px;
}
.mlui-prop-arrow { color: var(--ml-faint); display: flex; justify-content: center; }

/* ------------------------------------------------------- interaction row -- */
.mlui-ix-list { display: flex; flex-direction: column; margin: 0 -6px; }
.mlui-ix {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  column-gap: 8px;
  row-gap: 1px;
  padding: 7px 6px;
  border: 0;
  border-radius: ${radius.input}px;
  background: transparent;
  color: var(--ml-text);
  text-align: left;
  cursor: pointer;
  transition: background-color ${motion.hover}ms ease;
}
.mlui-ix[aria-current="true"] { background: var(--ml-selected); }
.mlui-ix-title { font-size: ${fontSize.ui}px; color: var(--ml-text); min-width: 0; }
.mlui-ix-duration { font-size: ${fontSize.meta}px; color: var(--ml-muted); text-align: right; }
.mlui-ix-meta { font-size: ${fontSize.meta}px; color: var(--ml-faint); min-width: 0; }
.mlui-ix-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0; margin: -4px -2px -4px 0; }
.mlui-ix-reveal { opacity: 0; transition: opacity ${motion.hover}ms ease; }
.mlui-ix:focus-within .mlui-ix-reveal,
.mlui-ix[aria-current="true"] .mlui-ix-reveal { opacity: 1; }
@media (hover: hover) and (pointer: fine) {
  .mlui-ix:hover { background: var(--ml-hover); }
  .mlui-ix[aria-current="true"]:hover { background: var(--ml-selected); }
  .mlui-ix:hover .mlui-ix-reveal { opacity: 1; }
}
@media (hover: none) { .mlui-ix-reveal { opacity: 1; } }

.mlui-add {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  margin: 2px -6px 0;
  padding: 0 6px;
  border: 0;
  border-radius: ${radius.input}px;
  background: transparent;
  color: var(--ml-muted);
  font-size: ${fontSize.ui}px;
  cursor: pointer;
  transition: background-color ${motion.hover}ms ease, color ${motion.hover}ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .mlui-add:hover { background: var(--ml-hover); color: var(--ml-text); }
}

.mlui-disclosure {
  display: flex;
  transform: rotate(-90deg);
  transition: transform ${motion.popover}ms ${E};
}
.mlui-disclosure[data-open] { transform: rotate(0deg); }

/* ---------------------------------------------------------------- status -- */
.mlui-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ml-faint); flex: none; }
.mlui-dot[data-tone="success"] { background: var(--ml-success); }
.mlui-dot[data-tone="accent"] { background: var(--ml-accent); }
.mlui-dot[data-tone="record"] { background: var(--ml-record); }
.mlui-dot[data-tone="warning"] { background: var(--ml-warning); }
.mlui-dot[data-pulse] { animation: mlui-pulse 1.4s ease-in-out infinite; }
@keyframes mlui-pulse { 50% { opacity: 0.35; } }

.mlui-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--ml-raised);
  color: var(--ml-muted);
  font-size: 11px;
  font-weight: ${fontWeight.medium};
}

/* --------------------------------------------------------------- timeline -- */
.mlui-tl { position: relative; padding-top: 2px; }
.mlui-tl-ruler {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--ml-faint);
  font-variant-numeric: tabular-nums;
  margin-bottom: 4px;
}
.mlui-tl-lanes { position: relative; display: flex; flex-direction: column; gap: 5px; }
.mlui-tl-lane { display: grid; grid-template-columns: 58px 1fr; align-items: center; gap: 8px; }
.mlui-tl-name { font-size: 11px; color: var(--ml-muted); }
.mlui-tl-bar-wrap { position: relative; height: 4px; border-radius: 2px; background: var(--ml-sunken); }
.mlui-tl-bar { position: absolute; top: 0; bottom: 0; border-radius: 2px; background: var(--ml-fill); opacity: 0.85; }
.mlui-tl-head {
  position: absolute;
  top: -2px;
  bottom: -2px;
  left: 66px;
  width: 1px;
  background: var(--ml-accent);
  opacity: 0;
  pointer-events: none;
  will-change: transform;
}
.mlui-tl[data-playing] .mlui-tl-head { opacity: 1; }

.mlui-curve { display: block; width: 100%; height: auto; }
.mlui-curve-grid { stroke: var(--ml-separator); stroke-width: 1; fill: none; }
.mlui-curve-rest { stroke: var(--ml-track); stroke-width: 1; stroke-dasharray: 2 3; fill: none; }
.mlui-curve-a { stroke: var(--ml-muted); stroke-width: 1.5; fill: none; stroke-dasharray: 3 3; }
.mlui-curve-b { stroke: var(--ml-text); stroke-width: 1.75; fill: none; }
.mlui-curve-head { stroke: var(--ml-accent); stroke-width: 1; }

/* --------------------------------------------------------- command menu -- */
.mlui-cmd-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  justify-content: center;
  padding: 8px;
  background: var(--ml-backdrop);
}
.mlui-cmd {
  width: 100%;
  align-self: flex-start;
  border-radius: ${radius.popover}px;
  background: var(--ml-panel);
  box-shadow: 0 0 0 1px var(--ml-ring), var(--ml-shadow-popover);
  overflow: hidden;
}
.mlui-cmd [cmdk-input] {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 0;
  border-bottom: 1px solid var(--ml-separator);
  background: transparent;
  color: var(--ml-text);
  font: inherit;
  font-size: ${fontSize.name}px;
  caret-color: var(--ml-accent);
}
.mlui-cmd [cmdk-input]::placeholder { color: var(--ml-faint); }
.mlui-cmd [cmdk-input]:focus-visible { outline: none; }
.mlui-cmd [cmdk-list] { max-height: 280px; overflow-y: auto; padding: 4px; scrollbar-width: thin; }
.mlui-cmd [cmdk-item] {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 8px;
  border-radius: ${radius.control}px;
  color: var(--ml-text);
  cursor: default;
  user-select: none;
}
.mlui-cmd [cmdk-item][data-selected="true"] { background: var(--ml-hover); }
.mlui-cmd [cmdk-item][data-disabled="true"] { opacity: 0.4; }
.mlui-cmd [cmdk-group-heading] {
  padding: 8px 8px 4px;
  font-size: ${fontSize.label}px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ml-faint);
}
.mlui-cmd [cmdk-empty] { padding: 16px 8px; color: var(--ml-muted); text-align: center; }

/* ------------------------------------------------------------ misc views -- */
.mlui-empty { padding: 28px 16px 24px; text-align: center; }
.mlui-empty-title { font-size: ${fontSize.name}px; font-weight: ${fontWeight.medium}; color: var(--ml-text); }
.mlui-empty-body {
  margin: 6px auto 16px;
  max-width: 240px;
  font-size: ${fontSize.ui}px;
  line-height: 1.5;
  color: var(--ml-muted);
  text-wrap: balance;
}

.mlui-code {
  margin: 0;
  padding: 10px 12px;
  border-radius: ${radius.input}px;
  background: var(--ml-sunken);
  box-shadow: inset 0 0 0 1px var(--ml-separator);
  color: var(--ml-text);
  font-family: var(--ml-mono);
  font-size: ${fontSize.meta}px;
  line-height: 1.6;
  white-space: pre;
  overflow-x: auto;
  scrollbar-width: thin;
}
.mlui-note { font-size: ${fontSize.meta}px; line-height: 1.5; color: var(--ml-muted); text-wrap: pretty; }

.mlui-toast {
  position: absolute;
  left: 50%;
  bottom: 12px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--ml-inverse);
  color: var(--ml-inverse-text);
  font-size: ${fontSize.meta}px;
  font-weight: ${fontWeight.medium};
  transform: translateX(-50%);
  pointer-events: none;
  transition: opacity 160ms ${E}, transform 160ms ${E};
}
@starting-style {
  .mlui-toast { opacity: 0; transform: translateX(-50%) translateY(4px); }
}

.mlui-launcher {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: ${zIndex.layer};
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 11px 0 9px;
  border: 0;
  border-radius: 8px;
  background: var(--ml-panel);
  color: var(--ml-text);
  font-size: ${fontSize.ui}px;
  font-weight: ${fontWeight.medium};
  box-shadow: 0 0 0 1px var(--ml-ring), var(--ml-shadow-popover);
  cursor: pointer;
  pointer-events: auto;
  transition: transform ${motion.press}ms ${E}, opacity ${motion.panelOut}ms ${E};
}
.mlui-launcher:active { transform: scale(0.97); }

/* -------------------------------------------------------- picker overlay -- */
.mlui-pick { position: fixed; inset: 0; pointer-events: none; z-index: ${zIndex.layer}; }
.mlui-pick-box,
.mlui-pick-label { position: absolute; left: 0; top: 0; opacity: 0; will-change: transform; }
.mlui-pick[data-active] .mlui-pick-box,
.mlui-pick[data-active] .mlui-pick-label { opacity: 1; }
.mlui-pick-box {
  box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--ml-accent) 85%, transparent);
  background: color-mix(in srgb, var(--ml-accent) 5%, transparent);
}
.mlui-pick-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  height: 24px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--ml-panel);
  box-shadow: 0 0 0 1px var(--ml-ring), var(--ml-shadow-popover);
  white-space: nowrap;
}
.mlui-pick-name { font-size: ${fontSize.ui}px; font-weight: ${fontWeight.medium}; color: var(--ml-text); }
.mlui-pick-size { font-size: ${fontSize.meta}px; color: var(--ml-muted); font-variant-numeric: tabular-nums; }
.mlui-pick-hint {
  position: absolute;
  left: 50%;
  top: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--ml-panel);
  box-shadow: 0 0 0 1px var(--ml-ring), var(--ml-shadow-popover);
  color: var(--ml-muted);
  font-size: ${fontSize.ui}px;
  transform: translateX(-50%);
}
.mlui-pick-hint > span:first-child { color: var(--ml-text); font-weight: ${fontWeight.medium}; }
.mlui-pick-hint-sep { width: 1px; height: 12px; margin: 0 4px; background: var(--ml-separator); }

/* ----------------------------------------------------------------- stage -- */
.mlui-stage { position: fixed; inset: 0; pointer-events: none; z-index: ${zIndex.layer - 1}; }
.mlui-stage-slot { position: fixed; left: 0; top: 0; }
.mlui-stage-tag {
  position: absolute;
  left: 0;
  bottom: calc(100% + 6px);
  display: flex;
  align-items: baseline;
  gap: 6px;
  height: 20px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--ml-panel);
  box-shadow: 0 0 0 1px var(--ml-ring), var(--ml-shadow-popover);
  font-size: ${fontSize.meta}px;
  white-space: nowrap;
}
.mlui-stage-tag b { font-weight: ${fontWeight.semibold}; color: var(--ml-text); }
.mlui-stage-tag span { color: var(--ml-muted); }

/* MotionLab's own decoration respects the OS preference; the inspected
   component's animation stays under the developer's control. Fades remain,
   movement goes. */
@media (prefers-reduced-motion: reduce) {
  .mlui-panel,
  .mlui-view,
  .mlui-tooltip,
  .mlui-popup,
  .mlui-toast { transform: none !important; }
  @starting-style {
    .mlui-panel, .mlui-view { transform: none; }
    .mlui-toast { transform: translateX(-50%); }
  }
  .mlui-toast { transform: translateX(-50%) !important; }
  .mlui-btn:active, .mlui-icon-btn:active, .mlui-chip:active, .mlui-launcher:active { transform: none; }
  .mlui-dot[data-pulse] { animation: none; }
  .mlui-switch::after, .mlui-slider-thumb, .mlui-disclosure { transition: none; }
}
`;

const injected = new WeakSet<object>();

/** Inject the stylesheet into a document or shadow root, once per root. */
export function injectUiStyles(root?: Document | ShadowRoot): void {
  if (typeof document === "undefined") return;
  const target = root ?? document;
  if (injected.has(target)) return;
  const container = target instanceof Document ? target.head : target;
  if (!container) return;
  if (target instanceof Document && target.getElementById("motionlab-ui-styles")) {
    injected.add(target);
    return;
  }
  const style = document.createElement("style");
  style.id = "motionlab-ui-styles";
  style.textContent = UI_CSS;
  container.appendChild(style);
  injected.add(target);
}

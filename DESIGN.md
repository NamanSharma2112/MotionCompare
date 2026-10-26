# MotionLab design system

The instrument's visual language, as built in `packages/ui`. Source of truth for values is `packages/ui/src/tokens.ts`; this file records the decisions behind them.

## Direction

A precision developer instrument: DialKit-like restraint with DevTools density. The inspected component is always the most important thing on screen; MotionLab recedes. Hierarchy comes from typography and single hairline separators, never from boxes around boxes.

## Tokens

| Group | Values |
| --- | --- |
| Spacing | 4px grid: 4, 8, 12, 16, 20, 24 |
| Radius | control 5 · input 6 · popover 8 · panel 10. Pills only for presets, status and toasts |
| Type | System UI stack. 11 label (uppercase, +0.06em) · 11 meta · 12 UI · 13 name. Weights 400/500, 600 only for A/B identifiers. Monospace only for selectors and code. Tabular numerals everywhere. 11px is the floor |
| Surfaces | panel → raised → hover → active, small steps. Dark `#161618` / `#202023`; light `#fcfcfd` / `#f1f1f3` |
| Text | text / muted / faint, all ≥4.5:1 on the panel in both themes |
| Accent | One blue (`#64a0ff` dark, `#2a6ae0` light), used only for selected, active and focus. Record red, success green, warning amber carry state and nothing else |
| Primary action | Inverted neutral, not accent: accent means state, not importance |
| Elevation | Floating panel, popovers and launcher get a ring plus a soft offset shadow. Nothing else casts one |

## Motion (MotionLab's own UI)

Strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for everything that enters.

| Element | Motion |
| --- | --- |
| Panel open / close | opacity + scale(0.98) from top-right, 180ms / 120ms |
| View change | opacity + 3px rise on the incoming view, 140ms |
| Popover / menu | opacity + scale(0.97) from `--transform-origin`, 160ms in, 100ms out |
| Tooltip | 125ms; 450ms delay first, then instant between neighbours |
| Press | scale(0.97), 140ms |
| ⌘K | none — keyboard-opened, used constantly |
| Picker outline | none — follows the pointer instantly |

Hover effects are gated to fine pointers. `prefers-reduced-motion` keeps fades and removes movement, scale, the recording pulse and the disclosure rotation. The inspected component's animation is never affected.

## Components

`Button`, `IconButton` (with tooltip + shortcut), `Tooltip`, `Kbd`, `NumberField` (drag to scrub, click to type, arrows, Shift ×10, Alt ÷10), `Slider` (2px track, 20px hit area, keyboard), `Parameter`, `SegmentedControl` (radiogroup with roving focus), `Switch`, `ChipGroup`, `Section`, `InspectorRow`, `PropertyRow`, `InteractionRow`, `Menu`/`MenuItem`/`MenuRadio`, `Popover`, `CommandMenu`, `MiniTimeline`, `CurvePlot`, `Badge`/`StatusDot`, `useToast`, `EmptyState`. Floating parts are Base UI, the command menu is cmdk, icons are lucide at 1.5px stroke.

## Rules

- No card around a section. A tiny label and one hairline separate regions.
- No eyebrow above a heading; section labels are the headings.
- Controls show only for what is being manipulated: spring → stiffness, damping, mass; easing → curve, duration, delay; values → only the properties that move.
- Every change applies immediately. Committing a gesture replays the motion; there is no Apply.
- Every surface renders inside a shadow root (extension, in-app devtools) so host CSS cannot reach it.

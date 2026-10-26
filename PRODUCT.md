# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Front-end developers and design engineers who build UI and care how its motion feels. They are inside a working session: their own app on a dev or preview deployment, or someone else's site they are studying. The job is to take one real component, compare two motion configurations on it, tune until one clearly feels better, and copy the result back into code.

## Product Purpose

MotionLab lets a developer select a real component, compare motion configurations side by side, tune them by direct manipulation, choose the one that feels best, and copy the configuration into their code. Success is a developer going from "this feels off" to a pasted `transition={{ ... }}` in under a minute, without leaving the page they were looking at.

## Positioning

The comparison runs on the real thing in its real place: the developer's actual React component (two independent instances, inheriting the app's context) or a clone of the actual element on any website, replayed where it lives. One engine drives both, so a spring tuned in the in-app devtools behaves identically in the extension.

## Operating Context

- Chromium extension: a tiny popup activates an in-page inspector panel on the current tab. Generic DOM mode on any site; native mode when the page runs the MotionLab SDK.
- React SDK: `<MotionLabProvider>`, `<MotionLabTarget>`, `<MotionLabDevtools>` in the developer's own app, development builds by default, `?motionlab` on an explicitly opted-in preview deployment.
- Workflow: Select → Interact (capture) → Compare → Tune → Choose → Copy.
- Used repeatedly during a session; keyboard-heavy (Space replay, A/B choose, S swap, Esc close, ⌘K commands).

## Capabilities and Constraints

- Shared framework-independent core (`@motionlab/core`): experiments, A/B variants, spring and easing models, synchronized playback, presets (Smooth, Snappy, Gentle, Bouncy, Heavy), Motion/JSON/CSS export, local persistence.
- DOM mode reads CSS transitions, CSS animations and the Web Animations API. It does not claim to understand arbitrary JavaScript animation libraries.
- The inspected page must be left unchanged; any temporary change is restored.
- No backend, accounts, analytics or cloud storage. Everything is local.
- MotionLab must never appear to normal users; production activation requires explicit developer opt-in.
- Chromium only for the extension.

## Brand Commitments

- Name: MotionLab.
- Binding direction from the brief: a precision developer instrument, DialKit-like restraint with DevTools density. "The website is the canvas. MotionLab is the instrument." Not a SaaS dashboard, not glassmorphism, not gradient-heavy, not a card-in-card layout.
- DialKit is the low-level tuning layer; MotionLab is selection, comparison, workflow and export.

## Evidence on Hand

No testimonials, metrics or customers exist. Demo components in `apps/playground` and `examples/nextjs` are illustrative.

## Product Principles

1. The inspected component is more important than MotionLab.
2. Direct manipulation over forms: change a value, feel the result, no Apply step.
3. Show only the controls for the thing being manipulated.
4. One engine, one instrument, every surface.
5. MotionLab's own motion demonstrates the quality it helps others reach, and stays out of the way.

## Accessibility & Inclusion

Full keyboard operation, visible focus, WCAG AA contrast in light and dark, and `prefers-reduced-motion` respected for MotionLab's own interface (the inspected animation stays developer-controlled).

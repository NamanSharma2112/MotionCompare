---
name: motionlab
description: Set up MotionLab on a React/Next.js component so the developer can compare two motion configurations (A/B) on the real component, tune springs and easing visually, and choose one — then apply the chosen values to the code. Use when the user wants to tune, compare, A/B test or "feel out" an animation or transition, mentions MotionLab, or says "apply my MotionLab decisions".
---

# MotionLab

MotionLab lets a developer compare two motion configurations on their **real** component, tune them with sliders, choose one, and hand the result back to you. You do two jobs:

1. **Set up** a component for comparison.
2. **Apply** the decisions the developer saved.

Never guess motion values yourself when the developer is using MotionLab — their saved decision is the source of truth.

## Job 1 — Set up a component

Do these once per project (skip any already present), then once per component.

**1. Install**

```bash
npm install motionlab
```

**2. Add the provider and devtools** to the root layout, through a client component (App Router: functions cannot cross the server/client boundary).

```tsx
// app/motionlab.tsx
"use client";
import { MotionLabDevtools, MotionLabProvider } from "motionlab";

export function MotionLab({ children }: { children: React.ReactNode }) {
  return (
    <MotionLabProvider>
      {children}
      <MotionLabDevtools />
    </MotionLabProvider>
  );
}
```

Wrap `{children}` in `app/layout.tsx` with `<MotionLab>`. It renders nothing in production unless explicitly enabled.

**3. Add the decisions route** so "Send to AI" can save into the project:

```ts
// app/api/motionlab/route.ts
import { createMotionLabHandlers } from "motionlab/server";

const handlers = createMotionLabHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;
```

It only works in development and writes `motionlab/decisions.json` next to the app's `package.json` (in a monorepo, inside that app's folder).

**4. Register the component** in a `"use client"` file (create `app/motionlab-targets.tsx` if needed and render it inside the provider):

```tsx
<MotionLabTarget
  id="checkout-card"                       // stable kebab-case id
  label="Checkout Card"                    // human name
  file="components/checkout-card.tsx"      // where the motion code lives, relative to the app folder — always set this
  render={() => <CheckoutCard />}           // the real component; called once per variant
  from={{ opacity: 0, y: 20, scale: 0.96 }} // start state of the motion
  to={{ opacity: 1, y: 0, scale: 1 }}       // end state
  transition={{ type: "spring", stiffness: 280, damping: 24, mass: 1 }}
  anchor="#checkout-card"                   // optional: where it appears on the page
/>
```

- Read the component's **current** animation and copy it into `from`, `to` and `transition`, so variant A is exactly what ships today. MotionLab's transition format is `{ type: "spring", stiffness, damping, mass }` or `{ type: "easing", duration /* ms */, ease: "easeOut" | [x1, y1, x2, y2] }`.
- If the component has no animation yet, use a sensible entrance (`from={{ opacity: 0, y: 8 }} to={{ opacity: 1, y: 0 }}`) and omit `transition`.
- `anchor` is a selector for where the component is rendered on the page; add an `id` to its wrapper if needed. With it, the comparison plays in place.
- `render` must return JSX (`() => <Card />`), never call the component as a function.

**5. Tell the developer**: run the dev server, open the page, click **MotionLab** (bottom-right), pick the component. A and B play side by side; tune B, choose, and click **Send to AI**.

## Job 2 — Apply decisions

When the developer says "apply my MotionLab decisions" (or similar):

1. Read `motionlab/decisions.json` (search for it in a monorepo: `**/motionlab/decisions.json`). Handle every entry with `"status": "pending"`.
2. Open `component.file` (relative to the folder that contains `motionlab/`). If missing, find the component by `component.label` / `component.id` (or by `component.selector` on `component.url` for decisions made with the browser extension).
3. Find the motion named by `interaction` (e.g. "Enter" = the mount/entrance animation).
4. Replace its transition with the decision:
   - **Motion / Framer Motion**: use `code.motion` as the `transition` prop verbatim.
   - **CSS**: use `code.css`. For springs it is a `linear()` approximation — say so in your reply.
   - **Other libraries**: translate `transition` (spring: stiffness/damping/mass; easing: duration in ms, cubic-bezier).
   - If `keyframes.from` / `keyframes.to` differ from the code's start/end values, update those too.
5. Keep the `<MotionLabTarget>`'s `transition` prop in sync with the new values, so the next comparison starts from what now ships.
6. Set each applied entry's `"status"` to `"applied"` in `motionlab/decisions.json`.
7. Reply with one line per change: component, motion, old → new values.

Do not touch motion the decision does not name, and do not "improve" the chosen values.

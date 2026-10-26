# MotionLab

A developer tool for designing and tuning UI motion.

Take a real component and ask: *does this feel better with configuration A or B?*

```
SELECT  →  COMPARE  →  TUNE  →  CHOOSE  →  COPY  →  SHIP IT
```

MotionLab works in two environments, on **one shared engine**:

- **Your own application** — install the SDK, register real React components, open a
  development overlay that renders two live instances of the actual component.
- **Any website** — install the Chromium extension, select an element, and get the same
  A/B comparison around a clone of it.

---

## Architecture

```
                         MOTIONLAB CORE
                              │
              ┌───────────────┴───────────────┐
              │                               │
         React SDK                       Browser Extension
              │                               │
       Your application                  Any website
              │                               │
              └───────────────┬───────────────┘
                              │
                       Same comparison
                           engine
```

`@motionlab/core` is framework-independent. It understands variants, transitions,
playback, winners, presets and experiments. It does **not** know about React, the DOM,
the browser or Next.js — those belong to the adapters.

```
motionlab/
├── apps/
│   ├── playground/            The playground app (also hosts the SDK demo at /demo)
│   └── extension/             Chromium extension: background / content / popup / shared
├── packages/
│   ├── core/                  comparison · playback · transitions · presets
│   │                          exporters · serialization · persistence · bridge · types
│   ├── ui/                    design system: tokens + primitives (Base UI, cmdk, lucide)
│   ├── dialkit/               the playground's tuning controls
│   ├── react/                 provider · target · animator · hooks
│   ├── devtools/              inspector panel · in-place stage · DOM picker & recorder
│   └── motionlab/             the umbrella package developers install
└── examples/
    └── nextjs/                a real Next.js app with the SDK installed
```

The extension and the in-app devtools render the **same inspector panel**
(`packages/devtools/src/inspector`) on the same primitives (`packages/ui`) over the same
core. The playground still uses the earlier comparison layout; moving it onto
`packages/ui` is the next step. Visual decisions are recorded in [DESIGN.md](DESIGN.md),
product truth in [PRODUCT.md](PRODUCT.md).

---

## Quick start

```bash
npm install
npm run dev              # playground          → http://localhost:3000
                         # in-app SDK demo     → http://localhost:3000/demo
npm run dev:example      # example Next.js app → http://localhost:3001
npm run build:extension  # → apps/extension/dist
npm test                 # core + enablement tests
npm run typecheck        # all packages
```

---

## React SDK

```bash
npm install motionlab
```

```tsx
import { MotionLabProvider, MotionLabDevtools } from "motionlab";

<MotionLabProvider>
  <App />
  <MotionLabDevtools />
</MotionLabProvider>
```

Register the components worth tuning:

```tsx
<MotionLabTarget
  id="checkout-card"
  label="Checkout Card"
  render={() => <CheckoutCard />}
  from={{ opacity: 0, y: 20, scale: 0.96 }}
  to={{ opacity: 1, y: 0, scale: 1 }}
/>
```

That's the whole integration. `MotionLabTarget` renders **nothing** — it registers the
component so the devtools can open it. The provider adds no markup.

Two optional props make the replay feel native:

```tsx
<MotionLabTarget
  id="checkout-card"
  anchor="#checkout-card"      // where it lives on the page: replays happen right there
  interaction="Enter"           // what the declared motion is called
  ...
/>
```

Without `anchor`, the component plays in the open part of the viewport beside the panel.

### Real component isolation

`render` is called **once per variant**:

```
render()   →  Variant A instance
render()   →  Variant B instance
```

Two separate instances, each with its own state, refs, effects and context — not one
element placed twice. Increment the quantity in A and B is unaffected, which is what
makes the comparison honest for anything stateful.

The overlay is portalled to `document.body` so it cannot be clipped by your layout, but
it stays inside your React tree, so the component under test inherits your theme, design
system, localization, router and application context exactly as it would in place.

### Portals, modals and dropdowns

Each variant gets its own portal container, so two instances of the same Radix dialog
don't fight over focus traps, scroll locking and stacking order:

```tsx
<MotionLabTarget
  id="search-modal"
  render={({ portalContainer }) => (
    <Dialog.Portal container={portalContainer}>
      <SearchModal />
    </Dialog.Portal>
  )}
  from={{ opacity: 0, scale: 0.94 }}
  to={{ opacity: 1, scale: 1 }}
/>
```

Pass `portalContainer` on the target if you need a fixed one instead.

### Next.js App Router

`render` is a function, and functions cannot cross the Server → Client Component
boundary. Declare targets in a `"use client"` module:

```tsx
"use client";
export function MotionLabTargets() {
  return <MotionLabTarget id="checkout-card" render={() => <CheckoutCard />} ... />;
}
```

See `examples/nextjs/app/motionlab-targets.tsx`.

### Error isolation

Each variant is wrapped in its own error boundary. If A throws you get
`Variant A failed` in A's stage and B keeps working — a devtool must never take the
application down with it.

---

## Production safety

MotionLab is **off in production unless you explicitly turn it on.**

| Deployment | URL | MotionLab |
| --- | --- | --- |
| Development | `localhost:3000` | enabled |
| Production | `https://myapp.com` | **disabled** |
| Production | `https://myapp.com/?motionlab` | **disabled** |
| Production + `productionPreview` | `https://preview.myapp.com/?motionlab` | enabled |

```tsx
// Only on a deployment you intend to be a developer preview.
<MotionLabProvider productionPreview>
```

A query string alone is never enough: `?motionlab` does nothing unless the application
opted in. When MotionLab is disabled it renders nothing, injects no stylesheet and
exposes no page bridge. (Verified in `packages/react/test/enablement.test.ts`.)

> MotionLab is **not** safe to expose publicly. `?motionlab` is an activation flag, not
> an access control. Tokens, authentication and signed preview sessions are deliberately
> not implemented — do not treat this as authorization.

To strip the devtools from a production bundle entirely, import them dynamically:

```tsx
const MotionLabDevtools = dynamic(
  () => import("motionlab").then((m) => m.MotionLabDevtools),
  { ssr: false },
);
```

---

## Browser extension

```bash
npm run build:extension
```

Load `apps/extension/dist` at `chrome://extensions` → *Load unpacked*. Chromium only.

**Use it:** click the MotionLab toolbar icon on any page → **Inspect component** → click
an element (↑ selects its parent, Esc cancels). That's all it takes to start comparing:

```
Select → A and B appear on the page and play → tweak B → Choose B → Copy code
```

- **A and B are on the page straight away**, side by side, labelled, and play once. A is
  the element's own CSS transition when it declares one (otherwise a typical ease-out);
  B is the same pace as a spring. The motion is a default entrance (fade and small rise),
  editable under *Start and end values*.
- **One screen.** Compare (A vs B, **Replay A and B**, loop, speed, side by side or one
  after another) and Tune (presets and three dials for B) sit together. Every slider
  release or preset click replays both.
- **Recording is optional.** *Use this element's real motion* captures what the element
  actually does when you use it: CSS transitions, CSS animations and the Web Animations
  API, read every frame, with the state named from `aria-expanded`, `data-state`, `open`
  and so on ("Closed → Open"). The captured motion replaces the default entrance.
- **⌘K / Ctrl K** opens commands. Space replays, A/B choose, S swaps, Esc goes back or closes.
- The panel floats (drag its header) or docks right; light, dark or system theme.

If the page runs the MotionLab SDK, the panel lists its registered components and hands
them to the page's own devtools — real React instances, no DOM guessing.

### What it does to your page

- The element you select is never modified, except `visibility` while its stand-in
  replays, restored exactly (including a pre-existing inline value) when playback stops.
- Clones live in a shadow root with scripts, iframes and embeds stripped.
- Settings and experiments go to `chrome.storage.local`, never the site's storage.
- Closing removes the single host element; verified byte-identical `body` afterwards.
- `activeTab` only: no standing access to any site, so open it from the **toolbar icon**.

## The comparison

Every experiment has two independently configured variants. All combinations work:

```
A Spring  /  B Spring       A Spring  /  B Easing       A Easing  /  B Easing
```

Both variants are driven from **one clock**, captured on the first animation frame of a
replay. There is deliberately no per-variant `setTimeout` and no second animation loop —
that is exactly how an A/B comparison starts lying to you, because the two sides drift
and the difference you are judging is no longer only the transition. Per-variant `delay`
is honoured as an offset inside that same clock.

### Presets

`Smooth` · `Snappy` · `Gentle` · `Bouncy` · `Heavy` — the same five everywhere, in both
spring and easing flavours.

### Keyboard

| Key | Action |
| --- | --- |
| `Space` | replay |
| `A` / `B` | choose a winner |
| `S` | swap |
| `Esc` | close |

Disabled while typing in a field.

### Winner and the iterative loop

Choose a winner, then **Use B as baseline**:

```
A = old B        B = copy of old B
```

Every round starts from the best configuration found so far.

### Export

```tsx
transition={{
  type: "spring",
  stiffness: 420,
  damping: 28,
  mass: 0.8,
}}
```

Motion, JSON and CSS. For an easing transition the CSS is exact. For a spring it is not,
and the export says so: you get a `linear()` timing function sampled from the real
simulation, with a caveat explaining that CSS has no spring primitive and the result
will not respond to interruption or velocity the way a real spring does.

### Persistence

Local only — `localStorage`, no backend, no accounts, no analytics.

```
motionlab:target:checkout-card        React SDK targets
motionlab:<domain>:<element>          extension experiments
motionlab:playground:<component>      playground
```

---

## Status

Built and verified: the shared core, DialKit, the React SDK, the in-app devtools, the
playground, the Chromium extension (both modes), the example app, production-preview
gating, and 51 tests across the engine and the enablement rules.

Deliberately **not** built yet, and not blocked by anything here: the AI motion
assistant, automatic source-code patching, VS Code and Figma integration, motion history,
team presets, a public motion library, more framework adapters (Vue, Svelte, Solid), and
Firefox/Safari support.

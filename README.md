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
│   ├── dialkit/               the low-level parameter, spring, easing and timeline controls
│   ├── react/                 provider · target · animator · hooks
│   ├── devtools/              overlay · controls · target-list · comparison
│   └── motionlab/             the umbrella package developers install
└── examples/
    └── nextjs/                a real Next.js app with the SDK installed
```

**MotionLab** provides selection, comparison, workflow, experiment and export.
**DialKit** provides the parameter controls, spring controls, easing controls, physics
readouts and timeline. The playground, the in-app devtools and the extension all render
the same comparison shell over the same core, which is why they feel like one product.

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

Click the MotionLab icon on any page:

```
Extension
    ↓
Is the MotionLab SDK detected?
    │
   YES ─────────→ Native mode: the page's registered targets,
    │             compared as real React components
   NO
    ↓
Generic DOM mode: select an element, MotionLab clones it
```

**Native mode** needs no DOM guessing. The content script speaks a validated,
JSON-only protocol to the SDK over `postMessage`, asks for the registered targets, and
has the page's own devtools open the real component.

**Generic DOM mode** reads what the page actually declares — `transform`, `opacity`,
`transition-duration`, `transition-timing-function`, `animation-duration`,
`animation-timing-function`, and the Web Animations API where it is exposed. When it
finds a transition, variant A starts as *what the page does today*. MotionLab does not
try to understand arbitrary JavaScript animation libraries, and does not pretend to.

### What it does to your page

Nothing permanent, and as little as possible while running:

- The element you select is **never modified**. The hover highlight is a separate
  overlay; your elements get no outline, class or inline style.
- The comparison runs on **clones**, inside a shadow root, so neither page CSS nor
  MotionLab's CSS reaches the other.
- Scripts, iframes and embeds are stripped from the clone. MotionLab previews
  appearance and motion; it does not run the site's code.
- Closing removes one element. That is the whole of the cleanup.

The extension requests `activeTab` rather than access to every site, so it has no
standing access to anything: nothing is injected until you open the popup on the tab
you are looking at. There is no `eval`, no arbitrary script injection, and every message
crossing the page boundary is validated field by field.

> Because of `activeTab`, open the popup from the **toolbar icon**. Chrome grants access
> to the current tab only when the extension is invoked that way.

---

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
gating, and 38 tests across the engine and the enablement rules.

Deliberately **not** built yet, and not blocked by anything here: the AI motion
assistant, automatic source-code patching, VS Code and Figma integration, motion history,
team presets, a public motion library, more framework adapters (Vue, Svelte, Solid), and
Firefox/Safari support.

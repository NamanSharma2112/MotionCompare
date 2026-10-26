import { MotionLabDevtools } from "@motionlab/devtools";
import { MotionLabProvider } from "@motionlab/react";
import { CheckoutCard } from "@/components/demo-components";
import { MotionLabTargets } from "./motionlab-targets";

/**
 * A normal application page with the MotionLab SDK installed.
 *
 * Everything below renders exactly as it would without MotionLab. The provider
 * adds no markup, the targets render nothing, and the devtools are a single
 * floating launcher that only exists because this is a development build.
 */
export default function DemoPage() {
  return (
    <MotionLabProvider>
      <div className="flex min-h-screen flex-col items-center bg-zinc-100 px-6 py-16 dark:bg-zinc-950">
        <div className="w-full max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Checkout
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            This page is an ordinary product surface. The card below is the real{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              CheckoutCard
            </code>{" "}
            component. Open MotionLab from the launcher in the corner and pick{" "}
            <strong className="font-semibold text-zinc-900 dark:text-zinc-200">Checkout Card</strong>{" "}
            to compare two motion configurations of this same component.
          </p>

          <div className="mt-8 w-fit" id="checkout-card">
            <CheckoutCard />
          </div>

          <ol className="mt-10 space-y-1.5 text-xs text-zinc-500 dark:text-zinc-500">
            <li>1. Open MotionLab · 2. Select Checkout Card · 3. Replay in place</li>
            <li>4. Tune B&apos;s stiffness · 5. Compare · 6. Choose B · 7. Copy</li>
          </ol>

          <a
            href="/"
            className="mt-8 inline-block text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back to the playground
          </a>
        </div>
      </div>

      {/* Registers the real components. Renders nothing. */}
      <MotionLabTargets />

      {/* The floating launcher. Returns null unless MotionLab is enabled. */}
      <MotionLabDevtools />
    </MotionLabProvider>
  );
}

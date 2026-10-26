import { MotionLabDevtools, MotionLabProvider } from "motionlab";
import { CheckoutCard } from "@/components/checkout-card";
import { MotionLabTargets } from "./motionlab-targets";

/**
 * The whole integration.
 *
 *   npm install motionlab
 *
 * Wrap the app in the provider, register the components worth tuning, and drop
 * the devtools in. The page below renders exactly as it would without any of
 * it: the provider adds no markup and the targets render nothing.
 */
export default function Page() {
  return (
    <MotionLabProvider>
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          fontFamily: "system-ui, sans-serif",
          padding: 48,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 20, color: "#18181b" }}>Checkout</h1>
          <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#52525b" }}>
            Open MotionLab from the launcher in the corner, pick <strong>Checkout Card</strong>,
            and compare two motion configurations of this exact component.
          </p>
        </div>

        <CheckoutCard />
      </main>

      <MotionLabTargets />
      <MotionLabDevtools />
    </MotionLabProvider>
  );
}

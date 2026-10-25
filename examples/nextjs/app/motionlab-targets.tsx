"use client";

import { MotionLabTarget } from "motionlab";
import { CheckoutCard } from "@/components/checkout-card";

/**
 * Targets live in a Client Component.
 *
 * `render` is a function, and functions cannot be passed from a Server
 * Component to a Client Component — React has no way to serialize one across
 * that boundary. Declaring targets in a `"use client"` module is the idiomatic
 * fix and costs nothing: this file renders no markup at all.
 */
export function MotionLabTargets() {
  return (
    <MotionLabTarget
      id="checkout-card"
      label="Checkout Card"
      // Called once per variant, so A and B each get their own instance.
      render={() => <CheckoutCard />}
      from={{ opacity: 0, y: 20, scale: 0.96 }}
      to={{ opacity: 1, y: 0, scale: 1 }}
      stageWidth={260}
    />
  );
}

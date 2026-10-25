"use client";

import { useState } from "react";

/**
 * An ordinary application component.
 *
 * Nothing here knows about MotionLab. It holds state, it has interactive
 * controls, and it is the component that actually ships — which is exactly
 * what makes comparing motion on it worth anything.
 */
export function CheckoutCard() {
  const [quantity, setQuantity] = useState(1);
  const total = quantity * 42;

  return (
    <div
      style={{
        width: 260,
        padding: 16,
        background: "#ffffff",
        border: "1px solid #e4e4e7",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#18181b" }}>Checkout</p>
          <p style={{ margin: 0, fontSize: 12, color: "#71717a" }}>Standard shipping</p>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#047857",
            background: "#ecfdf5",
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          In stock
        </span>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "#71717a" }}>Quantity</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            style={{ width: 24, height: 24, border: "1px solid #e4e4e7", borderRadius: 4 }}
          >
            −
          </button>
          <span style={{ width: 20, textAlign: "center", fontSize: 14, color: "#18181b" }}>
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((value) => value + 1)}
            style={{ width: 24, height: 24, border: "1px solid #e4e4e7", borderRadius: 4 }}
          >
            +
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid #f4f4f5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span style={{ fontSize: 12, color: "#71717a" }}>Total</span>
        <span style={{ fontSize: 18, fontWeight: 600, color: "#18181b" }}>${total}.00</span>
      </div>

      <button
        type="button"
        style={{
          marginTop: 12,
          width: "100%",
          padding: "8px 0",
          background: "#18181b",
          color: "#ffffff",
          border: "none",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Pay ${total}.00
      </button>
    </div>
  );
}

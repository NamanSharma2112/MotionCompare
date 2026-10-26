"use client";

import { useState } from "react";

/**
 * The components the playground compares motion on.
 *
 * These are ordinary application components — stateful, interactive, nothing
 * MotionLab-aware about them. That is the point: MotionLab animates whatever
 * you give it, and the comparison is only meaningful if what is on the stage
 * is the real thing.
 */

export function CheckoutCard() {
  const [quantity, setQuantity] = useState(1);
  const unitPrice = 42;

  return (
    <div className="w-[260px] rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Checkout</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Standard shipping</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          In stock
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Quantity</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="h-6 w-6 rounded border border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            −
          </button>
          <span className="w-5 text-center text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((value) => value + 1)}
            className="h-6 w-6 rounded border border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Total</span>
        <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          ${quantity * unitPrice}.00
        </span>
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded-lg bg-zinc-900 py-2 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Pay ${quantity * unitPrice}.00
      </button>
    </div>
  );
}

export function NavbarMenu() {
  const [active, setActive] = useState("Overview");
  const items = ["Overview", "Activity", "Reports", "Settings"];

  return (
    <div className="w-[240px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setActive(item)}
          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
            active === item
              ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {item}
          {active === item ? <span aria-hidden="true">·</span> : null}
        </button>
      ))}
    </div>
  );
}

export function SearchModal() {
  const [query, setQuery] = useState("");
  const results = ["Billing settings", "Invite a teammate", "API keys", "Audit log"].filter(
    (result) => result.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="w-[300px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search…"
        className="w-full border-b border-zinc-100 px-3 py-2.5 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <div className="max-h-[132px] overflow-y-auto py-1">
        {results.length > 0 ? (
          results.map((result) => (
            <div key={result} className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              {result}
            </div>
          ))
        ) : (
          <div className="px-3 py-3 text-xs text-zinc-400">No results</div>
        )}
      </div>
    </div>
  );
}

export function Toast() {
  return (
    <div className="flex w-[280px] items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white"
      >
        ✓
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">Changes saved</p>
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
          Your motion configuration was written to the project.
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const sections = [
    { label: "Workspace", items: ["Projects", "Members"] },
    { label: "Build", items: ["Deployments", "Logs"] },
  ];

  return (
    <div className="w-[200px] rounded-xl border border-zinc-200 bg-white p-2.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      {sections.map((section) => (
        <div key={section.label} className="mb-2.5 last:mb-0">
          <p className="px-1.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
            {section.label}
          </p>
          {section.items.map((item) => (
            <div
              key={item}
              className="rounded px-1.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400"
            >
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

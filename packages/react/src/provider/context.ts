"use client";

import { createContext, useContext } from "react";
import type { MotionLabContextValue } from "../types";

export const MotionLabContext = createContext<MotionLabContextValue | null>(null);

/**
 * The provider context, or null when there is no provider.
 *
 * Returns null rather than throwing so `MotionLabTarget` can be left in a
 * component permanently and simply do nothing in a build where MotionLab was
 * tree-shaken or never mounted.
 */
export function useMotionLabContext(): MotionLabContextValue | null {
  return useContext(MotionLabContext);
}

export function useMotionLab(): MotionLabContextValue {
  const context = useContext(MotionLabContext);
  if (!context) {
    throw new Error(
      "useMotionLab must be used inside <MotionLabProvider>. Wrap your app, or use " +
        "useMotionLabContext() if the provider is genuinely optional here.",
    );
  }
  return context;
}

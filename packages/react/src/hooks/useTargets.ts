"use client";

import { useMotionLab } from "../provider/context";
import type { MotionLabTargetDefinition } from "../types";

/** Every target registered with the provider, in registration order. */
export function useTargets(): MotionLabTargetDefinition[] {
  return useMotionLab().targets;
}

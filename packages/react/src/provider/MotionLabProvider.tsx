"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createExperiment,
  createExperimentStorage,
  setVariantTransition,
  targetStorageKey,
  type Experiment,
  type StorageAdapter,
  type TransitionConfig,
  type VariantId,
} from "@motionlab/core";
import type { MotionLabContextValue, MotionLabTargetDefinition } from "../types";
import { MotionLabContext } from "./context";
import { isProductionBuild, resolveEnabled } from "./enablement";
import { createPageBridge } from "../bridge/pageBridge";

export interface MotionLabProviderProps {
  children: ReactNode;
  /** Force MotionLab on or off. Overrides every other check. */
  enabled?: boolean;
  /**
   * Allow `?motionlab` to activate the devtools in a production build. Leave
   * this off for your real production deployment and turn it on only for a
   * preview one.
   */
  productionPreview?: boolean;
  /** Replace localStorage, e.g. for tests or a sandboxed host. */
  storage?: StorageAdapter;
  /** Expose registered targets to the browser extension. Defaults to true. */
  bridge?: boolean;
}

function browserStorage(): StorageAdapter | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = "__motionlab_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch {
    // Private mode, blocked site data, or a sandboxed iframe.
    return null;
  }
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
    keys: () => {
      const keys: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key) keys.push(key);
      }
      return keys;
    },
  };
}

/**
 * The root of the MotionLab React SDK.
 *
 * Holds the target registry, the live experiment for whichever target is open,
 * local persistence, and the bridge the browser extension talks to. It renders
 * only `children` — no UI of its own, so wrapping an app with it changes
 * nothing a user can see.
 */
export function MotionLabProvider({
  children,
  enabled: enabledProp,
  productionPreview,
  storage,
  bridge = true,
}: MotionLabProviderProps) {
  // Start from the server-safe answer, then re-resolve on the client where
  // `window.location.search` is actually readable. Deciding enablement during
  // render from `window` would hydrate-mismatch.
  const [enabled, setEnabled] = useState(() =>
    resolveEnabled({
      ...(enabledProp !== undefined ? { enabled: enabledProp } : {}),
      ...(productionPreview !== undefined ? { productionPreview } : {}),
      isProduction: isProductionBuild(),
    }),
  );

  useEffect(() => {
    setEnabled(
      resolveEnabled({
        ...(enabledProp !== undefined ? { enabled: enabledProp } : {}),
        ...(productionPreview !== undefined ? { productionPreview } : {}),
        isProduction: isProductionBuild(),
        search: typeof window !== "undefined" ? window.location.search : undefined,
      }),
    );
  }, [enabledProp, productionPreview]);

  const [targets, setTargets] = useState<MotionLabTargetDefinition[]>([]);
  const [openTargetId, setOpenTargetId] = useState<string | null>(null);
  const [experiment, setExperiment] = useState<Experiment | null>(null);

  const experimentStorage = useMemo(() => {
    const adapter = storage ?? browserStorage();
    return adapter ? createExperimentStorage(adapter) : null;
  }, [storage]);

  const registerTarget = useCallback((definition: MotionLabTargetDefinition) => {
    setTargets((current) => {
      const index = current.findIndex((target) => target.id === definition.id);
      if (index === -1) return [...current, definition];
      const next = [...current];
      next[index] = definition;
      return next;
    });
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    setTargets((current) => current.filter((target) => target.id !== id));
    setOpenTargetId((current) => (current === id ? null : current));
  }, []);

  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  const getTarget = useCallback(
    (id: string) => targetsRef.current.find((target) => target.id === id),
    [],
  );

  const openTarget = useCallback(
    (id: string) => {
      const target = targetsRef.current.find((candidate) => candidate.id === id);
      if (!target) return;

      // A previously tuned experiment for this target beats a fresh one: the
      // point of persistence is that yesterday's comparison is still there.
      const saved = experimentStorage?.load(targetStorageKey(id));
      setExperiment(
        saved ?? {
          ...createExperiment({
            id,
            label: target.label,
            source: "react",
            keyframes: { from: target.from, to: target.to },
            ...(target.transition ? { variantA: { transition: target.transition } } : {}),
          }),
        },
      );
      setOpenTargetId(id);
    },
    [experimentStorage],
  );

  const closeTarget = useCallback(() => {
    setOpenTargetId(null);
    setExperiment(null);
  }, []);

  const updateExperiment = useCallback(
    (next: Experiment | ((current: Experiment) => Experiment)) => {
      setExperiment((current) => {
        if (!current) return current;
        const resolved = typeof next === "function" ? next(current) : next;
        if (resolved !== current) {
          experimentStorage?.save(targetStorageKey(resolved.id), resolved);
        }
        return resolved;
      });
    },
    [experimentStorage],
  );

  const setVariant = useCallback(
    (variant: VariantId, transition: TransitionConfig) => {
      updateExperiment((current) => setVariantTransition(current, variant, transition));
    },
    [updateExperiment],
  );

  const value = useMemo<MotionLabContextValue>(
    () => ({
      enabled,
      targets,
      registerTarget,
      unregisterTarget,
      getTarget,
      openTargetId,
      openTarget,
      closeTarget,
      experiment,
      updateExperiment,
      setVariant,
    }),
    [
      enabled,
      targets,
      registerTarget,
      unregisterTarget,
      getTarget,
      openTargetId,
      openTarget,
      closeTarget,
      experiment,
      updateExperiment,
      setVariant,
    ],
  );

  const valueRef = useRef(value);
  valueRef.current = value;

  // The extension's native mode reads targets and drives the comparison
  // through this bridge. Only installed while MotionLab is enabled, so a
  // production page exposes nothing.
  useEffect(() => {
    if (!enabled || !bridge) return;
    return createPageBridge({
      getTargets: () =>
        valueRef.current.targets.map((target) => ({
          id: target.id,
          label: target.label,
          source: "react" as const,
        })),
      getExperiment: () => valueRef.current.experiment,
      openTarget: (id) => valueRef.current.openTarget(id),
      closeTarget: () => valueRef.current.closeTarget(),
      setVariant: (variant, transition) => valueRef.current.setVariant(variant, transition),
      updateExperiment: (updater) => valueRef.current.updateExperiment(updater),
    });
  }, [enabled, bridge]);

  // Reconcile a stored experiment whose target changed its keyframes in code.
  useEffect(() => {
    if (!openTargetId || !experiment) return;
    const target = getTarget(openTargetId);
    if (!target) return;
    const stored = JSON.stringify(experiment.keyframes);
    const current = JSON.stringify({ from: target.from, to: target.to });
    if (stored !== current) {
      updateExperiment((currentExperiment) => ({
        ...currentExperiment,
        keyframes: { from: target.from, to: target.to },
      }));
    }
  }, [openTargetId, experiment, getTarget, updateExperiment]);

  return <MotionLabContext.Provider value={value}>{children}</MotionLabContext.Provider>;
}


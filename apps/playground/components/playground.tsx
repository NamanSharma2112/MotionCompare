"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createExperiment,
  createExperimentStorage,
  playgroundStorageKey,
  type Experiment,
  type StorageAdapter,
} from "@motionlab/core";
import { injectDialKitStyles } from "@motionlab/dialkit";
import { injectDevtoolsStyles, VariantStage } from "@motionlab/devtools";
import { ComparisonShell } from "@motionlab/devtools";
import type { MotionLabAnimatorHandle } from "@motionlab/react";
import type { VariantId } from "@motionlab/core";
import { PLAYGROUND_CATALOG, getPlaygroundEntry } from "./playground-catalog";

function browserStorage(): StorageAdapter | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = "__motionlab_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch {
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
 * The MotionLab playground.
 *
 * Select → Compare → Tune → Choose → Copy, on a catalog of built-in
 * components. It renders the same `ComparisonShell` the in-app devtools and
 * the browser extension render, over the same core engine — the playground is
 * a surface on the shared comparison, not a parallel implementation of it.
 */
export function Playground() {
  const [selectedId, setSelectedId] = useState<string>(PLAYGROUND_CATALOG[0]!.id);
  const [experiment, setExperiment] = useState<Experiment | null>(null);

  const storage = useMemo(() => {
    const adapter = browserStorage();
    return adapter ? createExperimentStorage(adapter) : null;
  }, []);

  useEffect(() => {
    injectDialKitStyles();
    injectDevtoolsStyles();
  }, []);

  const entry = getPlaygroundEntry(selectedId);

  // Load the saved experiment for this component, or start a fresh one.
  useEffect(() => {
    if (!entry) return;
    const saved = storage?.load(playgroundStorageKey(entry.id));
    setExperiment(
      saved ??
        createExperiment({
          id: entry.id,
          label: entry.label,
          source: "playground",
          keyframes: entry.keyframes,
        }),
    );
  }, [entry, storage]);

  const onChange = useCallback(
    (next: Experiment | ((current: Experiment) => Experiment)) => {
      setExperiment((current) => {
        if (!current) return current;
        const resolved = typeof next === "function" ? next(current) : next;
        if (resolved !== current) storage?.save(playgroundStorageKey(resolved.id), resolved);
        return resolved;
      });
    },
    [storage],
  );

  const renderStages = useCallback(
    ({
      playing,
      onTrackReady,
    }: {
      playing: boolean;
      onTrackReady(variant: VariantId, handle: MotionLabAnimatorHandle | null): void;
    }) => {
      if (!experiment || !entry) return null;
      return (
        <>
          {(["A", "B"] as const).map((variant) => (
            <VariantStage
              key={variant}
              experiment={experiment}
              variant={variant}
              playing={playing}
              // Called once per stage, so each side mounts its own instance.
              render={() => entry.render()}
              onTrackReady={onTrackReady}
              stageWidth={entry.stageWidth}
            />
          ))}
        </>
      );
    },
    [experiment, entry],
  );

  return (
    <div className="ml dk flex min-h-screen flex-col gap-5 bg-zinc-950 px-5 py-6 lg:flex-row lg:px-8">
      <aside className="w-full flex-none lg:w-[260px]">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-sm font-bold text-zinc-50">
            <span className="ml-launcher-dot" aria-hidden="true" />
            MotionLab
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            Select a component, compare two motion configurations, tune them, choose the one that
            feels right, and copy it into your code.
          </p>
        </header>

        <p className="dk-label mb-1.5">Select</p>
        <div className="flex flex-col gap-1">
          {PLAYGROUND_CATALOG.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className="ml-target"
              data-open={candidate.id === selectedId}
              onClick={() => setSelectedId(candidate.id)}
            >
              <span className="ml-target-dot" aria-hidden="true" />
              <span>{candidate.label}</span>
            </button>
          ))}
        </div>

        {entry ? <p className="dk-hint mt-3 leading-relaxed">{entry.description}</p> : null}

        <nav className="mt-6 flex flex-col gap-1.5 border-t border-zinc-800 pt-4">
          <a className="dk-hint hover:text-zinc-300" href="/demo">
            → In-app devtools demo (React SDK)
          </a>
          <a
            className="dk-hint hover:text-zinc-300"
            href="https://github.com/NamanSharma2112/MotionCompare#browser-extension"
          >
            → Browser extension
          </a>
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        {experiment && entry ? (
          <ComparisonShell
            key={entry.id}
            experiment={experiment}
            onChange={onChange}
            onClose={() => {
              // Nothing to close in the playground: the comparison *is* the page.
              // Reset instead, which is the useful equivalent here.
              onChange(() =>
                createExperiment({
                  id: entry.id,
                  label: entry.label,
                  source: "playground",
                  keyframes: entry.keyframes,
                }),
              );
            }}
            mode="playground"
            closeLabel="Reset experiment"
            renderStages={renderStages}
          />
        ) : null}
      </main>
    </div>
  );
}

import { StrictMode, useCallback, useMemo, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createExperimentStorage,
  domStorageKey,
  type Experiment,
  type StorageAdapter,
  type VariantId,
} from "@motionlab/core";
import { injectDialKitStyles } from "@motionlab/dialkit";
import { DomComparison, injectDevtoolsStyles } from "@motionlab/devtools";
import { cloneForStage } from "./clone";

function extensionStorage(): StorageAdapter {
  // Falls back to an in-memory store: a page can block site data, and losing
  // persistence is not a reason to refuse the comparison.
  const memory = new Map<string, string>();
  try {
    window.localStorage.getItem("__motionlab_probe__");
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
  } catch {
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
      keys: () => [...memory.keys()],
    };
  }
}

function StageApp({
  initialExperiment,
  element,
  selectorLabel,
  onClose,
}: {
  initialExperiment: Experiment;
  element: Element;
  selectorLabel: string;
  onClose(): void;
}) {
  const storage = useMemo(() => createExperimentStorage(extensionStorage()), []);
  const storageKey = useMemo(
    () => domStorageKey(window.location.hostname, `${selectorLabel}-${initialExperiment.id}`),
    [selectorLabel, initialExperiment.id],
  );
  const [experiment, setExperiment] = useState<Experiment>(
    () => storage.load(storageKey) ?? initialExperiment,
  );

  const onChange = useCallback(
    (next: Experiment | ((current: Experiment) => Experiment)) => {
      setExperiment((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        if (resolved !== current) storage.save(storageKey, resolved);
        return resolved;
      });
    },
    [storage, storageKey],
  );

  // One clone per variant, built on demand. Called once per stage, which is
  // the DOM equivalent of calling a React target's `render` twice.
  const createNode = useCallback((_variant: VariantId) => cloneForStage(element), [element]);

  return (
    <div className="ml dk">
      <div className="ml-overlay" role="dialog" aria-modal="true" aria-label="MotionLab comparison">
        <DomComparison
          experiment={experiment}
          createNode={createNode}
          onChange={onChange}
          onClose={onClose}
          selectorLabel={selectorLabel}
        />
      </div>
    </div>
  );
}

export interface MountedStage {
  close(): void;
}

/**
 * Mount the comparison over the page.
 *
 * Everything lives inside a shadow root on a single host element: the page's
 * CSS cannot reach MotionLab's UI, and MotionLab's CSS cannot reach the page.
 * Closing removes that one element, which is the whole of the cleanup — the
 * page was never modified in the first place.
 */
export function mountStage(options: {
  experiment: Experiment;
  element: Element;
  selectorLabel: string;
  onClosed(): void;
}): MountedStage {
  const host = document.createElement("div");
  host.setAttribute("data-motionlab-stage", "");
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483000";
  const shadow = host.attachShadow({ mode: "open" });

  injectDialKitStyles(shadow);
  injectDevtoolsStyles(shadow);

  const container = document.createElement("div");
  shadow.appendChild(container);
  document.documentElement.appendChild(host);

  let root: Root | null = createRoot(container);
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    // Unmount on a task of its own: React is mid-event when the close button
    // calls this, and tearing down the tree it is rendering throws.
    const current = root;
    root = null;
    queueMicrotask(() => {
      current?.unmount();
      host.remove();
      options.onClosed();
    });
  }

  root.render(
    <StrictMode>
      <StageApp
        initialExperiment={options.experiment}
        element={options.element}
        selectorLabel={options.selectorLabel}
        onClose={close}
      />
    </StrictMode>,
  );

  return { close };
}

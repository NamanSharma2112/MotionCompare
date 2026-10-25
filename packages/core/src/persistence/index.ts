import type { Experiment } from "../types/index";
import { deserializeExperiment, serializeExperiment } from "../serialization/index";

/**
 * The slice of a key/value store MotionLab needs. Declared as an interface so
 * the core never reaches for `localStorage` itself — adapters hand one in.
 * There is no backend and no account system by design: experiments are local.
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Keys currently held, used to list saved experiments. */
  keys(): string[];
}

export function createMemoryStorage(initial?: Record<string, string>): StorageAdapter {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    keys: () => [...map.keys()],
  };
}

export interface ExperimentStorage {
  load(key: string): Experiment | undefined;
  save(key: string, experiment: Experiment): void;
  remove(key: string): void;
  list(prefix?: string): string[];
}

/**
 * Experiment persistence over any adapter. Every read goes through the
 * validating deserializer, and every write is wrapped: a full or blocked
 * storage quota must not take the devtools down with it.
 */
export function createExperimentStorage(adapter: StorageAdapter): ExperimentStorage {
  return {
    load(key) {
      try {
        return deserializeExperiment(adapter.getItem(key));
      } catch {
        return undefined;
      }
    },
    save(key, experiment) {
      try {
        adapter.setItem(key, serializeExperiment(experiment));
      } catch {
        // Quota exceeded, private mode, blocked site data — losing a saved
        // experiment is acceptable, losing the devtools is not.
      }
    },
    remove(key) {
      try {
        adapter.removeItem(key);
      } catch {
        /* ignore */
      }
    },
    list(prefix = "motionlab:") {
      try {
        return adapter.keys().filter((key) => key.startsWith(prefix));
      } catch {
        return [];
      }
    },
  };
}

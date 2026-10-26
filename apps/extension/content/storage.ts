import type { Experiment } from "@motionlab/core";
import { deserializeExperiment, domStorageKey, serializeExperiment } from "@motionlab/core";
import { DEFAULT_SETTINGS, type InspectorSettings } from "@motionlab/devtools";

/**
 * Extension persistence, in `chrome.storage.local` — the extension's own
 * store. Nothing is written to the inspected site's localStorage or cookies:
 * MotionLab visiting a page must not leave anything behind on it.
 */

const SETTINGS_KEY = "motionlab:settings";

function area(): chrome.storage.StorageArea | null {
  try {
    return chrome?.storage?.local ?? null;
  } catch {
    return null;
  }
}

export async function loadSettings(): Promise<InspectorSettings> {
  const store = area();
  if (!store) return DEFAULT_SETTINGS;
  try {
    const result = await store.get(SETTINGS_KEY);
    const parsed = result[SETTINGS_KEY] as Partial<InspectorSettings> | undefined;
    if (!parsed) return DEFAULT_SETTINGS;
    return {
      theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : "system",
      dock: parsed.dock === "right" ? "right" : "float",
      position: {
        top: Number(parsed.position?.top) || DEFAULT_SETTINGS.position.top,
        right: Number(parsed.position?.right) || DEFAULT_SETTINGS.position.right,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: InspectorSettings): void {
  void area()?.set({ [SETTINGS_KEY]: settings }).catch(() => {});
}

/** `motionlab:<domain>:<element>:<interaction>` */
export function experimentKey(elementSignature: string, label: string): string {
  return domStorageKey(window.location.hostname, `${elementSignature}-${label}`);
}

export async function loadExperiment(key: string): Promise<Experiment | undefined> {
  const store = area();
  if (!store) return undefined;
  try {
    const result = await store.get(key);
    return deserializeExperiment(result[key] as string | undefined);
  } catch {
    return undefined;
  }
}

export function saveExperiment(key: string, experiment: Experiment): void {
  void area()?.set({ [key]: serializeExperiment(experiment) }).catch(() => {});
}

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { createInteraction, type MotionInteraction, type TargetDescriptor } from "@motionlab/core";
import {
  DEFAULT_SETTINGS,
  Inspector,
  StageLayer,
  breadcrumbFor,
  defaultInteractionFor,
  elementPath,
  nameElement,
  recordInteraction,
  selectorFor,
  startPicker,
  type InspectedComponent,
  type InspectorHost,
  type InspectorSettings,
  type PickerHandle,
} from "@motionlab/devtools";
import { useResolvedTheme } from "@motionlab/ui";
import type { ExtensionStatus } from "../shared/messages";
import { detectSdk, getNativeTargets, openNativeTarget } from "./nativeBridge";
import { experimentKey, loadExperiment, loadSettings, saveExperiment, saveSettings } from "./storage";

export interface AppHandle {
  startInspect(): void;
  status(): ExtensionStatus;
}

interface StageSource {
  subject: Element;
  snapshot: HTMLElement | null;
}

export interface AppProps {
  handleRef: Ref<AppHandle>;
  shadowHost: HTMLElement;
  stageMount: HTMLElement;
  onClose(): void;
}

let selectionCounter = 0;

/**
 * The extension in DOM mode: the shared inspector over any element on any
 * page. Everything it shows of the page is read from it; the only thing it
 * ever changes is hiding the selected element while a stand-in replays in
 * its place, which is undone the moment playback stops.
 */
export function App({ handleRef, shadowHost, stageMount, onClose }: AppProps) {
  const [settings, setSettings] = useState<InspectorSettings>(DEFAULT_SETTINGS);
  const [element, setElement] = useState<Element | null>(null);
  const [selectionKey, setSelectionKey] = useState("");
  const [picking, setPicking] = useState(false);
  const [interactions, setInteractions] = useState<MotionInteraction[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [sdk, setSdk] = useState(false);
  const [nativeTargets, setNativeTargets] = useState<TargetDescriptor[]>([]);
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const picker = useRef<PickerHandle | null>(null);
  const sources = useRef(new Map<string, StageSource>());
  const theme = useResolvedTheme(settings.theme);

  useEffect(() => {
    void loadSettings().then(setSettings);
    void detectSdk().then(async (found) => {
      setSdk(found);
      if (found) setNativeTargets(await getNativeTargets());
    });
  }, []);

  const isOwn = useCallback(
    (node: Node | EventTarget | null) =>
      node instanceof Node && (node === shadowHost || shadowHost.contains(node) || node.getRootNode() === shadowHost.shadowRoot),
    [shadowHost],
  );

  const select = useCallback((next: Element) => {
    selectionCounter += 1;
    sources.current.clear();
    // Something to compare from the first moment: no recording required.
    const initial = defaultInteractionFor(next);
    sources.current.set(initial.interaction.experiment.id, {
      subject: initial.subject,
      snapshot: initial.snapshot,
    });
    setElement(next);
    setSelectionKey(`selection-${selectionCounter}`);
    setInteractions([initial.interaction]);
    setNotes({});
    // Restore a comparison tuned on this element before.
    void loadExperiment(experimentKey(selectorFor(next), initial.interaction.label)).then((saved) => {
      if (!saved) return;
      setInteractions((previous) =>
        previous.map((interaction) =>
          interaction.id === initial.interaction.id
            ? { ...interaction, experiment: { ...saved, id: interaction.experiment.id, keyframes: saved.keyframes } }
            : interaction,
        ),
      );
    });
  }, []);

  const startPicking = useCallback(() => {
    if (!overlay) return;
    picker.current?.cancel();
    setPicking(true);
    picker.current = startPicker({
      container: overlay,
      isOwn: (node) => isOwn(node),
      onSelect(next) {
        picker.current = null;
        setPicking(false);
        select(next);
      },
      onCancel() {
        picker.current = null;
        setPicking(false);
      },
    });
  }, [isOwn, overlay, select]);

  const cancelPicking = useCallback(() => {
    picker.current?.cancel();
    picker.current = null;
    setPicking(false);
  }, []);

  useEffect(() => () => picker.current?.cancel(), []);

  // A request to inspect can arrive before the overlay exists; honour it once it does.
  const pendingInspect = useRef(false);
  useEffect(() => {
    if (overlay && pendingInspect.current) {
      pendingInspect.current = false;
      startPicking();
    }
  }, [overlay, startPicking]);

  const component = useMemo<InspectedComponent | null>(() => {
    if (!element) return null;
    const path = elementPath(element);
    return {
      key: selectionKey,
      name: nameElement(element).name,
      breadcrumb: breadcrumbFor(element),
      detail: selectorFor(element),
      mode: "dom",
      path: path.map((entry) => ({ name: entry.name, detail: entry.selector })),
    };
  }, [element, selectionKey]);

  // Persist each experiment as it is tuned, debounced so a slider drag is one write.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(
    (next: MotionInteraction[]) => {
      if (!component) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        for (const interaction of next) {
          saveExperiment(experimentKey(component.detail, interaction.label), interaction.experiment);
        }
      }, 300);
    },
    [component],
  );

  useImperativeHandle(
    handleRef,
    () => ({
      startInspect() {
        if (overlay) startPicking();
        else pendingInspect.current = true;
      },
      status: () => ({
        sdk,
        nativeTargets,
        panelOpen: true,
        picking,
        ...(component ? { inspecting: component.name } : {}),
      }),
    }),
    [component, nativeTargets, overlay, picking, sdk, startPicking],
  );

  const host: InspectorHost = {
    mode: "dom",
    component,
    ...(sdk && nativeTargets.length > 0
      ? {
          components: nativeTargets.map((target) => ({ id: target.id, label: target.label, detail: "React · MotionLab SDK" })),
          onSelectComponent(id: string) {
            // Native mode: the page's own devtools open the real component.
            openNativeTarget(id);
            onClose();
          },
        }
      : {}),
    picking,
    onStartPicking: startPicking,
    onCancelPicking: cancelPicking,
    onSelectPath(index) {
      if (!element) return;
      const entry = elementPath(element)[index];
      if (entry) select(entry.element);
    },
    onCapture(handlers) {
      if (!element) return () => {};
      return recordInteraction(
        element,
        {
          onSignal: handlers.onSignal,
          onCaptured(motion) {
            const key = experimentKey(selectorFor(element), motion.label);
            void loadExperiment(key).then((saved) => {
              const interaction = createInteraction({
                label: motion.label,
                trigger: motion.trigger,
                properties: motion.properties,
                keyframes: motion.keyframes,
                current: motion.transition,
                source: "dom",
                ...(saved ? { saved: { ...saved, keyframes: motion.keyframes } } : {}),
              });
              sources.current.set(interaction.experiment.id, {
                subject: motion.subject,
                snapshot: motion.snapshot,
              });
              // The real motion replaces the default entrance it stood in for.
              setInteractions((previous) => [
                ...previous.filter((entry) => entry.trigger !== "declared"),
                interaction,
              ]);
              if (motion.note) setNotes((previous) => ({ ...previous, [interaction.id]: motion.note! }));
              handlers.onCaptured(interaction, motion.note);
            });
          },
        },
        { ignore: (node) => isOwn(node) },
      );
    },
    interactions,
    onInteractionsChange(next) {
      setInteractions(next);
      persist(next);
    },
    notes,
    renderStage(stage) {
      const source = sources.current.get(stage.experiment.id);
      if (!source) return null;
      return createPortal(
        <StageLayer
          {...stage}
          theme={theme}
          anchor={source.subject}
          mountContent={(_variant, into) => {
            // A fresh clone per slot: A and B never share a node.
            const clone = source.snapshot?.cloneNode(true) as HTMLElement | undefined;
            if (clone) {
              into.appendChild(clone);
            } else {
              into.textContent = "Unable to create preview";
              into.style.cssText = `font: 12px system-ui, sans-serif; color: ${theme === "dark" ? "#a3a3ac" : "#5c5c66"}; padding: 8px;`;
            }
            return () => {
              into.replaceChildren();
              into.removeAttribute("style");
            };
          }}
        />,
        stageMount,
      );
    },
    settings,
    onSettingsChange(next) {
      setSettings(next);
      saveSettings(next);
    },
    onClose() {
      picker.current?.cancel();
      onClose();
    },
  };

  return (
    <>
      <Inspector host={host} />
      {/* The picker overlay lives here so it shares the panel's theme. */}
      <div ref={setOverlay} className="mlui" data-theme={theme} style={{ display: "contents" }} />
    </>
  );
}

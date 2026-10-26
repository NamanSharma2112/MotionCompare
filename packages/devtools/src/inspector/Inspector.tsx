"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  chooseWinner,
  exportVariant,
  promoteWinner,
  swapVariants,
  transitionTotalDuration,
  type Experiment,
  type ExportFormat,
  type MotionInteraction,
  type VariantId,
} from "@motionlab/core";
import { useClipboard } from "@motionlab/react";
import {
  BrandMark,
  Button,
  CommandMenu,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  MenuRadio,
  MenuSeparator,
  UiRoot,
  useToast,
  type CommandItem,
  type ThemePreference,
} from "@motionlab/ui";
import type { StageSlotSpec } from "../stage/StageLayer";
import { shortcutAllowed } from "./keyboard";
import type { InspectorHost } from "./types";
import { useStagePlayback } from "./useStagePlayback";
import {
  Captured,
  Compare,
  ComponentSection,
  ExperimentSection,
  Export,
  Focus,
  InteractionsSection,
  NothingSelected,
  Picking,
  Recording,
  TimelineDetail,
  ViewBody,
} from "./views";

type View = "home" | "recording" | "captured" | "compare" | "focus" | "export" | "timeline";

const SUB_VIEW_TITLE: Partial<Record<View, string>> = {
  compare: "Compare",
  focus: "Experiment",
  export: "Copy configuration",
  timeline: "Timeline",
};

const SPEEDS = [1, 0.5, 0.25];
const SEQUENCE_GAP = 280;

function speedLabel(speed: number): string {
  return speed === 1 ? "1×" : speed === 0.5 ? "½×" : speed === 0.25 ? "¼×" : `${speed}×`;
}

/**
 * The MotionLab inspector.
 *
 * One panel for every environment. Select a component, capture what it does,
 * then tune A against B with the result replaying in place on the page. The
 * panel stays small and quiet — the component is what should be looked at —
 * and every view keeps the panel's footprint so switching never jumps.
 */
export function Inspector({ host }: { host: InspectorHost }) {
  const { settings, component, interactions } = host;
  const [view, setView] = useState<View>("home");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VariantId>("B");
  const [sync, setSync] = useState(true);
  const [format, setFormat] = useState<ExportFormat>("motion");
  const [commandOpen, setCommandOpen] = useState(false);
  const [signal, setSignal] = useState("");
  const [captured, setCaptured] = useState<{ id: string; note?: string } | null>(null);
  const [closing, setClosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const cancelCapture = useRef<(() => void) | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const playback = useStagePlayback();
  const { snapshot, controller } = playback;
  const toast = useToast();
  const { copy } = useClipboard();

  const current: MotionInteraction | null =
    interactions.find((interaction) => interaction.id === currentId) ?? interactions[0] ?? null;
  const experiment = current?.experiment ?? null;

  // A different component is a fresh start.
  const componentKey = component?.key ?? null;
  useEffect(() => {
    setView("home");
    setCurrentId(null);
    setEditing("B");
    playback.release();
    cancelCapture.current?.();
    cancelCapture.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentKey]);

  /* ------------------------------------------------------------ updates -- */

  const updateExperiment = useCallback(
    (next: Experiment | ((value: Experiment) => Experiment)) => {
      if (!current) return;
      const resolved = typeof next === "function" ? next(current.experiment) : next;
      host.onInteractionsChange(
        interactions.map((interaction) =>
          interaction.id === current.id ? { ...interaction, experiment: resolved } : interaction,
        ),
      );
    },
    [current, host, interactions],
  );

  /* ----------------------------------------------------------- playback -- */

  const slotFor = useCallback(
    (variant: VariantId, position: StageSlotSpec["position"] = "anchor"): StageSlotSpec => ({
      variant,
      position,
      label: variant,
      sublabel: variant === "A" ? (experiment?.variantA.name ?? "Current") : (experiment?.variantB.name ?? "Experiment"),
    }),
    [experiment],
  );

  const compareSlots = useCallback((): StageSlotSpec[] => {
    if (!experiment) return [];
    if (sync) return [slotFor("A"), slotFor("B", "beside")];
    // One after another, in the same place: the purest comparison of motion
    // that lives in one spot. Still one clock — B is an offset, not a timer.
    const offset = transitionTotalDuration(experiment.variantA.transition) + SEQUENCE_GAP;
    return [
      { ...slotFor("A"), window: [Number.NEGATIVE_INFINITY, offset] },
      { ...slotFor("B"), offset, window: [offset, Number.POSITIVE_INFINITY] },
    ];
  }, [experiment, slotFor, sync]);

  const replay = useCallback(
    (variant?: VariantId) => {
      if (!experiment) return;
      if (view === "compare") {
        playback.play(compareSlots(), true);
        return;
      }
      playback.play([slotFor(variant ?? editing)], false);
    },
    [compareSlots, editing, experiment, playback, slotFor, view],
  );

  // Compare holds both variants up at rest; leaving it puts the page back.
  useEffect(() => {
    if (view === "compare" && experiment) {
      playback.hold(compareSlots(), true);
      return () => playback.release();
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, sync, current?.id]);

  const toggleFreeze = useCallback(() => {
    if (snapshot.state === "idle") replay();
    else playback.togglePause();
  }, [playback, replay, snapshot.state]);

  const cycleSpeed = useCallback(() => {
    const index = SPEEDS.indexOf(snapshot.speed);
    controller.setSpeed(SPEEDS[(index + 1) % SPEEDS.length] ?? 1);
  }, [controller, snapshot.speed]);

  /* ------------------------------------------------------------ actions -- */

  const choose = useCallback(
    (variant: VariantId) => updateExperiment((value) => chooseWinner(value, variant)),
    [updateExperiment],
  );

  const copyConfiguration = useCallback(
    async (code?: string) => {
      if (!experiment) return;
      const text = code ?? exportVariant(experiment, experiment.winner ?? editing, format).code;
      const ok = await copy(text);
      toast.show(ok ? "Copied configuration" : "Copy failed — select the code instead");
    },
    [copy, editing, experiment, format, toast],
  );

  const startCapture = useCallback(() => {
    if (!host.onCapture) return;
    playback.release();
    setView("recording");
    setSignal("Waiting for motion…");
    cancelCapture.current = host.onCapture({
      onSignal: setSignal,
      onCaptured(interaction, note) {
        cancelCapture.current = null;
        setCurrentId(interaction.id);
        setEditing("B");
        setCaptured({ id: interaction.id, ...(note ? { note } : {}) });
        setView("captured");
      },
    });
  }, [host, playback]);

  const stopCapture = useCallback(() => {
    cancelCapture.current?.();
    cancelCapture.current = null;
    setView("home");
  }, []);

  const requestClose = useCallback(() => {
    playback.release();
    cancelCapture.current?.();
    setClosing(true);
    // Exit is quicker than entry; the host unmounts once it has played.
    window.setTimeout(() => host.onClose(), 130);
  }, [host, playback]);

  const back = useCallback(() => setView("home"), []);

  const setTheme = (theme: ThemePreference) => host.onSettingsChange({ ...settings, theme });
  const toggleDock = () =>
    host.onSettingsChange({ ...settings, dock: settings.dock === "float" ? "right" : "float" });

  /* ----------------------------------------------------------- keyboard -- */

  const isOwn = useCallback((node: EventTarget) => {
    const root = rootRef.current;
    if (!root || !(node instanceof Node)) return false;
    if (root.contains(node)) return true;
    const shadowHost = (root.getRootNode() as ShadowRoot).host;
    return Boolean(shadowHost && (node === shadowHost || shadowHost.contains(node)));
  }, []);

  const popupOpen = () =>
    Boolean(rootRef.current?.querySelector('.mlui-portal [role="menu"], .mlui-portal [role="dialog"]'));

  const keyState = useRef({ view, commandOpen, current, picking: host.picking });
  keyState.current = { view, commandOpen, current, picking: host.picking };
  const actions = useRef({ replay, choose, requestClose, back, stopCapture, updateExperiment });
  actions.current = { replay, choose, requestClose, back, stopCapture, updateExperiment };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const state = keyState.current;
      const act = actions.current;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopPropagation();
        setCommandOpen((open) => !open);
        return;
      }
      if (state.commandOpen) return;

      if (event.key === "Escape") {
        if (state.picking || popupOpen()) return;
        event.preventDefault();
        if (state.view === "recording") act.stopCapture();
        else if (state.view !== "home") act.back();
        else act.requestClose();
        return;
      }

      if (!state.current || state.view === "recording") return;
      if (!shortcutAllowed(event, isOwn)) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          act.replay();
          return;
        case "a":
        case "A":
          act.choose("A");
          return;
        case "b":
        case "B":
          act.choose("B");
          return;
        case "s":
        case "S":
          act.updateExperiment((value) => swapVariants(value));
          return;
        default:
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isOwn]);

  /* -------------------------------------------------------------- drag -- */

  const drag = useRef<{ x: number; y: number; top: number; right: number } | null>(null);

  function onHeadPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (settings.dock !== "float" || event.button !== 0) return;
    // React bubbles portal events through the component tree, so a press in
    // the header's menu (portalled elsewhere) arrives here too. Only presses
    // physically inside the header start a drag.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if ((event.target as HTMLElement).closest("button, [role=button], a, input")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ...settings.position };
    setDragging(true);
  }

  function onHeadPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current;
    const panel = panelRef.current;
    if (!start || !panel) return;
    const width = panel.offsetWidth;
    const top = Math.min(Math.max(8, start.top + event.clientY - start.y), window.innerHeight - 48);
    const right = Math.min(Math.max(8, start.right - (event.clientX - start.x)), window.innerWidth - width - 8);
    panel.style.top = `${top}px`;
    panel.style.right = `${right}px`;
  }

  function onHeadPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current;
    const panel = panelRef.current;
    drag.current = null;
    setDragging(false);
    if (!start || !panel) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    host.onSettingsChange({
      ...settings,
      position: { top: Number.parseFloat(panel.style.top) || 16, right: Number.parseFloat(panel.style.right) || 16 },
    });
  }

  /* ----------------------------------------------------------- commands -- */

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    if (host.onStartPicking) {
      items.push({ id: "inspect", label: "Inspect component", icon: "inspect", run: () => host.onStartPicking?.() });
    }
    if (host.onCapture && component) {
      items.push({ id: "capture", label: "Capture interaction", icon: "add", run: startCapture });
    }
    if (current) {
      items.push(
        { id: "compare", label: "Compare interaction", icon: "compare", run: () => setView("compare") },
        { id: "replay", label: "Replay", icon: "replay", shortcut: "Space", run: () => replay() },
        {
          id: "loop",
          label: snapshot.loop ? "Turn loop off" : "Loop",
          icon: "loop",
          run: () => controller.setLoop(!snapshot.loop),
        },
        {
          id: "freeze",
          label: snapshot.paused ? "Resume" : "Freeze",
          icon: snapshot.paused ? "play" : "pause",
          disabled: snapshot.state === "idle",
          run: () => playback.togglePause(),
        },
        { id: "slow", label: "Slow motion ¼×", keywords: ["speed"], run: () => controller.setSpeed(0.25) },
        { id: "realtime", label: "Real-time speed", keywords: ["speed", "1x"], run: () => controller.setSpeed(1) },
        { id: "copy", label: "Copy configuration", icon: "copy", run: () => void copyConfiguration() },
        { id: "export", label: "Copy as CSS or JSON…", icon: "copy", run: () => setView("export") },
        { id: "focus", label: "Focus on experiment B", icon: "focus", run: () => setView("focus") },
        { id: "timeline", label: "Show timeline", icon: "timeline", run: () => setView("timeline") },
        { id: "choose-a", label: "Keep A", shortcut: "A", group: "Decide", run: () => choose("A") },
        { id: "choose-b", label: "Choose B", shortcut: "B", group: "Decide", run: () => choose("B") },
        {
          id: "swap",
          label: "Swap A and B",
          shortcut: "S",
          group: "Decide",
          run: () => updateExperiment((value) => swapVariants(value)),
        },
      );
    }
    items.push(
      {
        id: "dock",
        label: settings.dock === "float" ? "Dock to right" : "Float panel",
        icon: settings.dock === "float" ? "dock" : "float",
        group: "Panel",
        run: toggleDock,
      },
      { id: "theme-system", label: "Theme: System", icon: "themeSystem", group: "Panel", run: () => setTheme("system") },
      { id: "theme-light", label: "Theme: Light", icon: "themeLight", group: "Panel", run: () => setTheme("light") },
      { id: "theme-dark", label: "Theme: Dark", icon: "themeDark", group: "Panel", run: () => setTheme("dark") },
      { id: "close", label: "Close MotionLab", icon: "close", shortcut: "Escape", group: "Panel", run: requestClose },
    );
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, component, current, snapshot, settings, startCapture, replay, copyConfiguration, choose, requestClose]);

  /* -------------------------------------------------------------- views -- */

  const capturedInteraction = captured ? interactions.find((entry) => entry.id === captured.id) : null;
  const title = SUB_VIEW_TITLE[view];
  const showTransport = Boolean(current) && (view === "home" || view === "focus" || view === "timeline");
  const playing = snapshot.state === "playing";

  let body: ReactNode;
  if (view === "recording") {
    body = <Recording signal={signal} onCancel={stopCapture} />;
  } else if (view === "captured" && capturedInteraction) {
    body = (
      <Captured
        interaction={capturedInteraction}
        {...(captured?.note ? { note: captured.note } : {})}
        onReplay={() => replay("A")}
        onContinue={back}
      />
    );
  } else if (view === "compare" && current) {
    body = (
      <Compare
        interaction={current}
        sync={sync}
        onSync={setSync}
        loop={snapshot.loop}
        onLoop={(value) => controller.setLoop(value)}
        speed={snapshot.speed}
        onSpeed={(value) => controller.setSpeed(value)}
        onReplay={() => playback.play(compareSlots(), true)}
        playing={playing}
      />
    );
  } else if (view === "focus" && experiment) {
    body = (
      <Focus
        experiment={experiment}
        variant={editing}
        onExperimentChange={updateExperiment}
        onCommit={() => replay()}
        onReplay={() => replay()}
      />
    );
  } else if (view === "export" && experiment) {
    body = (
      <Export
        experiment={experiment}
        variant={experiment.winner ?? editing}
        format={format}
        onFormat={setFormat}
        onCopy={(code) => void copyConfiguration(code)}
      />
    );
  } else if (view === "timeline" && experiment) {
    body = <TimelineDetail experiment={experiment} />;
  } else if (host.picking) {
    body = <Picking onCancel={() => host.onCancelPicking?.()} />;
  } else if (!component) {
    body = (
      <NothingSelected
        canPick={Boolean(host.onStartPicking)}
        {...(host.onStartPicking ? { onPick: host.onStartPicking } : {})}
        {...(host.components ? { components: host.components } : {})}
        {...(host.onSelectComponent ? { onSelectComponent: host.onSelectComponent } : {})}
        componentsLabel={host.mode === "react" ? "Targets" : "Components on this page"}
      />
    );
  } else {
    body = (
      <>
        <ComponentSection
          component={component}
          {...(host.onStartPicking ?? host.onChangeComponent
            ? { onPick: (host.onStartPicking ?? host.onChangeComponent)! }
            : {})}
          {...(host.onSelectPath ? { onSelectPath: host.onSelectPath } : {})}
        />
        <InteractionsSection
          interactions={interactions}
          currentId={current?.id ?? null}
          onSelect={(id) => setCurrentId(id)}
          onReplay={(id) => {
            setCurrentId(id);
            // Wait a render so the stage picks up the newly selected experiment.
            requestAnimationFrame(() => actions.current.replay("A"));
          }}
          {...(host.onCapture
            ? {
                onRemove: (id: string) =>
                  host.onInteractionsChange(interactions.filter((interaction) => interaction.id !== id)),
                onCapture: startCapture,
              }
            : {})}
        />
        {experiment ? (
          <ExperimentSection
            experiment={experiment}
            editing={editing}
            onEditingChange={setEditing}
            onExperimentChange={updateExperiment}
            onCommit={() => replay()}
            onFocus={() => setView("focus")}
            onTimeline={() => setView("timeline")}
            subscribeFrame={controller.subscribeFrame}
            playing={playing}
          />
        ) : null}
      </>
    );
  }

  const viewKey = view === "home" ? (host.picking ? "picking" : component ? "inspect" : "empty") : view;
  const winner = experiment?.winner ?? null;

  return (
    <UiRoot theme={settings.theme}>
      <div ref={rootRef} style={{ display: "contents" }}>
        <div
          ref={panelRef}
          className="mlui-panel"
          role="dialog"
          aria-label="MotionLab"
          data-dock={settings.dock}
          data-closing={closing ? "" : undefined}
          data-dragging={dragging ? "" : undefined}
          style={settings.dock === "float" ? { top: settings.position.top, right: settings.position.right } : undefined}
        >
          <div
            className="mlui-head"
            onPointerDown={onHeadPointerDown}
            onPointerMove={onHeadPointerMove}
            onPointerUp={onHeadPointerUp}
            onPointerCancel={onHeadPointerUp}
            onDoubleClick={(event) => {
              if (!(event.target as HTMLElement).closest("button")) toggleDock();
            }}
          >
            {title ? (
              <>
                <IconButton icon="back" label="Back" shortcut="Escape" size="sm" onClick={back} tooltipSide="bottom" />
                <span className="mlui-head-title">{title}</span>
              </>
            ) : (
              <span className="mlui-brand">
                <BrandMark />
                MotionLab
              </span>
            )}
            <span className="mlui-head-spacer" />
            <Menu
              trigger={<IconButton icon="more" label="More" shortcut={["Mod", "K"]} tooltipSide="bottom" />}
            >
              <MenuItem icon="search" shortcut={["Mod", "K"]} onSelect={() => setCommandOpen(true)}>
                Commands
              </MenuItem>
              {current ? (
                <MenuItem icon="copy" onSelect={() => setView("export")}>
                  Copy configuration…
                </MenuItem>
              ) : null}
              {(host.onStartPicking || host.onChangeComponent) && component ? (
                <MenuItem
                  icon="inspect"
                  onSelect={() => (host.onStartPicking ?? host.onChangeComponent)?.()}
                >
                  {host.onStartPicking ? "Inspect another component" : "Choose another target"}
                </MenuItem>
              ) : null}
              <MenuSeparator />
              <MenuItem icon={settings.dock === "float" ? "dock" : "float"} onSelect={toggleDock}>
                {settings.dock === "float" ? "Dock to right" : "Float panel"}
              </MenuItem>
              <MenuRadio
                label="Theme"
                value={settings.theme}
                onChange={setTheme}
                options={[
                  { value: "system", label: "System", icon: "themeSystem" },
                  { value: "light", label: "Light", icon: "themeLight" },
                  { value: "dark", label: "Dark", icon: "themeDark" },
                ]}
              />
              <MenuSeparator />
              <MenuItem icon="close" shortcut="Escape" onSelect={requestClose}>
                Close MotionLab
              </MenuItem>
            </Menu>
          </div>

          <div className="mlui-body mlui-scroll">
            <ViewBody viewKey={viewKey}>{body}</ViewBody>
            {toast.node}
          </div>

          {showTransport && experiment ? (
            <div className="mlui-foot">
              <div className="mlui-hstack" style={{ gap: 2, padding: "6px 8px" }}>
                <IconButton icon="replay" label="Replay" shortcut="Space" onClick={() => replay()} />
                <IconButton
                  icon={playing && !snapshot.paused ? "pause" : "play"}
                  label={snapshot.paused ? "Resume" : playing ? "Freeze" : "Play"}
                  onClick={toggleFreeze}
                />
                <IconButton
                  icon="loop"
                  label={snapshot.loop ? "Loop on" : "Loop"}
                  active={snapshot.loop}
                  onClick={() => controller.setLoop(!snapshot.loop)}
                />
                <IconButton text={speedLabel(snapshot.speed)} label="Playback speed" active={snapshot.speed !== 1} onClick={cycleSpeed} />
                <span className="mlui-grow" />
                <IconButton icon="compare" label="Compare A and B" onClick={() => setView("compare")} />
              </div>
              <div className="mlui-hstack" style={{ padding: "0 12px 12px", gap: 8 }}>
                {winner ? (
                  <>
                    <span className="mlui-hstack mlui-grow" style={{ gap: 6 }}>
                      <Icon name="check" size={13} style={{ color: "var(--ml-success)" }} />
                      <span>
                        <b style={{ fontWeight: 600 }}>{winner}</b> chosen
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        updateExperiment((value) => promoteWinner(value));
                        setEditing("B");
                      }}
                    >
                      Use as baseline
                    </Button>
                    <Button variant="primary" icon="copy" onClick={() => void copyConfiguration()}>
                      Copy
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" block onClick={() => choose("A")}>
                      Keep A
                    </Button>
                    <Button variant="primary" block onClick={() => choose("B")}>
                      Choose B
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {view === "compare" && experiment ? (
            <div className="mlui-foot">
              <div className="mlui-hstack" style={{ padding: 12, gap: 8 }}>
                <Button variant="secondary" block onClick={() => choose("A")}>
                  {winner === "A" ? "A kept" : "Keep A"}
                </Button>
                <Button variant="primary" block onClick={() => choose("B")}>
                  {winner === "B" ? "B chosen" : "Choose B"}
                </Button>
              </div>
            </div>
          ) : null}

          <CommandMenu open={commandOpen} items={commands} onClose={() => setCommandOpen(false)} />
        </div>
      </div>

      {experiment
        ? host.renderStage({
            visible: playback.stage.visible,
            experiment,
            slots: playback.stage.slots,
            showTags: playback.stage.showTags,
            avoidRect: () => panelRef.current?.getBoundingClientRect() ?? null,
            onTrackReady: playback.onTrackReady,
          })
        : null}
    </UiRoot>
  );
}

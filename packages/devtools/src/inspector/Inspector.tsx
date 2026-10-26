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
  createDecision,
  decisionPrompt,
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
  CompareBlock,
  ComponentSection,
  Export,
  InteractionsSection,
  NothingSelected,
  Picking,
  Recording,
  TuneBlock,
  ViewBody,
} from "./views";

type View = "home" | "recording" | "captured" | "export";

const SUB_VIEW_TITLE: Partial<Record<View, string>> = {
  export: "Copy configuration",
};

const SEQUENCE_GAP = 280;

/**
 * The MotionLab inspector.
 *
 * One panel for every environment, and one screen once something is
 * selected: A and B are already on the page side by side, Replay is the
 * biggest button, B's dials sit right under it, and the decision closes the
 * panel's footer. Recording the element's real motion is available but never
 * required to start comparing.
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
  const [sent, setSent] = useState<{ experimentId: string; file: string | null } | null>(null);
  const [sending, setSending] = useState(false);
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

  /** Replay A and B together — every replay is a comparison. */
  const replay = useCallback(() => {
    if (!experiment) return;
    playback.play(compareSlots(), true);
  }, [compareSlots, experiment, playback]);

  // While something is selected and the main screen is up, A and B stay on
  // the page at rest. Recording, picking or closing puts the page back.
  const comparing = view === "home" && Boolean(experiment) && !host.picking;
  useEffect(() => {
    if (!comparing) return undefined;
    playback.hold(compareSlots(), true);
    return () => playback.release();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparing, sync, current?.id]);

  // Play once the moment a component is selected, so the comparison is the
  // first thing seen rather than something to go looking for.
  const autoPlayed = useRef<string | null>(null);
  useEffect(() => {
    if (!comparing || !componentKey || autoPlayed.current === componentKey) return;
    autoPlayed.current = componentKey;
    const frame = requestAnimationFrame(() => actions.current.replay());
    return () => cancelAnimationFrame(frame);
  }, [comparing, componentKey]);

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

  /**
   * Hand the decision to a coding agent: saved into the project when the app
   * has the MotionLab route, otherwise copied as a ready-made prompt. Either
   * way the developer ends with one thing to tell the agent.
   */
  const sendToAI = useCallback(async () => {
    if (!experiment || !current || !component) return;
    const decision = createDecision({
      experiment,
      component: host.decisionComponent?.() ?? { id: component.detail, label: component.name },
      interaction: current.label,
    });
    setSending(true);
    let saved: { file: string } | null = null;
    try {
      saved = (await host.saveDecision?.(decision)) ?? null;
    } catch {
      saved = null;
    }
    setSending(false);
    if (saved) {
      setSent({ experimentId: experiment.id, file: saved.file });
      toast.show("Saved for your AI");
      return;
    }
    const ok = await copy(decisionPrompt(decision));
    setSent({ experimentId: experiment.id, file: null });
    toast.show(ok ? "Copied for your AI" : "Copy failed — try Copy code");
  }, [component, copy, current, experiment, host, toast]);

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
        // Straight back to comparing; the confirmation is a beat, not a stop.
        window.setTimeout(() => {
          setView((currentView) => (currentView === "captured" ? "home" : currentView));
          requestAnimationFrame(() => actions.current.replay());
        }, 1400);
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
      items.push({ id: "inspect", label: "Select another element", icon: "inspect", run: () => host.onStartPicking?.() });
    }
    if (current) {
      items.push(
        { id: "replay", label: "Replay A and B", icon: "replay", shortcut: "Space", run: () => replay() },
        {
          id: "loop",
          label: snapshot.loop ? "Turn loop off" : "Loop",
          icon: "loop",
          run: () => controller.setLoop(!snapshot.loop),
        },
        {
          id: "sync",
          label: sync ? "Play one after another" : "Play side by side",
          icon: "compare",
          run: () => setSync(!sync),
        },
        { id: "slow", label: "Slow motion ¼×", keywords: ["speed"], run: () => controller.setSpeed(0.25) },
        { id: "realtime", label: "Real-time speed", keywords: ["speed", "1x"], run: () => controller.setSpeed(1) },
        { id: "copy", label: "Copy code", icon: "copy", run: () => void copyConfiguration() },
        { id: "export", label: "Copy as CSS or JSON…", icon: "copy", run: () => setView("export") },
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
    if (host.onCapture && component) {
      items.push({ id: "capture", label: "Use this element’s real motion", icon: "add", run: startCapture });
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
  }, [host, component, current, snapshot, settings, sync, startCapture, replay, copyConfiguration, choose, requestClose]);

  /* -------------------------------------------------------------- views -- */

  const capturedInteraction = captured ? interactions.find((entry) => entry.id === captured.id) : null;
  const title = SUB_VIEW_TITLE[view];
  const playing = snapshot.state === "playing";
  const showDecision = Boolean(current) && view === "home" && !host.picking;

  let body: ReactNode;
  if (view === "recording") {
    body = <Recording signal={signal} onCancel={stopCapture} />;
  } else if (view === "captured" && capturedInteraction) {
    body = (
      <Captured
        interaction={capturedInteraction}
        {...(captured?.note ? { note: captured.note } : {})}
        onReplay={() => {
          setView("home");
          requestAnimationFrame(() => actions.current.replay());
        }}
        onContinue={back}
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
        {current ? (
          <CompareBlock
            interaction={current}
            onReplay={replay}
            playing={playing}
            sync={sync}
            onSync={setSync}
            loop={snapshot.loop}
            onLoop={(value) => controller.setLoop(value)}
            speed={snapshot.speed}
            onSpeed={(value) => controller.setSpeed(value)}
            {...(host.onCapture ? { onRecord: startCapture } : {})}
          />
        ) : null}
        {interactions.length > 1 ? (
          <InteractionsSection
            interactions={interactions}
            currentId={current?.id ?? null}
            onSelect={(id) => setCurrentId(id)}
            onReplay={(id) => {
              setCurrentId(id);
              requestAnimationFrame(() => actions.current.replay());
            }}
            {...(host.onCapture
              ? {
                  onRemove: (id: string) =>
                    host.onInteractionsChange(interactions.filter((interaction) => interaction.id !== id)),
                }
              : {})}
          />
        ) : null}
        {experiment ? (
          <TuneBlock
            experiment={experiment}
            editing={editing}
            onEditingChange={setEditing}
            onExperimentChange={updateExperiment}
            onCommit={replay}
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
                  Copy as CSS or JSON…
                </MenuItem>
              ) : null}
              {(host.onStartPicking || host.onChangeComponent) && component ? (
                <MenuItem
                  icon="inspect"
                  onSelect={() => (host.onStartPicking ?? host.onChangeComponent)?.()}
                >
                  {host.onStartPicking ? "Select another element" : "Choose another target"}
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

          {showDecision && experiment ? (
            <div className="mlui-foot">
              <div className="mlui-hstack" style={{ padding: 12, gap: 8 }}>
                {winner ? (
                  <div className="mlui-stack mlui-grow" style={{ gap: 10 }}>
                    <div className="mlui-hstack" style={{ gap: 6 }}>
                      <Icon name="check" size={13} style={{ color: "var(--ml-success)" }} />
                      <span className="mlui-grow">
                        <b style={{ fontWeight: 600 }}>{winner}</b> chosen
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          updateExperiment((value) => promoteWinner(value));
                          setEditing("B");
                          setSent(null);
                        }}
                        title={`A becomes ${winner}; B becomes a copy you can keep tuning`}
                      >
                        Tune further
                      </Button>
                    </div>
                    <div className="mlui-hstack" style={{ gap: 8 }}>
                      <Button variant="primary" block icon="send" disabled={sending} onClick={() => void sendToAI()}>
                        Send to AI
                      </Button>
                      <Button variant="secondary" icon="copy" onClick={() => void copyConfiguration()}>
                        Copy code
                      </Button>
                    </div>
                    {sent && sent.experimentId === experiment.id ? (
                      <p className="mlui-note" style={{ margin: 0 }} aria-live="polite">
                        {sent.file ? (
                          <>
                            Saved to <span className="mlui-mono">{sent.file}</span>. Now tell your agent:{" "}
                            <b style={{ fontWeight: 500, color: "var(--ml-text)" }}>“Apply my MotionLab decisions.”</b>
                          </>
                        ) : (
                          <>Copied a ready-made instruction. Paste it into Claude Code or Codex.</>
                        )}
                      </p>
                    ) : null}
                  </div>
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

"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  chooseWinner,
  getVariant,
  hasDivergence,
  promoteWinner,
  setVariantTransition,
  swapVariants,
  type Experiment,
  type TransitionConfig,
  type VariantId,
} from "@motionlab/core";
import { TransitionControls, variantColor } from "@motionlab/dialkit";
import {
  useMotionLabKeyboard,
  usePlayback,
  type MotionLabAnimatorHandle,
} from "@motionlab/react";
import { ExportPanel } from "../controls/ExportPanel";

export interface ComparisonShellProps {
  experiment: Experiment;
  onChange(next: Experiment | ((current: Experiment) => Experiment)): void;
  onClose(): void;
  /**
   * Renders both stages. Given the playback plumbing, so the React stage and
   * the extension's DOM stage can mount completely different content into the
   * same comparison chrome.
   */
  renderStages(stageProps: {
    playing: boolean;
    onTrackReady(variant: VariantId, handle: MotionLabAnimatorHandle | null): void;
  }): ReactNode;
  /** Shown in the header: "react" or "dom". */
  mode?: string;
  headerExtra?: ReactNode;
  /**
   * What the × means here. The playground has nothing to close — the
   * comparison is the page — so it labels this "Reset experiment" instead.
   */
  closeLabel?: string;
}

/**
 * The one comparison UI.
 *
 * Both front-ends — the in-app React devtools and the browser extension —
 * render this. It owns the layout, the transport, the controls, the winner and
 * export; what differs between environments is only what gets mounted into the
 * two stages, which is why the product feels the same in both.
 */
export function ComparisonShell({
  experiment,
  onChange,
  onClose,
  renderStages,
  mode,
  headerExtra,
  closeLabel = "Close MotionLab",
}: ComparisonShellProps) {
  const {
    state: playbackState,
    playing,
    replayComparison,
    resetComparison,
    setTracks,
  } = usePlayback();
  const handles = useRef(new Map<VariantId, MotionLabAnimatorHandle>());

  const syncTracks = useCallback(() => {
    const tracks = (["A", "B"] as const)
      .map((variant) => handles.current.get(variant)?.track)
      .filter((track): track is NonNullable<typeof track> => Boolean(track));
    setTracks(tracks);
  }, [setTracks]);

  const onTrackReady = useCallback(
    (variant: VariantId, handle: MotionLabAnimatorHandle | null) => {
      if (handle) handles.current.set(variant, handle);
      else handles.current.delete(variant);
      syncTracks();
    },
    [syncTracks],
  );

  const setVariant = useCallback(
    (variant: VariantId, transition: TransitionConfig) => {
      onChange((current) => setVariantTransition(current, variant, transition));
    },
    [onChange],
  );

  const choose = useCallback(
    (variant: VariantId) => onChange((current) => chooseWinner(current, variant)),
    [onChange],
  );

  const replay = replayComparison;
  const swap = useCallback(() => onChange((current) => swapVariants(current)), [onChange]);

  useMotionLabKeyboard({
    onReplay: replay,
    onChooseA: () => choose("A"),
    onChooseB: () => choose("B"),
    onSwap: swap,
    onClose,
  });

  // Mirror playback into the experiment so `state` is accurate for anything
  // reading the model — the extension bridge included.
  useEffect(() => {
    onChange((current) =>
      current.state === playbackState ? current : { ...current, state: playbackState },
    );
  }, [playbackState, onChange]);

  // The extension drives replay through a DOM event rather than a direct call,
  // since it cannot reach into the page's React tree.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onPlaybackRequest(event: Event) {
      const detail = (event as CustomEvent<{ action?: string; targetId?: string }>).detail;
      if (!detail || detail.targetId !== experiment.id) return;
      if (detail.action === "replay") replayComparison();
      if (detail.action === "reset") resetComparison();
    }
    window.addEventListener("motionlab:playback", onPlaybackRequest);
    return () => window.removeEventListener("motionlab:playback", onPlaybackRequest);
  }, [experiment.id, replayComparison, resetComparison]);

  const winner = experiment.winner;
  const diverged = hasDivergence(experiment);

  return (
    <div className="ml-shell">
      <header className="ml-shell-head">
        <span className="ml-brand">
          <span className="ml-launcher-dot" aria-hidden="true" />
          MotionLab
        </span>
        {mode ? <span className="ml-mode">{mode}</span> : null}
        {headerExtra}
        <span className="ml-shell-label">{experiment.label ?? experiment.id}</span>
        <button type="button" className="ml-close" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
          ×
        </button>
      </header>

      <div className="ml-shell-body">
        <div className="ml-stages">{renderStages({ playing, onTrackReady })}</div>

        <div className="ml-transport">
          <button
            type="button"
            className="dk-button dk-button-lg"
            data-accent="true"
            onClick={replay}
          >
            {playing ? "▶ Playing…" : "▶ Compare"}
          </button>
          <button type="button" className="dk-button" onClick={resetComparison}>
            Reset
          </button>
          <button type="button" className="dk-button" onClick={swap}>
            Swap
          </button>
          <span className="dk-hint">
            <kbd>Space</kbd> replay · <kbd>A</kbd>/<kbd>B</kbd> choose · <kbd>S</kbd> swap ·{" "}
            <kbd>Esc</kbd> close
          </span>
        </div>

        <div className="ml-controls">
          {(["A", "B"] as const).map((variant) => (
            <div key={variant} className="ml-control-column">
              <TransitionControls
                variant={variant}
                transition={getVariant(experiment, variant).transition}
                compareWith={getVariant(experiment, variant === "A" ? "B" : "A").transition}
                onChange={(transition) => setVariant(variant, transition)}
              />
            </div>
          ))}
        </div>

        <div className="ml-choose-row">
          {(["A", "B"] as const).map((variant) => (
            <div key={variant} className="ml-choose-cell">
              <button
                type="button"
                className="dk-button dk-button-lg"
                style={{ ["--dk-accent" as string]: variantColor(variant) }}
                data-selected={winner === variant}
                onClick={() => choose(variant)}
              >
                {winner === variant ? `✓ Chose ${variant}` : `Choose ${variant}`}
              </button>
            </div>
          ))}
        </div>

        <footer className="ml-footer">
          <div className="ml-footer-row">
            <span className="ml-winner-readout">
              {winner ? (
                <>
                  Current winner: <strong style={{ color: variantColor(winner) }}>{winner}</strong>
                </>
              ) : diverged ? (
                "No winner yet — compare, then choose the one that feels right."
              ) : (
                "A and B are identical. Change one side to have something to compare."
              )}
            </span>
            {winner ? (
              <button
                type="button"
                className="dk-button"
                style={{ marginLeft: "auto" }}
                onClick={() => onChange((current) => promoteWinner(current))}
                title={`A becomes ${winner}, and B becomes a copy you can keep tuning`}
              >
                Use {winner} as baseline
              </button>
            ) : null}
          </div>

          <ExportPanel experiment={experiment} />
        </footer>
      </div>
    </div>
  );
}

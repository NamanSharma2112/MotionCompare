"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPlaybackController,
  createRafScheduler,
  type PlaybackSnapshot,
  type PlaybackTrack,
  type VariantId,
} from "@motionlab/core";
import type { StageSlotSpec } from "../stage/StageLayer";

export interface StageState {
  visible: boolean;
  slots: StageSlotSpec[];
  showTags: boolean;
}

const HIDDEN: StageState = { visible: false, slots: [], showTags: false };

/**
 * Playback for the inspector: one controller from the core, plus the stage
 * it drives.
 *
 * The stage exists only while something is playing (or while Compare holds
 * both variants up). When a replay settles, the stand-in is removed and the
 * real element shown again — at that moment they are pixel-identical, so the
 * swap is invisible and the page is back to itself.
 */
export function useStagePlayback() {
  const controller = useMemo(() => createPlaybackController(createRafScheduler(), { loopDelay: 650 }), []);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(() => controller.getSnapshot());
  const [stage, setStage] = useState<StageState>(HIDDEN);
  const [token, setToken] = useState(0);
  const pending = useRef<"replay" | "settle" | null>(null);
  const holdOpen = useRef(false);
  const tracks = useRef(new Map<VariantId, PlaybackTrack>());

  useEffect(() => {
    const offSnapshot = controller.subscribeSnapshot(setSnapshot);
    const offState = controller.subscribe((state) => {
      if (state === "idle" && !holdOpen.current) setStage(HIDDEN);
    });
    return () => {
      offSnapshot();
      offState();
      // Reset rather than dispose: StrictMode re-runs this effect, and a
      // disposed controller cannot be revived.
      controller.resetComparison();
    };
  }, [controller]);

  const onTrackReady = useCallback(
    (variant: VariantId, track: PlaybackTrack | null) => {
      if (track) tracks.current.set(variant, track);
      else tracks.current.delete(variant);
      controller.setTracks([...tracks.current.values()]);
    },
    [controller],
  );

  // Replay once the stage for this request has committed and its tracks are
  // registered — they register in layout effects, which run before this.
  useEffect(() => {
    const action = pending.current;
    if (!action) return;
    pending.current = null;
    if (action === "replay") controller.replayComparison();
    else controller.settleComparison();
  }, [token, controller]);

  const play = useCallback((slots: StageSlotSpec[], showTags: boolean) => {
    setStage({ visible: true, slots, showTags });
    pending.current = "replay";
    setToken((value) => value + 1);
  }, []);

  /** Hold the stage up at rest (Compare), showing both variants settled. */
  const hold = useCallback((slots: StageSlotSpec[], showTags: boolean) => {
    holdOpen.current = true;
    setStage({ visible: true, slots, showTags });
    pending.current = "settle";
    setToken((value) => value + 1);
  }, []);

  const release = useCallback(() => {
    holdOpen.current = false;
    controller.resetComparison();
    setStage(HIDDEN);
  }, [controller]);

  const togglePause = useCallback(() => {
    const current = controller.getSnapshot();
    if (current.paused) controller.resume();
    else controller.pause();
  }, [controller]);

  return {
    controller,
    snapshot,
    stage,
    onTrackReady,
    play,
    hold,
    release,
    togglePause,
    setHoldOpen(value: boolean) {
      holdOpen.current = value;
    },
  };
}

export type StagePlayback = ReturnType<typeof useStagePlayback>;

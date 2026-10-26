"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createPlaybackController,
  createRafScheduler,
  type PlaybackState,
  type PlaybackTrack,
} from "@motionlab/core";

export interface UsePlaybackResult {
  state: PlaybackState;
  playing: boolean;
  /** Start both variants from the same frame. */
  replayComparison(): void;
  /** Stop and return both variants to their start state. */
  resetComparison(): void;
  /** Register the tracks taking part. Call whenever the stages mount. */
  setTracks(tracks: PlaybackTrack[]): void;
}

/**
 * React access to the shared playback engine.
 *
 * One controller per comparison, created once and disposed on unmount. The
 * engine itself lives in `@motionlab/core`, so the extension's DOM mode runs
 * the exact same code with the exact same semantics.
 */
export function usePlayback(): UsePlaybackResult {
  const controller = useMemo(() => createPlaybackController(createRafScheduler()), []);
  const [state, setState] = useState<PlaybackState>("idle");
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    return () => {
      unsubscribe();
      // Stop the loop, but do not dispose. React's development StrictMode
      // mounts, cleans up and remounts effects, and a disposed controller
      // cannot be revived — it would refuse every later replay. Resetting
      // cancels the pending frame, which is the only resource held, and the
      // controller is collected with the component.
      controller.resetComparison();
    };
  }, [controller]);

  // The actions never change identity, so a caller can list them in an effect's
  // dependencies. Without that, every play/stop would churn the stage callbacks
  // and could drop a track out of the controller mid-comparison.
  const actions = useMemo(
    () => ({
      replayComparison: () => controllerRef.current.replayComparison(),
      resetComparison: () => controllerRef.current.resetComparison(),
      setTracks: (tracks: PlaybackTrack[]) => controllerRef.current.setTracks(tracks),
    }),
    [],
  );

  return { state, playing: state === "playing", ...actions };
}

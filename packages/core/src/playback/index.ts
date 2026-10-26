import {
  isTransitionSettled,
  transitionProgressAt,
  transitionTotalDuration,
} from "../transitions/index";
import type { PlaybackState, TransitionConfig, VariantId } from "../types/index";

/**
 * The clock the controller runs on. Injected rather than imported so the core
 * never touches `requestAnimationFrame` directly — the React SDK and the
 * extension pass a rAF scheduler, tests pass a manual one.
 */
export interface Scheduler {
  now(): number;
  requestFrame(callback: (time: number) => void): unknown;
  cancelFrame(handle: unknown): void;
}

export interface PlaybackTrack {
  variant: VariantId;
  transition: TransitionConfig;
  /** Called with eased progress every frame. Progress may exceed 1 on a bouncy spring. */
  onFrame(progress: number, info: { elapsed: number; settled: boolean }): void;
  onSettled?(): void;
}

export interface PlaybackController {
  getState(): PlaybackState;
  /** Register the tracks taking part in the next comparison. */
  setTracks(tracks: PlaybackTrack[]): void;
  /** Reset both variants to their start state, then play them from one clock. */
  replayComparison(): void;
  /** Stop playing and return both variants to their start state. */
  resetComparison(): void;
  subscribe(listener: (state: PlaybackState) => void): () => void;
  dispose(): void;
}

export function createRafScheduler(): Scheduler {
  const globalScope = globalThis as {
    requestAnimationFrame?: (cb: (t: number) => void) => number;
    cancelAnimationFrame?: (handle: number) => void;
    performance?: { now(): number };
  };

  if (typeof globalScope.requestAnimationFrame === "function") {
    const request = globalScope.requestAnimationFrame.bind(globalThis);
    const cancel = globalScope.cancelAnimationFrame?.bind(globalThis);
    const performanceNow = globalScope.performance?.now.bind(globalScope.performance);
    return {
      now: () => (performanceNow ? performanceNow() : Date.now()),
      requestFrame: (callback) => request(callback),
      cancelFrame: (handle) => cancel?.(handle as number),
    };
  }

  // Non-browser fallback (SSR, tests): a timer-driven clock. Still one clock
  // for both variants, which is the property that matters.
  return {
    now: () => Date.now(),
    requestFrame: (callback) => setTimeout(() => callback(Date.now()), 16),
    cancelFrame: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

/** A scheduler driven by hand, for deterministic tests. */
export function createManualScheduler(startTime = 0): Scheduler & {
  advance(ms: number): void;
  flush(): void;
} {
  let time = startTime;
  let pending: Array<(t: number) => void> = [];

  return {
    now: () => time,
    requestFrame(callback) {
      pending.push(callback);
      return callback;
    },
    cancelFrame(handle) {
      pending = pending.filter((callback) => callback !== handle);
    },
    advance(ms) {
      time += ms;
      this.flush();
    },
    flush() {
      const queued = pending;
      pending = [];
      for (const callback of queued) callback(time);
    },
  };
}

/**
 * The shared synchronized playback engine.
 *
 * Both variants are sampled from a single `t0` captured on the first animation
 * frame of a replay. There is deliberately no `setTimeout` per variant and no
 * second animation loop: a per-variant timer is exactly how an A/B comparison
 * starts lying to you, because the two sides drift by a frame or more and the
 * difference you are judging is no longer only the transition.
 *
 * Per-variant `delay` is honoured as an offset inside that one clock.
 */
export function createPlaybackController(
  scheduler: Scheduler = createRafScheduler(),
): PlaybackController {
  let tracks: PlaybackTrack[] = [];
  let state: PlaybackState = "idle";
  let frameHandle: unknown = null;
  let startTime: number | null = null;
  let disposed = false;
  const listeners = new Set<(state: PlaybackState) => void>();
  const settledTracks = new Set<VariantId>();

  function setState(next: PlaybackState) {
    if (state === next) return;
    state = next;
    for (const listener of listeners) listener(state);
  }

  function emitAt(elapsed: number) {
    for (const track of tracks) {
      const settled = isTransitionSettled(track.transition, elapsed);
      const progress = transitionProgressAt(track.transition, elapsed);
      track.onFrame(settled ? 1 : progress, { elapsed, settled });
      if (settled && !settledTracks.has(track.variant)) {
        settledTracks.add(track.variant);
        track.onSettled?.();
      }
    }
  }

  function stopLoop() {
    if (frameHandle !== null) {
      scheduler.cancelFrame(frameHandle);
      frameHandle = null;
    }
    startTime = null;
  }

  function tick(frameTime: number) {
    frameHandle = null;
    if (disposed) return;

    // The first frame of the replay defines t0 for every track at once.
    if (startTime === null) startTime = frameTime;
    const elapsed = frameTime - startTime;

    emitAt(elapsed);

    const total = tracks.reduce(
      (longest, track) => Math.max(longest, transitionTotalDuration(track.transition)),
      0,
    );

    if (elapsed >= total) {
      stopLoop();
      setState("idle");
      return;
    }

    frameHandle = scheduler.requestFrame(tick);
  }

  return {
    getState: () => state,

    setTracks(next) {
      tracks = next;
    },

    replayComparison() {
      if (disposed || tracks.length === 0) return;
      stopLoop();
      settledTracks.clear();
      // Snap both sides back to progress 0 before the clock starts, so neither
      // variant animates out of a half-finished pose.
      for (const track of tracks) {
        track.onFrame(0, { elapsed: 0, settled: false });
      }
      setState("playing");
      frameHandle = scheduler.requestFrame(tick);
    },

    resetComparison() {
      stopLoop();
      settledTracks.clear();
      for (const track of tracks) {
        track.onFrame(0, { elapsed: 0, settled: false });
      }
      setState("idle");
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispose() {
      disposed = true;
      stopLoop();
      listeners.clear();
      tracks = [];
    },
  };
}

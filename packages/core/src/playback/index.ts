import { transitionProgressAt, transitionTotalDuration } from "../transitions/index";
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

export interface PlaybackFrameInfo {
  /** Milliseconds on the shared clock since this replay started, speed applied. */
  elapsed: number;
  /** Milliseconds since *this* track started (its offset removed). */
  local: number;
  settled: boolean;
}

export interface PlaybackTrack {
  variant: VariantId;
  transition: TransitionConfig;
  /**
   * Milliseconds on the shared clock before this track begins. Used to play
   * A then B in the same place; still one clock, never a second timer.
   */
  offset?: number;
  /** Called with eased progress every frame. Progress may exceed 1 on a bouncy spring. */
  onFrame(progress: number, info: PlaybackFrameInfo): void;
  onSettled?(): void;
}

export interface PlaybackSnapshot {
  state: PlaybackState;
  paused: boolean;
  speed: number;
  loop: boolean;
}

export interface PlaybackController {
  getState(): PlaybackState;
  getSnapshot(): PlaybackSnapshot;
  /** Register the tracks taking part in the next comparison. */
  setTracks(tracks: PlaybackTrack[]): void;
  /** Reset every track to its start state, then play them from one clock. */
  replayComparison(): void;
  /** Stop playing and return every track to its start state. */
  resetComparison(): void;
  /**
   * Stop playing and show every track at rest. What a held comparison shows
   * between replays: an entrance's start pose is often invisible.
   */
  settleComparison(): void;
  /** Freeze on the current frame. */
  pause(): void;
  resume(): void;
  /** Slow motion: 1 is real time, 0.25 is four times slower. Safe mid-play. */
  setSpeed(speed: number): void;
  /** Replay continuously, holding briefly on the settled frame between runs. */
  setLoop(loop: boolean): void;
  /** Total length of the current comparison in clock milliseconds. */
  getTotalDuration(): number;
  subscribe(listener: (state: PlaybackState) => void): () => void;
  /** Every change to state, pause, speed or loop. */
  subscribeSnapshot(listener: (snapshot: PlaybackSnapshot) => void): () => void;
  /** Every frame, for playheads. Kept off React state on purpose. */
  subscribeFrame(listener: (elapsed: number, total: number) => void): () => void;
  dispose(): void;
}

export interface PlaybackOptions {
  speed?: number;
  loop?: boolean;
  /** Real-time milliseconds to hold the settled frame before a loop restarts. */
  loopDelay?: number;
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

const MIN_SPEED = 0.05;
const MAX_SPEED = 4;

/**
 * The shared synchronized playback engine.
 *
 * Every track is sampled from a single `t0` captured on the first animation
 * frame of a replay. There is deliberately no `setTimeout` per variant and no
 * second animation loop: a per-variant timer is exactly how an A/B comparison
 * starts lying to you, because the two sides drift by a frame or more and the
 * difference you are judging is no longer only the transition.
 *
 * Delay, per-track offset, slow motion, freeze and looping are all expressed
 * as arithmetic on that one clock.
 */
export function createPlaybackController(
  scheduler: Scheduler = createRafScheduler(),
  options: PlaybackOptions = {},
): PlaybackController {
  let tracks: PlaybackTrack[] = [];
  let state: PlaybackState = "idle";
  let paused = false;
  let speed = clampSpeed(options.speed ?? 1);
  let loop = options.loop ?? false;
  const loopDelay = options.loopDelay ?? 700;

  let frameHandle: unknown = null;
  /** Real-time origin of the clock, rebased whenever speed changes. */
  let startTime: number | null = null;
  let pausedElapsed = 0;
  /** The clock position last drawn, so a track joining late is drawn there too. */
  let lastElapsed = 0;
  /** Real time at which a loop hold ends, while holding. */
  let holdUntil: number | null = null;
  let disposed = false;

  const listeners = new Set<(state: PlaybackState) => void>();
  const snapshotListeners = new Set<(snapshot: PlaybackSnapshot) => void>();
  const frameListeners = new Set<(elapsed: number, total: number) => void>();
  const settledTracks = new Set<PlaybackTrack>();

  function clampSpeed(value: number) {
    return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Number.isFinite(value) ? value : 1));
  }

  function snapshot(): PlaybackSnapshot {
    return { state, paused, speed, loop };
  }

  function notifySnapshot() {
    const current = snapshot();
    for (const listener of snapshotListeners) listener(current);
  }

  function setState(next: PlaybackState) {
    if (state === next) return;
    state = next;
    for (const listener of listeners) listener(state);
    notifySnapshot();
  }

  function totalDuration() {
    return tracks.reduce(
      (longest, track) =>
        Math.max(longest, (track.offset ?? 0) + transitionTotalDuration(track.transition)),
      0,
    );
  }

  function drawTrack(track: PlaybackTrack, elapsed: number) {
    const local = elapsed - (track.offset ?? 0);
    const settled = local >= transitionTotalDuration(track.transition);
    const progress = local <= 0 ? 0 : transitionProgressAt(track.transition, local);
    track.onFrame(settled ? 1 : progress, { elapsed, local, settled });
  }

  function emitAt(elapsed: number) {
    lastElapsed = elapsed;
    for (const track of tracks) {
      const local = elapsed - (track.offset ?? 0);
      const settled = local >= transitionTotalDuration(track.transition);
      const progress = local <= 0 ? 0 : transitionProgressAt(track.transition, local);
      track.onFrame(settled ? 1 : progress, { elapsed, local, settled });
      if (settled && !settledTracks.has(track)) {
        settledTracks.add(track);
        track.onSettled?.();
      }
    }
    const total = totalDuration();
    for (const listener of frameListeners) listener(Math.min(elapsed, total), total);
  }

  function snapToStart() {
    lastElapsed = 0;
    settledTracks.clear();
    for (const track of tracks) {
      track.onFrame(0, { elapsed: 0, local: -(track.offset ?? 0), settled: false });
    }
    const total = totalDuration();
    for (const listener of frameListeners) listener(0, total);
  }

  function cancelFrame() {
    if (frameHandle !== null) {
      scheduler.cancelFrame(frameHandle);
      frameHandle = null;
    }
  }

  function stopLoop() {
    cancelFrame();
    startTime = null;
    holdUntil = null;
  }

  function tick(frameTime: number) {
    frameHandle = null;
    if (disposed || paused) return;

    if (holdUntil !== null) {
      if (frameTime < holdUntil) {
        frameHandle = scheduler.requestFrame(tick);
        return;
      }
      // The hold is over: restart from a fresh t0 on this frame.
      holdUntil = null;
      startTime = null;
      snapToStart();
    }

    // The first frame of a run defines t0 for every track at once.
    if (startTime === null) startTime = frameTime;
    const elapsed = (frameTime - startTime) * speed;

    emitAt(elapsed);

    if (elapsed >= totalDuration()) {
      if (loop) {
        holdUntil = frameTime + loopDelay;
        frameHandle = scheduler.requestFrame(tick);
        return;
      }
      stopLoop();
      setState("idle");
      return;
    }

    frameHandle = scheduler.requestFrame(tick);
  }

  return {
    getState: () => state,
    getSnapshot: snapshot,

    setTracks(next) {
      const joined = next.filter((track) => !tracks.includes(track));
      tracks = next;
      // A track that joins mid-comparison (a stage remounting, a variant
      // added) is drawn at the clock's current frame rather than left at
      // whatever pose it mounted in.
      for (const track of joined) drawTrack(track, lastElapsed);
    },

    replayComparison() {
      if (disposed || tracks.length === 0) return;
      stopLoop();
      paused = false;
      pausedElapsed = 0;
      // Snap every track back to progress 0 before the clock starts, so
      // nothing animates out of a half-finished pose.
      snapToStart();
      setState("playing");
      notifySnapshot();
      frameHandle = scheduler.requestFrame(tick);
    },

    resetComparison() {
      stopLoop();
      paused = false;
      pausedElapsed = 0;
      snapToStart();
      setState("idle");
      notifySnapshot();
    },

    settleComparison() {
      stopLoop();
      paused = false;
      pausedElapsed = 0;
      settledTracks.clear();
      emitAt(totalDuration());
      setState("idle");
      notifySnapshot();
    },

    pause() {
      if (state !== "playing" || paused) return;
      pausedElapsed = startTime === null ? 0 : (scheduler.now() - startTime) * speed;
      cancelFrame();
      paused = true;
      notifySnapshot();
    },

    resume() {
      if (!paused) return;
      paused = false;
      startTime = scheduler.now() - pausedElapsed / speed;
      notifySnapshot();
      if (state === "playing") frameHandle = scheduler.requestFrame(tick);
    },

    setSpeed(next) {
      const clamped = clampSpeed(next);
      if (clamped === speed) return;
      // Rebase the origin so the current frame stays where it is and only
      // the rate of time changes — a speed change must never jump.
      if (startTime !== null && !paused) {
        const now = scheduler.now();
        const elapsed = (now - startTime) * speed;
        startTime = now - elapsed / clamped;
      }
      speed = clamped;
      notifySnapshot();
    },

    setLoop(next) {
      if (loop === next) return;
      loop = next;
      notifySnapshot();
    },

    getTotalDuration: totalDuration,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    subscribeSnapshot(listener) {
      snapshotListeners.add(listener);
      return () => {
        snapshotListeners.delete(listener);
      };
    },

    subscribeFrame(listener) {
      frameListeners.add(listener);
      return () => {
        frameListeners.delete(listener);
      };
    },

    dispose() {
      disposed = true;
      stopLoop();
      listeners.clear();
      snapshotListeners.clear();
      frameListeners.clear();
      tracks = [];
    },
  };
}

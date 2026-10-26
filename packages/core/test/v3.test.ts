import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  animatedKeys,
  compactKeyframes,
  createInteraction,
  createManualScheduler,
  createPlaybackController,
  labelForStateChange,
  parseBlur,
  parseCssEasing,
  parseCssTime,
  parseTransform,
  type PlaybackTrack,
} from "../src/index";

function recorder(variant: "A" | "B", transition: PlaybackTrack["transition"], offset?: number) {
  const frames: Array<{ progress: number; elapsed: number; local: number }> = [];
  const track: PlaybackTrack = {
    variant,
    transition,
    ...(offset !== undefined ? { offset } : {}),
    onFrame: (progress, info) => frames.push({ progress, elapsed: info.elapsed, local: info.local }),
  };
  return { frames, track };
}

describe("playback: slow motion, freeze, loop, offset", () => {
  it("slows the shared clock without changing what the curve is", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler, { speed: 0.5 });
    const a = recorder("A", { type: "easing", duration: 100, ease: "linear" });
    controller.setTracks([a.track]);
    controller.replayComparison();
    scheduler.flush();
    scheduler.advance(100);
    assert.equal(a.frames.at(-1)?.progress, 0.5, "100ms of real time is 50ms at half speed");
    scheduler.advance(100);
    assert.equal(a.frames.at(-1)?.progress, 1);
    assert.equal(controller.getState(), "idle");
  });

  it("changes speed mid-play without a jump", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler);
    const a = recorder("A", { type: "easing", duration: 400, ease: "linear" });
    controller.setTracks([a.track]);
    controller.replayComparison();
    scheduler.flush();
    scheduler.advance(100);
    const before = a.frames.at(-1)?.elapsed ?? 0;
    controller.setSpeed(0.25);
    scheduler.advance(0);
    const after = a.frames.at(-1)?.elapsed ?? 0;
    assert.ok(Math.abs(after - before) < 1e-6, `expected no jump, went ${before} → ${after}`);
    scheduler.advance(100);
    assert.ok(Math.abs((a.frames.at(-1)?.elapsed ?? 0) - 125) < 1e-6);
  });

  it("freezes on the current frame and resumes from it", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler);
    const a = recorder("A", { type: "easing", duration: 300, ease: "linear" });
    controller.setTracks([a.track]);
    controller.replayComparison();
    scheduler.flush();
    scheduler.advance(100);
    controller.pause();
    const frozenCount = a.frames.length;
    scheduler.advance(500);
    assert.equal(a.frames.length, frozenCount, "no frames while frozen");
    assert.equal(controller.getSnapshot().paused, true);
    controller.resume();
    scheduler.advance(50);
    assert.ok(Math.abs((a.frames.at(-1)?.elapsed ?? 0) - 150) < 1e-6, "resumes at 100ms, not 600ms");
  });

  it("loops with a hold, staying on one clock", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler, { loop: true, loopDelay: 200 });
    const a = recorder("A", { type: "easing", duration: 100, ease: "linear" });
    controller.setTracks([a.track]);
    controller.replayComparison();
    scheduler.flush();
    scheduler.advance(100);
    assert.equal(a.frames.at(-1)?.progress, 1);
    assert.equal(controller.getState(), "playing", "a loop never goes idle");
    scheduler.advance(100);
    assert.equal(a.frames.at(-1)?.progress, 1, "holding the settled frame");
    scheduler.advance(150);
    assert.equal(a.frames.at(-1)?.progress, 0, "restarted from the start pose");
    controller.setLoop(false);
    scheduler.advance(100);
    scheduler.advance(10);
    assert.equal(controller.getState(), "idle");
  });

  it("plays A then B in sequence on the same clock", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler);
    const a = recorder("A", { type: "easing", duration: 100, ease: "linear" });
    const b = recorder("B", { type: "easing", duration: 100, ease: "linear" }, 150);
    controller.setTracks([a.track, b.track]);
    assert.equal(controller.getTotalDuration(), 250);
    controller.replayComparison();
    scheduler.flush();
    scheduler.advance(120);
    assert.equal(a.frames.at(-1)?.progress, 1);
    assert.equal(b.frames.at(-1)?.progress, 0, "B waits for its offset");
    assert.equal(b.frames.at(-1)?.local, -30);
    scheduler.advance(80);
    assert.equal(b.frames.at(-1)?.progress, 0.5);
  });

  it("reports elapsed to frame listeners for a playhead", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler);
    const a = recorder("A", { type: "easing", duration: 200, ease: "linear" });
    controller.setTracks([a.track]);
    const seen: Array<[number, number]> = [];
    controller.subscribeFrame((elapsed, total) => seen.push([elapsed, total]));
    controller.replayComparison();
    scheduler.flush();
    scheduler.advance(100);
    assert.deepEqual(seen.at(-1), [100, 200]);
  });
});

describe("css parsing", () => {
  it("reads times and timing functions", () => {
    assert.equal(parseCssTime("250ms"), 250);
    assert.equal(parseCssTime("0.35s, 1s"), 350);
    assert.equal(parseCssEasing("ease-out"), "easeOut");
    assert.deepEqual(parseCssEasing("cubic-bezier(0.23, 1, 0.32, 1), ease"), [0.23, 1, 0.32, 1]);
    assert.equal(parseCssEasing("linear(0, 0.5 30%, 1)"), null, "no bezier equivalent: say so");
    assert.equal(parseCssEasing("steps(4, end)"), null);
  });

  it("reads translate, scale and rotation from matrices and individual properties", () => {
    assert.deepEqual(parseTransform("none"), { x: 0, y: 0, scale: 1, rotate: 0 });
    assert.deepEqual(parseTransform("matrix(0.96, 0, 0, 0.96, 0, 20)"), {
      x: 0,
      y: 20,
      scale: 0.96,
      rotate: 0,
    });
    assert.deepEqual(parseTransform("none", { translate: "0px 12px", scale: "0.9" }), {
      x: 0,
      y: 12,
      scale: 0.9,
      rotate: 0,
    });
    assert.equal(parseTransform("matrix(0, 1, -1, 0, 0, 0)").rotate, 90);
    // Chromium reports CSS transition keyframes as function lists.
    assert.deepEqual(parseTransform("translateY(-6px) scale(0.97)"), {
      x: 0,
      y: -6,
      scale: 0.97,
      rotate: 0,
    });
    assert.deepEqual(parseTransform("translate(10px, 4px) rotate(0.5turn)"), {
      x: 10,
      y: 4,
      scale: 1,
      rotate: 180,
    });
    assert.equal(parseBlur("blur(4px) saturate(2)"), 4);
  });
});

describe("interactions", () => {
  it("labels state changes in authors' vocabulary", () => {
    assert.equal(labelForStateChange("aria-expanded", "false", "true"), "Closed → Open");
    assert.equal(labelForStateChange("aria-expanded", "true", "false"), "Open → Closed");
    assert.equal(labelForStateChange("data-state", "unchecked", "checked"), "Closed → Open");
    assert.equal(labelForStateChange("data-state", "idle", "loading"), "Idle → Loading");
    assert.equal(labelForStateChange("open", null, ""), "Closed → Open");
    assert.equal(labelForStateChange("hidden", "", null), "Show");
    assert.equal(labelForStateChange("class", "a", "b"), null);
  });

  it("keeps only the values that move", () => {
    const keyframes = compactKeyframes({
      from: { opacity: 0, y: 8, scale: 1 },
      to: { opacity: 1, y: 0, scale: 1 },
    });
    assert.deepEqual(keyframes, { from: { opacity: 0, y: 8 }, to: { opacity: 1, y: 0 } });
    assert.deepEqual(animatedKeys(keyframes), ["opacity", "y"]);
  });

  it("starts B as a spring at the captured pace, so the first replay asks a question", () => {
    const interaction = createInteraction({
      label: "Closed → Open",
      trigger: "state",
      properties: ["transform", "opacity"],
      keyframes: { from: { opacity: 0 }, to: { opacity: 1 } },
      current: { type: "easing", duration: 220, ease: "easeOut" },
    });
    assert.equal(interaction.experiment.variantA.transition.type, "easing");
    assert.equal(interaction.experiment.variantB.transition.type, "spring");
    assert.equal(interaction.experiment.variantA.name, "Current");
    assert.equal(interaction.experiment.variantB.name, "Experiment");
  });
});

describe("playback: settle", () => {
  it("shows every track at rest without playing", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler);
    const a = recorder("A", { type: "easing", duration: 100, ease: "linear" });
    const b = recorder("B", { type: "spring", stiffness: 300, damping: 20, mass: 1 });
    controller.setTracks([a.track, b.track]);
    controller.settleComparison();
    assert.equal(a.frames.at(-1)?.progress, 1);
    assert.equal(b.frames.at(-1)?.progress, 1);
    assert.equal(controller.getState(), "idle");
  });
});

describe("playback: late tracks", () => {
  it("draws a track that joins after a settle at the settled frame", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler);
    const a = recorder("A", { type: "easing", duration: 100, ease: "linear" });
    controller.setTracks([a.track]);
    controller.settleComparison();
    const drawnBefore = a.frames.length;
    const late = recorder("B", { type: "easing", duration: 100, ease: "linear" });
    controller.setTracks([a.track, late.track]);
    assert.equal(late.frames.at(-1)?.progress, 1, "joins at rest, not at the start pose");
    assert.equal(a.frames.length, drawnBefore, "existing tracks are not redrawn");
  });
});

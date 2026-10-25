import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chooseWinner,
  createExperiment,
  createManualScheduler,
  createMemoryStorage,
  createExperimentStorage,
  createPlaybackController,
  cubicBezier,
  deserializeExperiment,
  estimateSpringDuration,
  exportCSS,
  exportMotion,
  exportWinner,
  hasDivergence,
  interpolateMotionValues,
  matchPreset,
  normalizeTransition,
  parseMotionLabEnvelope,
  parseTransition,
  presetTransition,
  promoteWinner,
  serializeExperiment,
  setVariantTransition,
  springProgressAt,
  swapVariants,
  targetStorageKey,
  transitionProgressAt,
  envelope,
  type PlaybackTrack,
  type SpringTransition,
} from "../src/index";

const spring: SpringTransition = { type: "spring", stiffness: 280, damping: 24, mass: 1 };

describe("spring solver", () => {
  it("starts at rest and converges on the target", () => {
    assert.equal(springProgressAt(spring, 0), 0);
    assert.ok(springProgressAt(spring, 0.1) > 0);
    assert.ok(Math.abs(1 - springProgressAt(spring, 5)) < 0.001);
  });

  it("overshoots when under-damped and does not when over-damped", () => {
    const bouncy: SpringTransition = { type: "spring", stiffness: 380, damping: 14, mass: 0.9 };
    const overDamped: SpringTransition = { type: "spring", stiffness: 100, damping: 80, mass: 1 };

    let peak = 0;
    for (let ms = 0; ms <= 2000; ms += 4) peak = Math.max(peak, springProgressAt(bouncy, ms / 1000));
    assert.ok(peak > 1.05, `expected overshoot, saw peak ${peak}`);

    let overPeak = 0;
    for (let ms = 0; ms <= 4000; ms += 4) {
      overPeak = Math.max(overPeak, springProgressAt(overDamped, ms / 1000));
    }
    assert.ok(overPeak <= 1.0001, `expected no overshoot, saw peak ${overPeak}`);
  });

  it("honours initial velocity", () => {
    const launched: SpringTransition = { ...spring, velocity: 10 };
    assert.ok(springProgressAt(launched, 0.016) > springProgressAt(spring, 0.016));
  });

  it("estimates a bounded settle duration even for a pathological spring", () => {
    const duration = estimateSpringDuration({
      type: "spring",
      stiffness: 1,
      damping: 0,
      mass: 10,
    });
    assert.ok(duration <= 10_000);
    const normal = estimateSpringDuration(spring);
    assert.ok(normal > 0 && normal < 3000, `unexpected duration ${normal}`);
  });
});

describe("easing", () => {
  it("maps the endpoints exactly", () => {
    const ease = cubicBezier("easeInOut");
    assert.equal(ease(0), 0);
    assert.equal(ease(1), 1);
  });

  it("solves a known bezier mid-point", () => {
    const linear = cubicBezier("linear");
    assert.ok(Math.abs(linear(0.5) - 0.5) < 1e-6);
    const easeOut = cubicBezier("easeOut");
    assert.ok(easeOut(0.5) > 0.5, "ease-out should be ahead at the half-way point");
  });

  it("respects delay and duration", () => {
    const transition = { type: "easing", duration: 200, ease: "linear", delay: 100 } as const;
    assert.equal(transitionProgressAt(transition, 50), 0);
    assert.ok(Math.abs(transitionProgressAt(transition, 200) - 0.5) < 1e-6);
    assert.equal(transitionProgressAt(transition, 300), 1);
  });
});

describe("playback", () => {
  function track(variant: "A" | "B", transition: PlaybackTrack["transition"]) {
    const frames: Array<{ progress: number; elapsed: number }> = [];
    return {
      frames,
      track: {
        variant,
        transition,
        onFrame: (progress: number, info: { elapsed: number }) =>
          frames.push({ progress, elapsed: info.elapsed }),
      } satisfies PlaybackTrack,
    };
  }

  it("starts both variants from the same clock", () => {
    const scheduler = createManualScheduler(1000);
    const controller = createPlaybackController(scheduler);
    const a = track("A", { type: "easing", duration: 100, ease: "linear" });
    const b = track("B", { type: "easing", duration: 200, ease: "linear" });
    controller.setTracks([a.track, b.track]);

    controller.replayComparison();
    assert.equal(controller.getState(), "playing");
    // Both are snapped to 0 before the clock starts.
    assert.deepEqual(a.frames.at(0), { progress: 0, elapsed: 0 });
    assert.deepEqual(b.frames.at(0), { progress: 0, elapsed: 0 });

    // The first frame is what captures t0, so it lands at elapsed 0 whenever
    // it happens to fire. Everything after is measured from there.
    scheduler.flush();
    scheduler.advance(50);
    scheduler.advance(50);

    // Same elapsed values on both sides, frame for frame.
    assert.deepEqual(
      a.frames.map((frame) => frame.elapsed),
      b.frames.map((frame) => frame.elapsed),
    );
  });

  it("returns to idle only once the longest variant has settled", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler);
    const a = track("A", { type: "easing", duration: 100, ease: "linear" });
    const b = track("B", { type: "easing", duration: 400, ease: "linear" });
    controller.setTracks([a.track, b.track]);

    controller.replayComparison();
    scheduler.flush(); // captures t0
    scheduler.advance(100);
    assert.equal(controller.getState(), "playing", "A finished but B has not");
    assert.equal(a.frames.at(-1)?.progress, 1);

    scheduler.advance(300);
    assert.equal(controller.getState(), "idle");
    assert.equal(b.frames.at(-1)?.progress, 1);
  });

  it("resets both variants to their start state", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler);
    const a = track("A", { type: "easing", duration: 300, ease: "linear" });
    controller.setTracks([a.track]);

    controller.replayComparison();
    scheduler.flush(); // captures t0
    scheduler.advance(150);
    controller.resetComparison();

    assert.equal(controller.getState(), "idle");
    assert.equal(a.frames.at(-1)?.progress, 0);
  });

  it("offsets a delayed variant inside the one clock", () => {
    const scheduler = createManualScheduler();
    const controller = createPlaybackController(scheduler);
    const a = track("A", { type: "easing", duration: 100, ease: "linear" });
    const b = track("B", { type: "easing", duration: 100, ease: "linear", delay: 100 });
    controller.setTracks([a.track, b.track]);

    controller.replayComparison();
    scheduler.flush(); // captures t0
    scheduler.advance(100);

    const aAt100 = a.frames.at(-1);
    const bAt100 = b.frames.at(-1);
    assert.equal(aAt100?.progress, 1);
    assert.equal(bAt100?.progress, 0, "B has not started yet");
    assert.equal(aAt100?.elapsed, bAt100?.elapsed, "but both are on the same clock");
  });
});

describe("experiment model", () => {
  it("creates A and B identical so the first change is the only variable", () => {
    const experiment = createExperiment({ label: "Checkout Card", source: "react" });
    assert.equal(hasDivergence(experiment), false);
    assert.equal(experiment.winner, null);
    assert.equal(experiment.source, "react");
  });

  it("supports every A/B type combination", () => {
    let experiment = createExperiment();
    experiment = setVariantTransition(experiment, "A", spring);
    experiment = setVariantTransition(experiment, "B", {
      type: "easing",
      duration: 250,
      ease: "easeOut",
    });
    assert.equal(experiment.variantA.transition.type, "spring");
    assert.equal(experiment.variantB.transition.type, "easing");
    assert.ok(hasDivergence(experiment));
  });

  it("toggles and swaps the winner consistently", () => {
    let experiment = createExperiment();
    experiment = chooseWinner(experiment, "B");
    assert.equal(experiment.winner, "B");
    experiment = chooseWinner(experiment, "B");
    assert.equal(experiment.winner, null, "choosing the winner again clears it");

    experiment = setVariantTransition(experiment, "B", { ...spring, stiffness: 420 });
    experiment = chooseWinner(experiment, "B");
    const swapped = swapVariants(experiment);
    assert.equal(swapped.winner, "A", "the winner follows its configuration");
    assert.equal(swapped.variantA.transition, experiment.variantB.transition);
  });

  it("promotes the winner into the baseline and frees B for more tuning", () => {
    let experiment = createExperiment();
    const tuned: SpringTransition = { type: "spring", stiffness: 420, damping: 28, mass: 0.8 };
    experiment = setVariantTransition(experiment, "B", tuned);
    experiment = chooseWinner(experiment, "B");

    const promoted = promoteWinner(experiment);
    assert.deepEqual(promoted.variantA.transition, tuned);
    assert.deepEqual(promoted.variantB.transition, tuned);
    assert.equal(promoted.winner, null);
    assert.notEqual(
      promoted.variantA.transition,
      promoted.variantB.transition,
      "B must be a copy, not the same object",
    );
  });

  it("clamps out-of-range transitions instead of trusting them", () => {
    const normalized = normalizeTransition({
      type: "spring",
      stiffness: 99999,
      damping: -10,
      mass: 0,
    });
    assert.equal(normalized.type, "spring");
    if (normalized.type === "spring") {
      assert.equal(normalized.stiffness, 1000);
      assert.equal(normalized.damping, 0);
      assert.equal(normalized.mass, 0.1);
    }
  });
});

describe("interpolation", () => {
  it("interpolates every motion value and fills in the omitted ones", () => {
    const values = interpolateMotionValues(
      { from: { opacity: 0, y: 20, scale: 0.96 }, to: { opacity: 1, y: 0, scale: 1 } },
      0.5,
    );
    assert.equal(values.opacity, 0.5);
    assert.equal(values.y, 10);
    assert.equal(values.scale, 0.98);
    assert.equal(values.rotate, 0, "unspecified properties fall back to a no-op");
    assert.equal(values.x, 0);
  });

  it("lets a bouncy spring overshoot past the target", () => {
    const values = interpolateMotionValues({ from: { y: 100 }, to: { y: 0 } }, 1.1);
    assert.ok(values.y < 0, "overshoot must survive interpolation");
  });
});

describe("presets", () => {
  it("offers all five in both flavours", () => {
    for (const id of ["smooth", "snappy", "gentle", "bouncy", "heavy"]) {
      assert.ok(presetTransition(id, "spring"));
      assert.ok(presetTransition(id, "easing"));
    }
  });

  it("recognizes a preset still applied to a variant", () => {
    const snappy = presetTransition("snappy", "spring");
    assert.ok(snappy);
    assert.equal(matchPreset(snappy)?.id, "snappy");
    assert.equal(matchPreset({ ...spring, stiffness: 123 }), undefined);
  });
});

describe("export", () => {
  it("emits a Motion transition prop with seconds", () => {
    const result = exportMotion({ type: "easing", duration: 350, ease: [0.4, 0, 0.2, 1] });
    assert.match(result.code, /duration: 0\.35/);
    assert.match(result.code, /ease: \[0\.4, 0, 0\.2, 1\]/);
  });

  it("emits the spring shape developers paste back", () => {
    const result = exportMotion({
      type: "spring",
      stiffness: 420,
      damping: 28,
      mass: 0.8,
    });
    assert.match(result.code, /type: "spring"/);
    assert.match(result.code, /stiffness: 420/);
    assert.match(result.code, /damping: 28/);
    assert.match(result.code, /mass: 0\.8/);
  });

  it("does not pretend CSS can express a spring", () => {
    const result = exportCSS(spring, { from: { opacity: 0 }, to: { opacity: 1 } });
    assert.match(result.code, /linear\(/);
    assert.ok(result.caveat, "a spring CSS export must carry a caveat");
    assert.match(result.caveat, /cannot express spring physics/i);
  });

  it("exports exact CSS for an easing transition", () => {
    const result = exportCSS({ type: "easing", duration: 250, ease: "easeOut" });
    assert.match(result.code, /250ms cubic-bezier\(0, 0, 0\.58, 1\)/);
    assert.equal(result.caveat, undefined);
  });

  it("exports the winner, and nothing before one is chosen", () => {
    let experiment = createExperiment();
    assert.equal(exportWinner(experiment), null);
    experiment = setVariantTransition(experiment, "B", { ...spring, stiffness: 420 });
    experiment = chooseWinner(experiment, "B");
    const exported = exportWinner(experiment);
    assert.ok(exported);
    assert.match(exported.code, /stiffness: 420/);
  });
});

describe("serialization and persistence", () => {
  it("round-trips an experiment", () => {
    let experiment = createExperiment({ id: "checkout-card", label: "Checkout Card" });
    experiment = setVariantTransition(experiment, "B", { ...spring, stiffness: 420 });
    experiment = chooseWinner(experiment, "B");

    const restored = deserializeExperiment(serializeExperiment(experiment));
    assert.ok(restored);
    assert.equal(restored.id, "checkout-card");
    assert.equal(restored.winner, "B");
    assert.deepEqual(restored.variantB.transition, experiment.variantB.transition);
  });

  it("rejects malformed input rather than throwing", () => {
    assert.equal(deserializeExperiment("not json"), undefined);
    assert.equal(deserializeExperiment("{}"), undefined);
    assert.equal(deserializeExperiment(null), undefined);
    assert.equal(parseTransition({ type: "spring" }), undefined);
    assert.equal(parseTransition({ type: "easing", duration: 100, ease: "nope" }), undefined);
    assert.equal(parseTransition({ type: "wat" }), undefined);
  });

  it("keys targets and saves through an adapter", () => {
    assert.equal(targetStorageKey("Checkout Card"), "motionlab:target:checkout-card");
    const storage = createExperimentStorage(createMemoryStorage());
    const experiment = createExperiment({ id: "toast" });
    storage.save(targetStorageKey("toast"), experiment);
    assert.equal(storage.load(targetStorageKey("toast"))?.id, "toast");
    assert.deepEqual(storage.list(), ["motionlab:target:toast"]);
  });

  it("survives a storage adapter that throws", () => {
    const broken = createExperimentStorage({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      keys: () => {
        throw new Error("blocked");
      },
    });
    assert.equal(broken.load("x"), undefined);
    assert.doesNotThrow(() => broken.save("x", createExperiment()));
    assert.deepEqual(broken.list(), []);
  });
});

describe("extension bridge protocol", () => {
  it("accepts a well-formed message from the expected side", () => {
    const wire = JSON.parse(
      JSON.stringify(envelope("extension", { type: "GET_TARGETS" })),
    );
    assert.deepEqual(parseMotionLabEnvelope(wire, "extension"), { type: "GET_TARGETS" });
  });

  it("drops anything that is not ours, or comes from the wrong side", () => {
    assert.equal(parseMotionLabEnvelope({ type: "GET_TARGETS" }), undefined);
    assert.equal(parseMotionLabEnvelope({ protocol: "other", version: 1, from: "page" }), undefined);
    assert.equal(
      parseMotionLabEnvelope(envelope("page", { type: "GET_TARGETS" }), "extension"),
      undefined,
      "a page message must not be read as an extension command",
    );
    assert.equal(
      parseMotionLabEnvelope({ protocol: "motionlab", version: 99, from: "extension", message: {} }),
      undefined,
    );
  });

  it("validates an UPDATE_VARIANT payload field by field", () => {
    const valid = parseMotionLabEnvelope(
      envelope("extension", {
        type: "UPDATE_VARIANT",
        targetId: "checkout-card",
        variant: "B",
        transition: spring,
      }),
      "extension",
    );
    assert.equal(valid?.type, "UPDATE_VARIANT");

    const badVariant = parseMotionLabEnvelope(
      {
        protocol: "motionlab",
        version: 1,
        from: "extension",
        message: {
          type: "UPDATE_VARIANT",
          targetId: "x",
          variant: "C",
          transition: spring,
        },
      },
      "extension",
    );
    assert.equal(badVariant, undefined);

    const badTransition = parseMotionLabEnvelope(
      {
        protocol: "motionlab",
        version: 1,
        from: "extension",
        message: {
          type: "UPDATE_VARIANT",
          targetId: "x",
          variant: "A",
          transition: { type: "spring", stiffness: "a lot" },
        },
      },
      "extension",
    );
    assert.equal(badTransition, undefined);
  });
});

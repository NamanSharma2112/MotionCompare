import {
  compactKeyframes,
  labelForStateChange,
  parseBlur,
  parseCssEasing,
  parseTransform,
  type InteractionTrigger,
  type MotionKeyframes,
  type MotionValues,
  type TransitionConfig,
} from "@motionlab/core";
import { cloneForStage } from "./clone";
import { nameElement } from "./naming";

export interface CapturedMotion {
  label: string;
  trigger: InteractionTrigger;
  properties: string[];
  /** What the page does today, or null when nothing readable drove it. */
  transition: TransitionConfig | null;
  keyframes: MotionKeyframes;
  /** The element that moved — the stage replays over it. */
  subject: Element;
  /** A styled copy of the subject at rest, for the stage. */
  snapshot: HTMLElement | null;
  /** Said to the developer when the capture had to estimate something. */
  note?: string;
}

export interface RecorderHandlers {
  /** Live status for the recording view: what MotionLab has seen so far. */
  onSignal(text: string): void;
  onCaptured(motion: CapturedMotion): void;
}

export interface RecorderOptions {
  /** Quiet time after the last change before the burst counts as finished. */
  idleMs?: number;
  /** Elements MotionLab owns, so its own UI is never recorded. */
  ignore?(element: Element): boolean;
}

interface SeenAnimation {
  animation: Animation;
  element: Element;
  start: number;
  duration: number;
  delay: number;
  easing: string;
  keyframes: ComputedKeyframe[];
  properties: string[];
}

interface StyleSample {
  time: number;
  element: Element;
  opacity: string;
  transform: string;
}

const LABEL_ATTRIBUTES = [
  "aria-expanded",
  "data-state",
  "data-open",
  "open",
  "hidden",
  "aria-hidden",
  "aria-checked",
  "aria-selected",
  "aria-pressed",
];

const KEYFRAME_META = new Set(["offset", "computedOffset", "easing", "composite"]);

function animationTarget(animation: Animation): Element | null {
  const effect = animation.effect as KeyframeEffect | null;
  return effect && "target" in effect ? (effect.target as Element | null) : null;
}

function cssProperty(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** Read the values one keyframe sets for the properties MotionLab replays. */
function valuesFromKeyframe(frame: ComputedKeyframe | undefined): MotionValues {
  if (!frame) return {};
  const values: MotionValues = {};
  const record = frame as unknown as Record<string, string | number | null | undefined>;
  if (record.opacity !== undefined && record.opacity !== null) {
    const opacity = Number.parseFloat(String(record.opacity));
    if (Number.isFinite(opacity)) values.opacity = opacity;
  }
  const hasTransform = ["transform", "translate", "scale", "rotate"].some(
    (key) => record[key] !== undefined && record[key] !== null,
  );
  if (hasTransform) {
    const parsed = parseTransform(record.transform ? String(record.transform) : "none", {
      translate: record.translate ? String(record.translate) : null,
      scale: record.scale ? String(record.scale) : null,
      rotate: record.rotate ? String(record.rotate) : null,
    });
    Object.assign(values, parsed);
  }
  if (record.filter) {
    values.blur = parseBlur(String(record.filter));
  }
  return values;
}

/**
 * Watch a component while the developer uses it, and describe the first burst
 * of motion it performs.
 *
 * Every frame it asks `getAnimations({ subtree: true })`, which reports CSS
 * transitions, CSS animations and Web Animations API animations alike — the
 * motion the browser itself knows about. A MutationObserver supplies the
 * vocabulary (aria-expanded flipped, a node entered) and catches libraries
 * that animate by writing inline styles each frame. The page is only read,
 * never written.
 *
 * Returns a function that cancels the recording.
 */
export function recordInteraction(
  target: Element,
  handlers: RecorderHandlers,
  options: RecorderOptions = {},
): () => void {
  const idleMs = options.idleMs ?? 450;
  const ignore = options.ignore ?? (() => false);

  const seen = new Map<Animation, SeenAnimation>();
  const samples: StyleSample[] = [];
  let label: string | null = null;
  let trigger: InteractionTrigger = "unknown";
  let lastPointer: { type: string; time: number } | null = null;
  let firstActivity: number | null = null;
  let lastActivity = 0;
  let startSnapshot: { element: Element; clone: HTMLElement | null } | null = null;
  let frame = 0;
  let finished = false;

  function now() {
    return performance.now();
  }

  function markActivity(source: Element | null, reason: string) {
    const time = now();
    if (firstActivity === null) {
      firstActivity = time;
      // An exit removes the element; keep a copy from the first moment.
      const subject = source && source.isConnected ? source : target;
      startSnapshot = { element: subject, clone: cloneForStage(subject) };
      handlers.onSignal(`Motion detected · ${reason}`);
    }
    lastActivity = time;
  }

  function onPointer(event: Event) {
    lastPointer = { type: event.type, time: now() };
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const element = record.target instanceof Element ? record.target : null;
      if (element && ignore(element)) continue;

      if (record.type === "attributes" && element) {
        const attribute = record.attributeName ?? "";
        if (attribute === "style") {
          const style = (element as HTMLElement).style;
          if (style.opacity || style.transform) {
            samples.push({ time: now(), element, opacity: style.opacity, transform: style.transform });
            markActivity(element, "inline style");
          }
          continue;
        }
        if (LABEL_ATTRIBUTES.includes(attribute)) {
          const next = labelForStateChange(attribute, record.oldValue, element.getAttribute(attribute));
          if (next && !label) {
            label = next;
            trigger = "state";
          }
          markActivity(element, attribute);
        } else if (attribute === "class") {
          markActivity(element, "class change");
        }
      }

      if (record.type === "childList") {
        const added = Array.from(record.addedNodes).find((node): node is Element => node instanceof Element);
        const removed = Array.from(record.removedNodes).find((node): node is Element => node instanceof Element);
        if (added && !label) {
          label = "Enter";
          trigger = "enter";
          markActivity(added, "element added");
        } else if (removed && !label) {
          label = "Exit";
          trigger = "exit";
          markActivity(element, "element removed");
        }
      }
    }
  });

  observer.observe(target, {
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    childList: true,
  });
  target.addEventListener("pointerenter", onPointer, true);
  target.addEventListener("pointerleave", onPointer, true);
  target.addEventListener("pointerdown", onPointer, true);
  target.addEventListener("focusin", onPointer, true);

  function poll() {
    if (finished) return;
    const time = now();
    let running = false;

    let animations: Animation[] = [];
    try {
      animations = target.getAnimations({ subtree: true });
    } catch {
      animations = [];
    }

    for (const animation of animations) {
      const element = animationTarget(animation);
      if (!element || ignore(element)) continue;
      if (animation.playState === "running") running = true;
      if (seen.has(animation)) continue;

      const timing = animation.effect?.getComputedTiming();
      const effect = animation.effect as KeyframeEffect | null;
      let keyframes: ComputedKeyframe[] = [];
      try {
        keyframes = effect?.getKeyframes() ?? [];
      } catch {
        keyframes = [];
      }
      const properties = new Set<string>();
      if ("transitionProperty" in animation) {
        properties.add(String((animation as CSSTransition).transitionProperty));
      }
      for (const frameValues of keyframes) {
        for (const key of Object.keys(frameValues)) {
          if (!KEYFRAME_META.has(key)) properties.add(cssProperty(key));
        }
      }
      const name =
        "animationName" in animation ? `@${String((animation as CSSAnimation).animationName)}` : null;

      seen.set(animation, {
        animation,
        element,
        start: time,
        duration: typeof timing?.duration === "number" ? timing.duration : 0,
        delay: timing?.delay ?? 0,
        // A CSS transition keeps its timing function on the keyframe, not the
        // effect: the effect reports "linear" for every one of them.
        easing:
          keyframes[0]?.easing && keyframes[0].easing !== "linear"
            ? keyframes[0].easing
            : (timing?.easing ?? "linear"),
        keyframes,
        properties: [...properties],
      });
      markActivity(element, name ?? ([...properties].join(", ") || "animation"));
    }

    if (running) lastActivity = time;

    if (firstActivity !== null && !running && time - lastActivity > idleMs) {
      finish();
      return;
    }
    frame = requestAnimationFrame(poll);
  }

  function finish() {
    finished = true;
    cleanup();

    const animations = [...seen.values()];
    // The subject is the selected element when it moved itself, otherwise
    // the descendant that moved longest — usually the panel that opened.
    const own = animations.filter((entry) => entry.element === target);
    const pool = own.length > 0 ? own : animations;
    const primary = pool.reduce<SeenAnimation | null>(
      (best, entry) => (!best || entry.delay + entry.duration > best.delay + best.duration ? entry : best),
      null,
    );

    const subject =
      primary?.element ?? samples.at(-1)?.element ?? startSnapshot?.element ?? target;

    const properties = new Set<string>();
    for (const entry of animations) entry.properties.forEach((property) => properties.add(property));
    if (samples.length > 0) {
      if (samples.some((sample) => sample.opacity)) properties.add("opacity");
      if (samples.some((sample) => sample.transform)) properties.add("transform");
    }

    let transition: TransitionConfig | null = null;
    let note: string | undefined;
    let keyframes: MotionKeyframes = { from: {}, to: {} };

    if (primary) {
      const subjectAnimations = animations.filter((entry) => entry.element === primary.element);
      const from: MotionValues = {};
      const to: MotionValues = {};
      for (const entry of subjectAnimations) {
        Object.assign(from, valuesFromKeyframe(entry.keyframes[0]));
        Object.assign(to, valuesFromKeyframe(entry.keyframes.at(-1)));
      }
      keyframes = { from, to };

      const ease = parseCssEasing(primary.easing);
      transition = {
        type: "easing",
        duration: Math.round(primary.duration),
        ease: ease ?? "easeOut",
        ...(primary.delay > 0 ? { delay: Math.round(primary.delay) } : {}),
      };
      if (!ease) {
        note = `The page uses \`${primary.easing.slice(0, 40)}\`, which has no cubic-bezier equivalent. A starts from an ease-out at the same duration.`;
      }
    } else if (samples.length >= 2) {
      const subjectSamples = samples.filter((sample) => sample.element === subject);
      const first = subjectSamples[0] ?? samples[0]!;
      const last = subjectSamples.at(-1) ?? samples.at(-1)!;
      keyframes = {
        from: {
          ...(first.opacity ? { opacity: Number.parseFloat(first.opacity) } : {}),
          ...(first.transform ? parseTransform(first.transform) : {}),
        },
        to: {
          ...(last.opacity ? { opacity: Number.parseFloat(last.opacity) } : {}),
          ...(last.transform ? parseTransform(last.transform) : {}),
        },
      };
      transition = {
        type: "easing",
        duration: Math.max(60, Math.round(last.time - first.time)),
        ease: "easeOut",
      };
      note = "Animated by JavaScript writing inline styles each frame. The duration is measured; the curve is estimated.";
    }

    keyframes = compactKeyframes(keyframes);
    const animatesReplayable = Object.keys(keyframes.to).length > 0;
    if (!animatesReplayable) {
      note =
        properties.size > 0
          ? `This change animates ${[...properties].slice(0, 3).join(", ")}, which MotionLab cannot replay yet. The comparison uses a fade and rise at the same timing.`
          : "No transform or opacity change was found. The comparison uses a fade and rise.";
      keyframes = { from: { opacity: 0, y: 8 }, to: { opacity: 1, y: 0 } };
    }

    // Name it. A state attribute wins; otherwise the gesture that started it.
    let finalLabel = label;
    let finalTrigger = trigger;
    if (!finalLabel && lastPointer && firstActivity !== null && firstActivity - lastPointer.time < 400) {
      const map: Record<string, [string, InteractionTrigger]> = {
        pointerenter: ["Hover", "hover"],
        pointerleave: ["Hover out", "hover"],
        pointerdown: ["Press", "press"],
        focusin: ["Focus", "focus"],
      };
      const entry = map[lastPointer.type];
      if (entry) {
        finalLabel = entry[0];
        finalTrigger = entry[1];
      }
    }
    if (finalLabel && subject !== target && finalTrigger === "hover") {
      finalLabel = `${nameElement(subject).name} ${finalLabel.toLowerCase()}`;
    }

    const snapshot = subject.isConnected
      ? cloneForStage(subject)
      : (startSnapshot?.clone ?? null);

    handlers.onCaptured({
      label: finalLabel ?? "Interaction",
      trigger: finalTrigger,
      properties: [...properties].filter((property) => property !== "all"),
      transition,
      keyframes,
      subject,
      snapshot,
      ...(note ? { note } : {}),
    });
  }

  function cleanup() {
    cancelAnimationFrame(frame);
    observer.disconnect();
    target.removeEventListener("pointerenter", onPointer, true);
    target.removeEventListener("pointerleave", onPointer, true);
    target.removeEventListener("pointerdown", onPointer, true);
    target.removeEventListener("focusin", onPointer, true);
  }

  handlers.onSignal("Waiting for motion…");
  frame = requestAnimationFrame(poll);

  return () => {
    if (finished) return;
    finished = true;
    cleanup();
  };
}

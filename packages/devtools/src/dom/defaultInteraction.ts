import {
  createInteraction,
  parseCssEasing,
  parseCssTimeList,
  type MotionInteraction,
  type TransitionConfig,
} from "@motionlab/core";
import { cloneForStage } from "./clone";

export interface DefaultInteraction {
  interaction: MotionInteraction;
  subject: Element;
  snapshot: HTMLElement | null;
}

/**
 * An experiment you can compare the moment an element is selected — no
 * recording first.
 *
 * A is what the element declares today: its own CSS transition when it has
 * one (duration and curve read from computed style), otherwise a typical
 * 250ms ease-out. B is the same pace as a spring. The motion itself is a
 * plain entrance, a fade and a small rise, which the developer can edit; to
 * compare against what the element *really* does, they capture it instead.
 */
export function defaultInteractionFor(element: Element): DefaultInteraction {
  const computed = window.getComputedStyle(element);
  const durations = parseCssTimeList(computed.transitionDuration);
  const delays = parseCssTimeList(computed.transitionDelay);
  const longest = durations.reduce((best, value, index) => (value > (durations[best] ?? 0) ? index : best), 0);
  const duration = durations[longest] ?? 0;
  const curves = computed.transitionTimingFunction.split(/,(?![^(]*\))/);
  const declared = duration > 0;

  const current: TransitionConfig = declared
    ? {
        type: "easing",
        duration: Math.round(duration),
        ease: parseCssEasing(curves[longest] ?? curves[0] ?? "ease") ?? "easeOut",
        ...((delays[longest] ?? 0) > 0 ? { delay: Math.round(delays[longest] ?? 0) } : {}),
      }
    : { type: "easing", duration: 250, ease: "easeOut" };

  const interaction = createInteraction({
    label: "Entrance",
    trigger: "declared",
    properties: ["opacity", "transform"],
    keyframes: { from: { opacity: 0, y: 8 }, to: { opacity: 1, y: 0 } },
    current,
    source: "dom",
  });

  // Name A for what it actually is, so "Current" is never claimed for a guess.
  interaction.experiment = {
    ...interaction.experiment,
    variantA: { ...interaction.experiment.variantA, name: declared ? "Current" : "Ease out" },
    variantB: { ...interaction.experiment.variantB, name: "Spring" },
  };

  return { interaction, subject: element, snapshot: cloneForStage(element) };
}

import type { SpringTransition } from "../types/index";
import { clamp } from "../utils/index";

/**
 * Analytic solution of a damped harmonic oscillator, normalized so that
 * progress runs from 0 at t=0 to 1 at rest.
 *
 * Writing this out rather than stepping a simulation per frame means the
 * playback clock can ask for the progress at *any* time and get the same
 * answer — which is what lets variant A and variant B be sampled from one
 * shared clock instead of two independent integrators.
 */
export function springProgressAt(spring: SpringTransition, timeSeconds: number): number {
  if (timeSeconds <= 0) return 0;

  const mass = Math.max(spring.mass, 0.0001);
  const stiffness = Math.max(spring.stiffness, 0.0001);
  const damping = Math.max(spring.damping, 0);
  const velocity = spring.velocity ?? 0;

  const naturalFrequency = Math.sqrt(stiffness / mass);
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
  const t = timeSeconds;

  if (dampingRatio < 1 - 1e-6) {
    // Under-damped: oscillates towards rest. This is where bounce comes from.
    const dampedFrequency = naturalFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
    const envelope = Math.exp(-dampingRatio * naturalFrequency * t);
    const coefficient = (dampingRatio * naturalFrequency - velocity) / dampedFrequency;
    return (
      1 -
      envelope * (Math.cos(dampedFrequency * t) + coefficient * Math.sin(dampedFrequency * t))
    );
  }

  if (dampingRatio <= 1 + 1e-6) {
    // Critically damped: the fastest approach without overshoot.
    const envelope = Math.exp(-naturalFrequency * t);
    return 1 - envelope * (1 + (naturalFrequency - velocity) * t);
  }

  // Over-damped: crawls to rest, never crosses the target.
  const decay = naturalFrequency * Math.sqrt(dampingRatio * dampingRatio - 1);
  const envelope = Math.exp(-dampingRatio * naturalFrequency * t);
  const coefficient = (dampingRatio * naturalFrequency - velocity) / decay;
  return 1 - envelope * (Math.cosh(decay * t) + coefficient * Math.sinh(decay * t));
}

const MAX_SPRING_DURATION_MS = 10_000;
const durationCache = new Map<string, number>();

function springCacheKey(spring: SpringTransition): string {
  return [
    spring.stiffness,
    spring.damping,
    spring.mass,
    spring.velocity ?? 0,
    spring.restDelta ?? 0.001,
  ].join("/");
}

/**
 * How long the spring takes to settle, in milliseconds.
 *
 * A spring has no authored duration, so the playback engine has to discover
 * one to know when a replay is over. Sampled at 1ms and capped so a
 * pathological configuration (stiffness 1, damping 0) cannot hang the UI.
 */
export function estimateSpringDuration(spring: SpringTransition): number {
  const key = springCacheKey(spring);
  const cached = durationCache.get(key);
  if (cached !== undefined) return cached;

  const restDelta = spring.restDelta ?? 0.001;
  let settledFor = 0;
  let duration = MAX_SPRING_DURATION_MS;

  for (let ms = 0; ms <= MAX_SPRING_DURATION_MS; ms += 1) {
    const progress = springProgressAt(spring, ms / 1000);
    if (Math.abs(1 - progress) <= restDelta) {
      settledFor += 1;
      // Require a short run of settled samples so an oscillation that merely
      // passes through the target is not mistaken for coming to rest.
      if (settledFor >= 32) {
        duration = ms;
        break;
      }
    } else {
      settledFor = 0;
    }
  }

  durationCache.set(key, duration);
  return duration;
}

/** Peak progress reached, which is > 1 whenever the spring overshoots. */
export function springOvershoot(spring: SpringTransition): number {
  const duration = estimateSpringDuration(spring);
  let peak = 0;
  const step = Math.max(1, Math.round(duration / 240));
  for (let ms = 0; ms <= duration; ms += step) {
    peak = Math.max(peak, springProgressAt(spring, ms / 1000));
  }
  return clamp(peak, 0, 4);
}

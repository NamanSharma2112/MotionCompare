/** The query flag that activates MotionLab in a developer preview deployment. */
export const MOTIONLAB_QUERY_FLAG = "motionlab";

export interface EnablementInput {
  /** An explicit decision from the host app. Wins over everything else. */
  enabled?: boolean;
  /**
   * Opt in to `?motionlab` activation in a production build. Off by default:
   * MotionLab must never appear to a normal user by accident.
   */
  productionPreview?: boolean;
  isProduction: boolean;
  /** `window.location.search`, or undefined during SSR. */
  search?: string;
}

export function hasMotionLabQuery(search: string | undefined): boolean {
  if (!search) return false;
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    return params.has(MOTIONLAB_QUERY_FLAG);
  } catch {
    return false;
  }
}

/**
 * Decide whether MotionLab is active.
 *
 * The ordering is the production-safety rule, in code:
 *
 *   1. An explicit `enabled` prop is honoured as given.
 *   2. In development, MotionLab is on.
 *   3. In production it is off, and `?motionlab` alone is *not* enough — the
 *      developer must also have passed `productionPreview`.
 *
 * So a URL cannot summon the devtools on a deployment that did not ask for
 * them. `?motionlab=<token>` and signed preview sessions are deliberately
 * not implemented yet; this is the hook they would attach to.
 */
export function resolveEnabled({
  enabled,
  productionPreview,
  isProduction,
  search,
}: EnablementInput): boolean {
  if (typeof enabled === "boolean") return enabled;
  if (!isProduction) return true;
  return Boolean(productionPreview) && hasMotionLabQuery(search);
}

export function isProductionBuild(): boolean {
  // Read defensively: this runs in Next.js, in Vite, in a content script and
  // in plain `tsc` output, and `process` is not guaranteed in all of them.
  const env = typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
  return env === "production";
}

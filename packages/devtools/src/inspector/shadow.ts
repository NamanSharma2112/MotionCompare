"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { injectUiStyles } from "@motionlab/ui";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * A shadow root for MotionLab's own UI.
 *
 * The host element covers the viewport but ignores the pointer, so only the
 * panel itself receives events. Inside the shadow root the host page's CSS
 * cannot touch MotionLab, and MotionLab's cannot touch the page. In React a
 * portal into it keeps the app's context, so this costs nothing in
 * integration depth.
 */
export function useShadowContainer(id: string, active = true): HTMLElement | null {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    // Disabled means absent: not even an empty host element on the page.
    if (!active) return;
    const host = document.createElement("div");
    host.setAttribute(id, "");
    host.style.cssText =
      "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483000;contain:layout style";
    const shadow = host.attachShadow({ mode: "open" });
    injectUiStyles(shadow);
    const mount = document.createElement("div");
    shadow.appendChild(mount);
    document.documentElement.appendChild(host);
    setContainer(mount);
    return () => {
      host.remove();
      setContainer(null);
    };
  }, [id, active]);

  return container;
}

"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { ResolvedTheme, ThemePreference } from "./tokens";

interface UiRootContextValue {
  /** Where popovers, menus and tooltips portal to — inside our shadow root. */
  container: HTMLElement | null;
  theme: ResolvedTheme;
}

const UiRootContext = createContext<UiRootContextValue>({ container: null, theme: "dark" });

export function useUiRoot(): UiRootContextValue {
  return useContext(UiRootContext);
}

/** Follow the OS colour scheme unless the developer picked one. */
export function useResolvedTheme(preference: ThemePreference): ResolvedTheme {
  const [system, setSystem] = useState<ResolvedTheme>(() =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark",
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => setSystem(query.matches ? "light" : "dark");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return preference === "system" ? system : preference;
}

export interface UiRootProps {
  theme: ThemePreference;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * The root every MotionLab surface renders inside: theme, typography, and the
 * portal container Base UI needs so floating surfaces stay inside the shadow
 * root (and so inside MotionLab's styles) instead of escaping to the host
 * page's `document.body`.
 */
export function UiRoot({ theme, children, className, style }: UiRootProps) {
  const resolved = useResolvedTheme(theme);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <div
      className={className ? `mlui ${className}` : "mlui"}
      data-theme={resolved}
      style={style}
    >
      <UiRootContext.Provider value={{ container, theme: resolved }}>
        {/* Tooltips wait 450ms the first time, then open instantly while the
            pointer moves between neighbours — the toolbar feels faster
            without firing on every stray pass. */}
        <BaseTooltip.Provider delay={450} closeDelay={0} timeout={600}>
          {children}
        </BaseTooltip.Provider>
      </UiRootContext.Provider>
      <div ref={setContainer} className="mlui-portal" />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createInteraction, type MotionInteraction } from "@motionlab/core";
import { useMotionLabContext } from "@motionlab/react";
import { BrandMark, UiRoot, useResolvedTheme } from "@motionlab/ui";
import { VariantErrorBoundary } from "../comparison/VariantErrorBoundary";
import { cssPropertiesFor } from "../inspector/format";
import { Inspector } from "../inspector/Inspector";
import { useShadowContainer } from "../inspector/shadow";
import { DEFAULT_SETTINGS, type InspectorHost, type InspectorSettings } from "../inspector/types";
import { StageLayer } from "../stage/StageLayer";

export interface MotionLabDevtoolsProps {
  /** Open the panel on load. Handy while iterating on one component. */
  defaultOpen?: boolean;
}

const SETTINGS_KEY = "motionlab:settings";

function loadSettings(): InspectorSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<InspectorSettings>;
    return {
      theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : "system",
      dock: parsed.dock === "right" ? "right" : "float",
      position: {
        top: Number(parsed.position?.top) || DEFAULT_SETTINGS.position.top,
        right: Number(parsed.position?.right) || DEFAULT_SETTINGS.position.right,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const PORTAL_CSS_ID = "motionlab-stage-portal-css";

/** Portalled content inside a stage slot must stay clickable. */
function injectStagePortalCss() {
  if (document.getElementById(PORTAL_CSS_ID)) return;
  const style = document.createElement("style");
  style.id = PORTAL_CSS_ID;
  style.textContent = "[data-motionlab-portal] > * { pointer-events: auto; }";
  document.head.appendChild(style);
}

/**
 * The in-app devtools: a small launcher and the MotionLab inspector.
 *
 * Renders nothing unless MotionLab is enabled. The panel lives in a shadow
 * root so the app's CSS cannot restyle it; the component under test is
 * rendered in the app's own DOM (through a portal, so it keeps the app's
 * theme, router and context) and replayed where it appears on the page.
 */
export function MotionLabDevtools({ defaultOpen = false }: MotionLabDevtoolsProps) {
  const context = useMotionLabContext();
  const enabled = context?.enabled ?? false;
  const [open, setOpen] = useState(defaultOpen);
  const [settings, setSettings] = useState<InspectorSettings>(DEFAULT_SETTINGS);
  const container = useShadowContainer("data-motionlab-devtools", enabled);
  const theme = useResolvedTheme(settings.theme);

  useEffect(() => {
    if (!enabled) return;
    setSettings(loadSettings());
    injectStagePortalCss();
  }, [enabled]);

  // Opening a target from anywhere — including the browser extension's
  // native mode — brings the panel up.
  const openTargetId = context?.openTargetId ?? null;
  useEffect(() => {
    if (openTargetId) setOpen(true);
  }, [openTargetId]);

  const onSettingsChange = useCallback((next: InspectorSettings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked: settings last for the session */
    }
  }, []);

  const target = openTargetId ? context?.getTarget(openTargetId) : undefined;
  const experiment = context?.experiment ?? null;

  const interactions = useMemo<MotionInteraction[]>(() => {
    if (!target || !experiment) return [];
    const base = createInteraction({
      id: target.id,
      label: target.interaction ?? "Enter",
      trigger: "declared",
      properties: cssPropertiesFor(experiment.keyframes),
      keyframes: experiment.keyframes,
      current: experiment.variantA.transition,
      source: "react",
      saved: experiment,
    });
    return [base];
  }, [target, experiment]);

  const anchorElement = useMemo(() => {
    if (!target?.anchor || typeof document === "undefined") return null;
    try {
      return document.querySelector(target.anchor);
    } catch {
      return null;
    }
  }, [target]);

  if (!context || !enabled || !container) return null;

  const host: InspectorHost = {
    mode: "react",
    component: target
      ? {
          key: target.id,
          name: target.label,
          breadcrumb: [target.label],
          detail: target.anchor ?? target.id,
          mode: "react",
        }
      : null,
    components: context.targets.map((entry) => ({
      id: entry.id,
      label: entry.label,
      detail: entry.anchor ?? entry.id,
    })),
    onSelectComponent: (id) => context.openTarget(id),
    onChangeComponent: () => context.closeTarget(),
    interactions,
    onInteractionsChange(next) {
      const updated = next[0]?.experiment;
      if (updated) context.updateExperiment(updated);
    },
    renderStage(stage) {
      if (!target) return null;
      return createPortal(
        <StageLayer
          {...stage}
          theme={theme}
          anchor={anchorElement}
          interactive
          renderContent={(variant, portalContainer) => (
            // Called once per slot: A and B are separate instances with their
            // own state, refs and effects, each isolated by its own boundary.
            <VariantErrorBoundary variant={variant}>
              {target.render({ variant, portalContainer, playing: stage.visible })}
            </VariantErrorBoundary>
          )}
        />,
        document.body,
      );
    },
    settings,
    onSettingsChange,
    onClose() {
      context.closeTarget();
      setOpen(false);
    },
  };

  return createPortal(
    open ? (
      <Inspector host={host} />
    ) : (
      <UiRoot theme={settings.theme}>
        <button type="button" className="mlui-launcher" onClick={() => setOpen(true)} aria-label="Open MotionLab">
          <BrandMark />
          MotionLab
        </button>
      </UiRoot>
    ),
    container,
  );
}

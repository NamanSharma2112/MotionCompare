"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { injectDialKitStyles } from "@motionlab/dialkit";
import { useMotionLabContext } from "@motionlab/react";
import { ReactComparison } from "../comparison/ReactComparison";
import { TargetList } from "../target-list/TargetList";
import { injectDevtoolsStyles } from "../styles";

export interface MotionLabDevtoolsProps {
  /** Start with the picker open. Handy while iterating on one component. */
  defaultOpen?: boolean;
}

/**
 * The floating MotionLab launcher and the comparison overlay it opens.
 *
 * Renders `null` whenever MotionLab is not enabled, so a production build with
 * this mounted shows nothing and does nothing. Pair it with a dynamic import
 * if you also want it stripped from the bundle entirely.
 *
 * The overlay is portalled to `document.body` so it cannot be clipped by the
 * host app's layout — but it is still part of this React tree, which means the
 * component under test inherits the app's theme, design system, localization,
 * router and context exactly as it would in place.
 */
export function MotionLabDevtools({ defaultOpen = false }: MotionLabDevtoolsProps) {
  const context = useMotionLabContext();
  const [pickerOpen, setPickerOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const enabled = context?.enabled ?? false;
  const openTargetId = context?.openTargetId ?? null;

  // Styles go in only once MotionLab is actually on. A production page that
  // mounts the devtools and never enables them should end up with nothing
  // added to its document at all, not an unused stylesheet.
  useEffect(() => {
    if (!enabled) return;
    injectDialKitStyles();
    injectDevtoolsStyles();
  }, [enabled]);

  // Escape closes the picker when no comparison is open; the overlay handles
  // its own Escape through the shared keyboard hook.
  useEffect(() => {
    if (!enabled || !pickerOpen || openTargetId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, pickerOpen, openTargetId]);

  if (!context || !enabled || !mounted) return null;

  const { targets, openTarget, closeTarget, experiment, updateExperiment, getTarget } = context;
  const activeTarget = openTargetId ? getTarget(openTargetId) : undefined;

  return createPortal(
    <div className="ml dk">
      {!openTargetId ? (
        <>
          <button
            type="button"
            className="ml-launcher"
            onClick={() => setPickerOpen((open) => !open)}
            aria-expanded={pickerOpen}
          >
            <span className="ml-launcher-dot" aria-hidden="true" />
            MotionLab
          </button>

          {pickerOpen ? (
            <div className="ml-picker" role="dialog" aria-label="MotionLab targets">
              <div className="ml-picker-head">
                <span className="ml-picker-title">Targets</span>
                <span className="dk-hint">{targets.length}</span>
                <button
                  type="button"
                  className="ml-close"
                  onClick={() => setPickerOpen(false)}
                  aria-label="Close target list"
                >
                  ×
                </button>
              </div>
              <TargetList
                targets={targets}
                openTargetId={openTargetId}
                onSelect={(id) => {
                  openTarget(id);
                  setPickerOpen(false);
                }}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {openTargetId && experiment && activeTarget ? (
        <div className="ml-overlay" role="dialog" aria-modal="true" aria-label="MotionLab comparison">
          <ReactComparison
            experiment={experiment}
            target={activeTarget}
            onChange={updateExperiment}
            onClose={closeTarget}
          />
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

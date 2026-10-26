"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { MotionValues, TransitionConfig } from "@motionlab/core";
import { useMotionLabContext } from "../provider/context";
import type { MotionLabRender, MotionLabRenderContext } from "../types";

export interface MotionLabTargetProps {
  id: string;
  label?: string;
  /**
   * Renders the real component. Called once per variant, so A and B each get
   * their own instance with their own state, refs and effects.
   */
  render: MotionLabRender;
  from: MotionValues;
  to: MotionValues;
  transition?: TransitionConfig;
  portalContainer?: HTMLElement | null;
  stageWidth?: number;
  /**
   * Also render the component inline, where the target sits in the tree.
   * Off by default: registering a target is about making it *testable*, not
   * about putting it on the page.
   */
  renderInPlace?: boolean;
}

/**
 * Registers a real component with MotionLab.
 *
 * Renders nothing by default. The component is instantiated only when a
 * developer opens this target in the devtools, so leaving these in an app
 * costs a registry entry and no render work.
 */
export function MotionLabTarget({
  id,
  label,
  render,
  from,
  to,
  transition,
  portalContainer,
  stageWidth,
  renderInPlace = false,
}: MotionLabTargetProps): ReactNode {
  const context = useMotionLabContext();
  const enabled = context?.enabled ?? false;
  // Pulled out individually on purpose. The context *object* changes identity
  // every time any target registers, so depending on it below would make this
  // effect unregister and re-register forever.
  const registerTarget = context?.registerTarget;
  const unregisterTarget = context?.unregisterTarget;

  // `render` is nearly always a fresh arrow function (`render={() => <Card />}`),
  // so the registry stores a stable wrapper that reads the latest one through a
  // ref. Registering the function itself would either churn the registry on
  // every parent render, or capture a stale closure over the parent's props.
  const renderRef = useRef(render);
  renderRef.current = render;
  const stableRender = useMemo<MotionLabRender>(
    () => (renderContext: MotionLabRenderContext) => renderRef.current(renderContext),
    [],
  );

  // Serialized so a fresh-but-equal `from`/`to` object literal does not
  // re-register on every render.
  const keyframeKey = useMemo(() => JSON.stringify({ from, to }), [from, to]);
  const transitionKey = useMemo(() => JSON.stringify(transition ?? null), [transition]);
  const fromRef = useRef(from);
  const toRef = useRef(to);
  const transitionRef = useRef(transition);
  fromRef.current = from;
  toRef.current = to;
  transitionRef.current = transition;

  useEffect(() => {
    if (!enabled || !registerTarget || !unregisterTarget) return;
    const currentTransition = transitionRef.current;
    registerTarget({
      id,
      label: label ?? id,
      render: stableRender,
      from: fromRef.current,
      to: toRef.current,
      ...(currentTransition ? { transition: currentTransition } : {}),
      ...(portalContainer !== undefined ? { portalContainer } : {}),
      ...(stageWidth !== undefined ? { stageWidth } : {}),
    });
    return () => unregisterTarget(id);
  }, [
    registerTarget,
    unregisterTarget,
    enabled,
    id,
    label,
    stableRender,
    keyframeKey,
    transitionKey,
    portalContainer,
    stageWidth,
  ]);

  if (!renderInPlace) return null;
  return <>{render({ variant: "A", portalContainer: portalContainer ?? null, playing: false })}</>;
}

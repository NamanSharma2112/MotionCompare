"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  getVariant,
  type Experiment,
  type PlaybackTrack,
  type VariantId,
} from "@motionlab/core";
import { createStyleDriver } from "@motionlab/react";
import { dark, light, type ResolvedTheme } from "@motionlab/ui";
import { hideElement } from "../dom/picker";

export interface StageSlotSpec {
  variant: VariantId;
  /** "anchor" sits exactly over the real element; "beside" sits next to it. */
  position: "anchor" | "beside";
  label: string;
  sublabel: string;
  /** Visible only within [start, end) on the shared clock — used to play A then B in one place. */
  window?: [number, number];
  /** Milliseconds on the shared clock before this slot starts moving. */
  offset?: number;
}

export interface StageLayerProps {
  visible: boolean;
  experiment: Experiment;
  slots: StageSlotSpec[];
  showTags: boolean;
  theme: ResolvedTheme;
  /** The real element. Hidden while its stand-ins play, then restored. */
  anchor: Element | null;
  /** The panel's rect, so B is never placed underneath it. */
  avoidRect(): DOMRect | null;
  onTrackReady(variant: VariantId, track: PlaybackTrack | null): void;
  /**
   * React mode: render a fresh instance of the real component. Each slot has
   * its own portal container, so two instances of one modal never share a
   * root and fight over focus or scroll locking.
   */
  renderContent?(variant: VariantId, portalContainer: HTMLElement | null): ReactNode;
  /** DOM mode: append a fresh clone into the slot. Returns cleanup. */
  mountContent?(variant: VariantId, into: HTMLElement): () => void;
  /** Whether the content can be interacted with (React instances can). */
  interactive?: boolean;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GAP = 24;
const TAG_SPACE = 30;
const EDGE = 12;

function besideBox(a: Box, avoid: DOMRect | null): Box {
  const right = Math.min(window.innerWidth, avoid ? avoid.left : window.innerWidth) - EDGE;
  const candidates: Box[] = [
    { ...a, x: a.x + a.width + GAP },
    { ...a, x: a.x - a.width - GAP },
    { ...a, y: a.y + a.height + GAP + TAG_SPACE },
    { ...a, y: a.y - a.height - GAP - TAG_SPACE },
  ];
  const fits = candidates.find(
    (box) => box.x >= EDGE && box.x + box.width <= right && box.y >= TAG_SPACE && box.y + box.height <= window.innerHeight - EDGE,
  );
  return fits ?? { ...a, x: a.x + 20, y: a.y + 20 };
}

function canvasCenter(avoid: DOMRect | null): { x: number; y: number } {
  const right = avoid && avoid.left > window.innerWidth / 3 ? avoid.left : window.innerWidth;
  return { x: right / 2, y: window.innerHeight / 2 };
}

/**
 * The stage: stand-ins for the component, replayed where it lives.
 *
 * A sits exactly over the real element, which is hidden while the stand-in
 * plays and restored the moment it stops — so the page reads as the
 * component animating in place. In Compare, B sits beside it at the same
 * size (never under the panel), or in the same place one after the other
 * when sync is off. Styles are inline: in React mode this layer lives in the
 * host page so the component under test keeps the app's own CSS.
 */
export function StageLayer({
  visible,
  experiment,
  slots,
  showTags,
  theme,
  anchor,
  avoidRect,
  onTrackReady,
  renderContent,
  mountContent,
  interactive,
}: StageLayerProps) {
  const [anchorBox, setAnchorBox] = useState<Box | null>(null);
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);

  // Track the real element while the stage is up: scrolling or resizing must
  // not leave the stand-in behind.
  useLayoutEffect(() => {
    if (!visible) return;
    function measure() {
      if (!anchor || !anchor.isConnected) {
        setAnchorBox(null);
        return;
      }
      const rect = anchor.getBoundingClientRect();
      setAnchorBox({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    }
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [visible, anchor]);

  // Hide the real element only while a stand-in occupies its place.
  const occupiesAnchor = visible && anchor && slots.some((slot) => slot.position === "anchor");
  useLayoutEffect(() => {
    if (!occupiesAnchor || !anchor) return;
    return hideElement(anchor);
  }, [occupiesAnchor, anchor]);

  if (!visible) return null;

  const avoid = avoidRect();
  let boxA: Box | null = anchorBox;
  if (!boxA) {
    // No element on the page (a registered target that is not rendered):
    // centre the stand-in in the free part of the viewport.
    const size = measured ?? { width: 0, height: 0 };
    const center = canvasCenter(avoid);
    const twoUp = slots.some((slot) => slot.position === "beside");
    boxA = {
      x: center.x - size.width / 2 - (twoUp ? (size.width + GAP) / 2 : 0),
      y: center.y - size.height / 2,
      width: size.width,
      height: size.height,
    };
  }
  const boxB = besideBox(boxA, avoid);

  return (
    <div style={layerStyle} data-motionlab-stage="">
      {slots.map((slot) => (
        <StageSlot
          key={`${slot.variant}-${slot.position}`}
          slot={slot}
          box={slot.position === "anchor" ? boxA! : boxB}
          sized={Boolean(anchorBox)}
          experiment={experiment}
          showTag={showTags}
          theme={theme}
          interactive={interactive ?? false}
          onTrackReady={onTrackReady}
          {...(renderContent ? { renderContent } : {})}
          {...(mountContent ? { mountContent } : {})}
          {...(!anchorBox && slot.position === "anchor" ? { onMeasure: setMeasured } : {})}
        />
      ))}
    </div>
  );
}

const layerStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 2147482999,
};

interface StageSlotProps {
  slot: StageSlotSpec;
  box: Box;
  sized: boolean;
  experiment: Experiment;
  showTag: boolean;
  theme: ResolvedTheme;
  interactive: boolean;
  onTrackReady(variant: VariantId, track: PlaybackTrack | null): void;
  renderContent?(variant: VariantId, portalContainer: HTMLElement | null): ReactNode;
  mountContent?(variant: VariantId, into: HTMLElement): () => void;
  onMeasure?(size: { width: number; height: number }): void;
}

function StageSlot({
  slot,
  box,
  sized,
  experiment,
  showTag,
  theme,
  interactive,
  onTrackReady,
  renderContent,
  mountContent,
  onMeasure,
}: StageSlotProps) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const animatedRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const transitionRef = useRef(getVariant(experiment, slot.variant).transition);
  transitionRef.current = getVariant(experiment, slot.variant).transition;

  const keyframes = experiment.keyframes;
  const driver = useMemo(() => createStyleDriver(keyframes), [keyframes]);
  const [start, end] = slot.window ?? [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];

  useLayoutEffect(() => {
    const element = animatedRef.current;
    if (!element) return;
    driver.attach(element);
    const track: PlaybackTrack = {
      variant: slot.variant,
      get transition() {
        return transitionRef.current;
      },
      ...(slot.offset ? { offset: slot.offset } : {}),
      onFrame(progress, info) {
        driver.apply(progress);
        const node = slotRef.current;
        if (node) node.style.visibility = info.elapsed >= start && info.elapsed < end ? "visible" : "hidden";
      },
    };
    if (slotRef.current) slotRef.current.style.visibility = start <= 0 && end > 0 ? "visible" : "hidden";
    onTrackReady(slot.variant, track);
    return () => {
      onTrackReady(slot.variant, null);
      driver.release();
    };
  }, [driver, slot.variant, slot.offset, start, end, onTrackReady]);

  useLayoutEffect(() => {
    if (!mountContent || !mountRef.current) return;
    return mountContent(slot.variant, mountRef.current);
  }, [mountContent, slot.variant]);

  useEffect(() => {
    if (!onMeasure || !animatedRef.current) return;
    const node = animatedRef.current;
    const observer = new ResizeObserver(() => onMeasure({ width: node.offsetWidth, height: node.offsetHeight }));
    observer.observe(node);
    onMeasure({ width: node.offsetWidth, height: node.offsetHeight });
    return () => observer.disconnect();
  }, [onMeasure]);

  const colors = theme === "light" ? light : dark;

  return (
    <div
      ref={slotRef}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        transform: `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`,
        ...(sized ? { width: box.width, height: box.height } : {}),
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      {showTag ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: "calc(100% + 8px)",
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            height: 20,
            padding: "2px 7px",
            borderRadius: 5,
            background: colors.panel,
            boxShadow: `0 0 0 1px ${colors.ring}, ${colors.shadowPopover}`,
            font: `500 11px/16px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <span style={{ color: colors.text, fontWeight: 600 }}>{slot.label}</span>
          <span style={{ color: colors.muted, fontWeight: 400 }}>{slot.sublabel}</span>
        </div>
      ) : null}
      <div ref={animatedRef} style={sized ? { width: "100%", height: "100%" } : { display: "inline-block" }}>
        {renderContent ? renderContent(slot.variant, portalContainer) : <div ref={mountRef} />}
      </div>
      {renderContent ? (
        <div
          ref={setPortalContainer}
          data-motionlab-portal={slot.variant}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        />
      ) : null}
    </div>
  );
}

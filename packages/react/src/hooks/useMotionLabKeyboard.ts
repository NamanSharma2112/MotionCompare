"use client";

import { useEffect } from "react";

export interface MotionLabKeyboardHandlers {
  onReplay?(): void;
  onChooseA?(): void;
  onChooseB?(): void;
  onSwap?(): void;
  onClose?(): void;
  enabled?: boolean;
}

/**
 * True when the keystroke belongs to whatever the user is typing in.
 *
 * Without this check, typing "420" into a stiffness field would also choose a
 * winner and replay the comparison.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * The MotionLab keyboard layer: Space replays, A and B choose, S swaps,
 * Escape closes. Bound at the document so it works wherever focus sits
 * inside the overlay.
 */
export function useMotionLabKeyboard({
  onReplay,
  onChooseA,
  onChooseB,
  onSwap,
  onClose,
  enabled = true,
}: MotionLabKeyboardHandlers): void {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (isTypingTarget(event.target)) return;
      // Leave browser and OS shortcuts alone.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case " ":
        case "Spacebar":
          if (!onReplay) return;
          event.preventDefault();
          onReplay();
          return;
        case "a":
        case "A":
          onChooseA?.();
          return;
        case "b":
        case "B":
          onChooseB?.();
          return;
        case "s":
        case "S":
          onSwap?.();
          return;
        case "Escape":
          onClose?.();
          return;
        default:
          return;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, onReplay, onChooseA, onChooseB, onSwap, onClose]);
}

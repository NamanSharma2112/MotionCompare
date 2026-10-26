import type { MotionKeyframes } from "@motionlab/core";
import type { ReactNode } from "react";
import {
  CheckoutCard,
  NavbarMenu,
  SearchModal,
  Sidebar,
  Toast,
} from "./demo-components";

export interface PlaygroundEntry {
  id: string;
  label: string;
  description: string;
  /**
   * Returns a fresh element each call. It must be JSX, not a direct function
   * call: React has to mount two separate instances so A and B each get their
   * own state, refs and effects.
   */
  render(): ReactNode;
  keyframes: MotionKeyframes;
  stageWidth: number;
}

/**
 * The playground catalog.
 *
 * Each entry is the same shape a `<MotionLabTarget>` registers, so the
 * playground and the React SDK are two doors into one comparison rather than
 * two separate features. Keyframes differ per component because what reads as
 * correct motion for a toast is not what reads as correct for a sidebar.
 */
export const PLAYGROUND_CATALOG: PlaygroundEntry[] = [
  {
    id: "checkout-card",
    label: "Checkout Card",
    description: "Rises and settles. The canonical card entrance.",
    render: () => <CheckoutCard />,
    keyframes: { from: { opacity: 0, y: 20, scale: 0.96 }, to: { opacity: 1, y: 0, scale: 1 } },
    stageWidth: 260,
  },
  {
    id: "navbar-menu",
    label: "Navbar Menu",
    description: "Drops from the trigger. Short distance, needs to feel instant.",
    render: () => <NavbarMenu />,
    keyframes: { from: { opacity: 0, y: -8, scale: 0.98 }, to: { opacity: 1, y: 0, scale: 1 } },
    stageWidth: 240,
  },
  {
    id: "search-modal",
    label: "Search Modal",
    description: "Scales in from centre. Overshoot here reads as unserious.",
    render: () => <SearchModal />,
    keyframes: { from: { opacity: 0, scale: 0.94, blur: 4 }, to: { opacity: 1, scale: 1, blur: 0 } },
    stageWidth: 300,
  },
  {
    id: "toast",
    label: "Toast",
    description: "Slides in from the edge. A little bounce is welcome.",
    render: () => <Toast />,
    keyframes: { from: { opacity: 0, x: 40 }, to: { opacity: 1, x: 0 } },
    stageWidth: 280,
  },
  {
    id: "sidebar",
    label: "Sidebar",
    description: "Pushes in from the left. A large surface, so weight matters.",
    render: () => <Sidebar />,
    keyframes: { from: { opacity: 0, x: -32 }, to: { opacity: 1, x: 0 } },
    stageWidth: 200,
  },
];

export function getPlaygroundEntry(id: string): PlaygroundEntry | undefined {
  return PLAYGROUND_CATALOG.find((entry) => entry.id === id);
}

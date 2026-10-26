"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";
import { Kbd } from "./Kbd";
import { useUiRoot } from "./root";

export interface TooltipProps {
  label: ReactNode;
  shortcut?: string | string[];
  side?: "top" | "bottom" | "left" | "right";
  /** The trigger. Rendered through Base UI's `render` so no extra wrapper is added. */
  children: ReactElement;
}

/**
 * Short label plus the shortcut that does the same thing. Icon-only controls
 * are unreadable without these, and showing the key teaches the faster path.
 */
export function Tooltip({ label, shortcut, side = "top", children }: TooltipProps) {
  const { container } = useUiRoot();
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal container={container}>
        <BaseTooltip.Positioner side={side} sideOffset={6} collisionPadding={8}>
          <BaseTooltip.Popup className="mlui-tooltip">
            <span>{label}</span>
            {shortcut ? <Kbd keys={shortcut} /> : null}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

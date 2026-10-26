"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ReactElement, ReactNode } from "react";
import { useUiRoot } from "./root";

export interface PopoverProps {
  trigger: ReactElement;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?(open: boolean): void;
}

/** A Base UI popover, origin-aware: it scales out of whatever opened it. */
export function Popover({ trigger, children, side = "bottom", align = "start", open, onOpenChange }: PopoverProps) {
  const { container } = useUiRoot();
  return (
    <BasePopover.Root
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange ? { onOpenChange: (next: boolean) => onOpenChange(next) } : {})}
    >
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal container={container}>
        <BasePopover.Positioner side={side} align={align} sideOffset={6} collisionPadding={8}>
          <BasePopover.Popup className="mlui-popup">{children}</BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

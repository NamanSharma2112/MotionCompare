"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ReactElement, ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { Kbd } from "./Kbd";
import { useUiRoot } from "./root";

export interface MenuProps {
  trigger: ReactElement;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}

/** A Base UI menu, portalled into MotionLab's root and styled as one of its surfaces. */
export function Menu({ trigger, children, align = "end", side = "bottom" }: MenuProps) {
  const { container } = useUiRoot();
  return (
    // Non-modal: an inspector's menu should never lock the page behind it.
    <BaseMenu.Root modal={false}>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal container={container}>
        <BaseMenu.Positioner side={side} align={align} sideOffset={4} collisionPadding={8}>
          <BaseMenu.Popup className="mlui-popup">{children}</BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

export interface MenuItemProps {
  icon?: IconName;
  shortcut?: string | string[];
  disabled?: boolean;
  onSelect(): void;
  children: ReactNode;
}

export function MenuItem({ icon, shortcut, disabled, onSelect, children }: MenuItemProps) {
  return (
    <BaseMenu.Item className="mlui-menu-item" disabled={disabled} onClick={onSelect}>
      <span className="mlui-menu-item-icon">{icon ? <Icon name={icon} size={14} /> : null}</span>
      <span>{children}</span>
      {shortcut ? (
        <span className="mlui-menu-item-hint">
          <Kbd keys={shortcut} />
        </span>
      ) : null}
    </BaseMenu.Item>
  );
}

export interface MenuRadioProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; icon?: IconName }>;
  onChange(value: T): void;
}

export function MenuRadio<T extends string>({ label, value, options, onChange }: MenuRadioProps<T>) {
  return (
    <BaseMenu.Group>
      <BaseMenu.GroupLabel className="mlui-menu-label">{label}</BaseMenu.GroupLabel>
      <BaseMenu.RadioGroup value={value} onValueChange={(next) => onChange(next as T)}>
        {options.map((option) => (
          <BaseMenu.RadioItem
            key={option.value}
            value={option.value}
            className="mlui-menu-item"
            closeOnClick={false}
          >
            <span className="mlui-menu-item-icon">
              {option.icon ? <Icon name={option.icon} size={14} /> : null}
            </span>
            <span>{option.label}</span>
            <BaseMenu.RadioItemIndicator className="mlui-menu-item-hint" keepMounted={false}>
              <Icon name="check" size={13} />
            </BaseMenu.RadioItemIndicator>
          </BaseMenu.RadioItem>
        ))}
      </BaseMenu.RadioGroup>
    </BaseMenu.Group>
  );
}

export function MenuSeparator() {
  return <BaseMenu.Separator className="mlui-menu-sep" />;
}

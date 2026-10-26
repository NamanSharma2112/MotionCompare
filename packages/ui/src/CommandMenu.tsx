"use client";

import { Command } from "cmdk";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "./icons";
import { Kbd } from "./Kbd";

export interface CommandItem {
  id: string;
  label: string;
  group?: string;
  icon?: IconName;
  shortcut?: string | string[];
  keywords?: string[];
  disabled?: boolean;
  run(): void;
}

export interface CommandMenuProps {
  open: boolean;
  items: CommandItem[];
  onClose(): void;
}

/**
 * ⌘K. Opened from the keyboard many times a session, so it does not animate
 * in or out — it is simply there, which is what makes it feel instant.
 */
export function CommandMenu({ open, items, onClose }: CommandMenuProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const groups = new Map<string, CommandItem[]>();
  for (const item of items) {
    const group = item.group ?? "";
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }

  return (
    <div
      className="mlui-cmd-layer"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Command
        className="mlui-cmd"
        label="MotionLab commands"
        loop
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <Command.Input ref={inputRef} placeholder="Search MotionLab…" />
        <Command.List>
          <Command.Empty>No matching command.</Command.Empty>
          {[...groups.entries()].map(([group, entries]) => (
            <Command.Group key={group || "commands"} heading={group || undefined}>
              {entries.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  {...(item.keywords ? { keywords: item.keywords } : {})}
                  disabled={item.disabled}
                  onSelect={() => {
                    onClose();
                    item.run();
                  }}
                >
                  <span className="mlui-menu-item-icon">{item.icon ? <Icon name={item.icon} size={14} /> : null}</span>
                  <span>{item.label}</span>
                  {item.shortcut ? (
                    <span className="mlui-menu-item-hint">
                      <Kbd keys={item.shortcut} />
                    </span>
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}

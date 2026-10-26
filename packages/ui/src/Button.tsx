"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { Tooltip } from "./Tooltip";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  block?: boolean;
  icon?: IconName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", block, icon, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className="mlui-btn"
      data-variant={variant}
      data-size={size}
      data-block={block ? "" : undefined}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 12 : 14} /> : null}
      {children}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon?: IconName;
  /** Accessible name and tooltip text. Required: an icon alone names nothing. */
  label: string;
  shortcut?: string | string[];
  active?: boolean;
  size?: "sm" | "md";
  tooltipSide?: "top" | "bottom" | "left" | "right";
  /** Text in place of an icon, e.g. a speed readout. */
  text?: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, shortcut, active, size = "md", tooltipSide, text, type = "button", ...rest },
  ref,
) {
  return (
    <Tooltip label={label} {...(shortcut ? { shortcut } : {})} {...(tooltipSide ? { side: tooltipSide } : {})}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={active === undefined ? undefined : active}
        className={text ? "mlui-icon-btn mlui-icon-btn-text" : "mlui-icon-btn"}
        data-size={size}
        data-active={active ? "" : undefined}
        {...rest}
      >
        {text ?? (icon ? <Icon name={icon} size={size === "sm" ? 13 : 15} /> : null)}
      </button>
    </Tooltip>
  );
});

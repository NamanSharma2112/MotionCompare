/**
 * @motionlab/ui — the instrument's design system.
 *
 * Tokens, a scoped stylesheet, and the primitives every MotionLab surface is
 * built from. Floating parts (tooltips, menus, popovers) come from Base UI,
 * the command menu from cmdk, icons from lucide; everything is styled here so
 * the extension and the in-app devtools cannot drift apart.
 */
export * from "./tokens";
export { UI_CSS, injectUiStyles } from "./styles";
export { UiRoot, useUiRoot, useResolvedTheme, type UiRootProps } from "./root";
export { Icon, BrandMark, icons, type IconName, type IconProps } from "./icons";
export { Kbd, formatKey, isMac } from "./Kbd";
export { Tooltip, type TooltipProps } from "./Tooltip";
export { Button, IconButton, type ButtonProps, type IconButtonProps } from "./Button";
export { NumberField, type NumberFieldProps } from "./NumberField";
export { Slider, type SliderProps } from "./Slider";
export { Parameter, type ParameterProps } from "./Parameter";
export { SegmentedControl, type SegmentedControlProps, type SegmentedOption } from "./SegmentedControl";
export { Switch, type SwitchProps } from "./Switch";
export { ChipGroup, type ChipGroupProps, type ChipOption } from "./Chips";
export { Section, InspectorRow, EmptyState, StatusDot, Badge, type SectionProps } from "./Layout";
export { PropertyRow, InteractionRow, type PropertyRowProps, type InteractionRowProps } from "./Rows";
export { Menu, MenuItem, MenuRadio, MenuSeparator, type MenuProps, type MenuItemProps } from "./Menu";
export { Popover, type PopoverProps } from "./Popover";
export { CommandMenu, type CommandItem, type CommandMenuProps } from "./CommandMenu";
export { MiniTimeline, CurvePlot, type TimelineLane, type MiniTimelineProps } from "./Timeline";
export { useToast } from "./Toast";
export { formatNumber, clampNumber, snapToStep } from "./number";

import type { LucideIcon, LucideProps } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Columns2,
  Copy,
  Crosshair,
  Ellipsis,
  Maximize2,
  Monitor,
  Moon,
  PanelRight,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Sun,
  Trash2,
  X,
} from "lucide-react";

/**
 * The one icon set. Lucide, 1.5px stroke, 14px by default — every icon in
 * MotionLab goes through this so stroke and size never drift between
 * surfaces.
 */
export const icons = {
  replay: RotateCcw,
  play: Play,
  pause: Pause,
  loop: Repeat,
  compare: Columns2,
  more: Ellipsis,
  back: ChevronLeft,
  expand: ChevronDown,
  add: Plus,
  check: Check,
  copy: Copy,
  inspect: Crosshair,
  focus: Maximize2,
  timeline: ArrowUpRight,
  arrow: ArrowRight,
  close: X,
  search: Search,
  remove: Trash2,
  themeSystem: Monitor,
  themeLight: Sun,
  themeDark: Moon,
  dock: PanelRight,
  float: PictureInPicture2,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 14, strokeWidth = 1.5, ...rest }: IconProps) {
  const Component = icons[name];
  return <Component size={size} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />;
}

/**
 * The MotionLab mark: a ring with an offset dot — something in motion inside
 * a frame. Authored rather than a glyph so it renders identically everywhere.
 */
export function BrandMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      className="mlui-brand-mark"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10.25" cy="8" r="2.25" fill="currentColor" />
    </svg>
  );
}

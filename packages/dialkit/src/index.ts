/**
 * DialKit — MotionLab's low-level tuning layer.
 *
 * The split of responsibility is deliberate: DialKit owns parameters, spring
 * and easing controls, physics readouts and the timeline. MotionLab owns
 * selection, comparison, the workflow, the experiment and export. Every
 * MotionLab surface tunes motion through these same controls.
 */
export { tokens, variantColor } from "./tokens";
export { DIALKIT_CSS, injectDialKitStyles } from "./styles";
export { Dial, type DialProps } from "./Dial";
export { Timeline, type TimelineProps } from "./Timeline";
export { SpringControls, type SpringControlsProps } from "./SpringControls";
export { EasingControls, type EasingControlsProps } from "./EasingControls";
export { TransitionControls, type TransitionControlsProps } from "./TransitionControls";

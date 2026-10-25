/**
 * @motionlab/devtools — the MotionLab UI.
 *
 * One comparison shell, two front-ends: `MotionLabDevtools` mounts it inside a
 * developer's own application, and `DomComparison` mounts it over an arbitrary
 * page from the browser extension. Both run the same core engine and the same
 * DialKit controls.
 */
export { MotionLabDevtools, type MotionLabDevtoolsProps } from "./overlay/MotionLabDevtools";
export { ComparisonShell, type ComparisonShellProps } from "./comparison/ComparisonShell";
export { ReactComparison, type ReactComparisonProps } from "./comparison/ReactComparison";
export { VariantStage, type VariantStageProps } from "./comparison/VariantStage";
export {
  VariantErrorBoundary,
  type VariantErrorBoundaryProps,
} from "./comparison/VariantErrorBoundary";
export { DomComparison, type DomComparisonProps } from "./dom/DomComparison";
export { DomVariantStage, type DomVariantStageProps } from "./dom/DomVariantStage";
export { TargetList, type TargetListProps } from "./target-list/TargetList";
export { ExportPanel, type ExportPanelProps } from "./controls/ExportPanel";
export { DEVTOOLS_CSS, injectDevtoolsStyles } from "./styles";

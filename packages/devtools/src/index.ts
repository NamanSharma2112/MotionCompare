/**
 * @motionlab/devtools — the MotionLab UI.
 *
 * One inspector, two front-ends: `MotionLabDevtools` mounts it inside a
 * developer's own application over registered React targets, and the browser
 * extension mounts it over any page in DOM mode. Both run the same core
 * engine, the same stage and the same primitives from `@motionlab/ui`.
 */
export { MotionLabDevtools, type MotionLabDevtoolsProps } from "./overlay/MotionLabDevtools";
export { Inspector } from "./inspector/Inspector";
export {
  DEFAULT_SETTINGS,
  type CaptureHandlers,
  type InspectedComponent,
  type InspectorHost,
  type InspectorSettings,
  type InspectorStageProps,
} from "./inspector/types";
export { useShadowContainer } from "./inspector/shadow";
export { cssPropertiesFor, transitionSummary } from "./inspector/format";
export { StageLayer, type StageLayerProps, type StageSlotSpec } from "./stage/StageLayer";
export { startPicker, hideElement, type PickerHandle, type PickerOptions } from "./dom/picker";
export { recordInteraction, type CapturedMotion, type RecorderHandlers } from "./dom/recorder";
export { cloneForStage } from "./dom/clone";
export {
  breadcrumbFor,
  elementPath,
  meaningfulClass,
  nameElement,
  selectorFor,
  type PathEntry,
} from "./dom/naming";

// The playground's comparison layout, kept until the playground moves to the
// inspector primitives too.
export { ComparisonShell, type ComparisonShellProps } from "./comparison/ComparisonShell";
export { VariantStage, type VariantStageProps } from "./comparison/VariantStage";
export {
  VariantErrorBoundary,
  type VariantErrorBoundaryProps,
} from "./comparison/VariantErrorBoundary";
export { ExportPanel, type ExportPanelProps } from "./controls/ExportPanel";
export { DEVTOOLS_CSS, injectDevtoolsStyles } from "./styles";

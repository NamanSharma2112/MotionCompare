/**
 * @motionlab/react — the React SDK.
 *
 * Wrap the app in `<MotionLabProvider>`, register real components with
 * `<MotionLabTarget>`, and open them from `<MotionLabDevtools>` (in
 * `@motionlab/devtools`). The comparison itself is run by `@motionlab/core`.
 */
export { MotionLabProvider, type MotionLabProviderProps } from "./provider/MotionLabProvider";
export { MotionLabContext, useMotionLab, useMotionLabContext } from "./provider/context";
export {
  MOTIONLAB_QUERY_FLAG,
  hasMotionLabQuery,
  isProductionBuild,
  resolveEnabled,
  type EnablementInput,
} from "./provider/enablement";
export { MotionLabTarget, type MotionLabTargetProps } from "./target/MotionLabTarget";
export {
  MotionLabAnimator,
  type MotionLabAnimatorHandle,
  type MotionLabAnimatorProps,
} from "./animator/MotionLabAnimator";
export {
  createPageBridge,
  MOTIONLAB_GLOBAL,
  type MotionLabPageGlobal,
  type PageBridgeHandlers,
} from "./bridge/pageBridge";
export {
  createStyleDriver,
  motionValuesToStyle,
  type MotionStyle,
  type StyleDriver,
} from "./style";
export { usePlayback, type UsePlaybackResult } from "./hooks/usePlayback";
export {
  useMotionLabKeyboard,
  type MotionLabKeyboardHandlers,
} from "./hooks/useMotionLabKeyboard";
export { useExperimentActions } from "./hooks/useExperiment";
export { useTargets } from "./hooks/useTargets";
export { useClipboard } from "./hooks/useClipboard";
export type {
  MotionLabContextValue,
  MotionLabRender,
  MotionLabRenderContext,
  MotionLabTargetDefinition,
} from "./types";

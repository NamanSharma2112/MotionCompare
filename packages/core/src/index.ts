/**
 * @motionlab/core — the one comparison engine.
 *
 * This package knows about variants, transitions, playback, winners, presets
 * and experiments. It deliberately knows nothing about React, the DOM, the
 * browser or Next.js; those live in the adapters that sit on top of it:
 * `@motionlab/react`, `@motionlab/devtools` and the browser extension.
 */

export * from "./types/index";
export * from "./utils/index";
export * from "./transitions/index";
export * from "./presets/index";
export * from "./comparison/index";
export * from "./playback/index";
export * from "./exporters/index";
export * from "./serialization/index";
export * from "./persistence/index";
export * from "./bridge/index";
export * from "./interactions/index";
export * from "./decisions/index";

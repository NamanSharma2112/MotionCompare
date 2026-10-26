/**
 * motionlab/server — the dev-only route that saves decisions into your
 * project for a coding agent to apply. Server code only; never imported by
 * the client entry.
 *
 *   // app/api/motionlab/route.ts
 *   import { createMotionLabHandlers } from "motionlab/server";
 *   export const { GET, POST } = createMotionLabHandlers();
 */
export * from "@motionlab/server";

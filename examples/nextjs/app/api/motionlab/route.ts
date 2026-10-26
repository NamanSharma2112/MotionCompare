import { createMotionLabHandlers } from "motionlab/server";

// Dev-only: "Send to AI" saves decisions to motionlab/decisions.json here.
const handlers = createMotionLabHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;

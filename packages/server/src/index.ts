import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  parseDecision,
  parseDecisionFile,
  upsertDecision,
  type DecisionFile,
} from "@motionlab/core";

export const DEFAULT_DECISIONS_FILE = "motionlab/decisions.json";
const MAX_BODY_BYTES = 64 * 1024;

export interface MotionLabHandlerOptions {
  /** Where decisions are written, relative to the project root. */
  file?: string;
  /** Project root. Defaults to `process.cwd()`, which is the app root under `next dev`. */
  root?: string;
  /** Overridable for tests; production is always refused. */
  isProduction?: boolean;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/**
 * The route that lets MotionLab save a decision into your repository, where a
 * coding agent can read it — `motionlab/decisions.json` by default.
 *
 * Next.js App Router:
 *
 *   // app/api/motionlab/route.ts
 *   export const { GET, POST } = createMotionLabHandlers();
 *
 * It refuses to run in production: it writes to disk, and only a developer's
 * own dev server should ever do that. Bodies are size-limited and rebuilt
 * from validated fields, and the target file must sit inside the project.
 */
export function createMotionLabHandlers(options: MotionLabHandlerOptions = {}) {
  const root = resolve(/*turbopackIgnore: true*/ options.root ?? process.cwd());
  const target = resolve(/*turbopackIgnore: true*/ root, options.file ?? DEFAULT_DECISIONS_FILE);
  const insideRoot = !relative(root, target).startsWith("..") && !isAbsolute(relative(root, target));
  const production = () => options.isProduction ?? process.env.NODE_ENV === "production";

  async function read(): Promise<DecisionFile> {
    try {
      return parseDecisionFile(await readFile(/*turbopackIgnore: true*/ target, "utf8"));
    } catch {
      return { version: 1, decisions: [] };
    }
  }

  async function write(file: DecisionFile): Promise<void> {
    await mkdir(/*turbopackIgnore: true*/ dirname(target), { recursive: true });
    // Write then rename, so an agent reading mid-save never sees half a file.
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(/*turbopackIgnore: true*/ temporary, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(/*turbopackIgnore: true*/ temporary, target);
  }

  return {
    async GET(): Promise<Response> {
      if (production()) return json({ error: "MotionLab is disabled in production." }, 404);
      return json({ file: relative(root, target), ...(await read()) });
    },

    async POST(request: Request): Promise<Response> {
      if (production()) return json({ error: "MotionLab is disabled in production." }, 404);
      if (!insideRoot) return json({ error: "Decisions file must be inside the project." }, 500);

      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > MAX_BODY_BYTES) return json({ error: "Decision too large." }, 413);

      let body: unknown;
      try {
        const text = await request.text();
        if (text.length > MAX_BODY_BYTES) return json({ error: "Decision too large." }, 413);
        body = JSON.parse(text);
      } catch {
        return json({ error: "Expected a JSON decision." }, 400);
      }

      const decision = parseDecision(body);
      if (!decision) return json({ error: "That is not a MotionLab decision." }, 400);

      const next = upsertDecision(await read(), decision);
      await write(next);
      return json({ saved: true, file: relative(root, target), decision });
    },
  };
}

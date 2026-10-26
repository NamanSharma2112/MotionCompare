/**
 * Bundle the extension.
 *
 * The packages are consumed as TypeScript source, so esbuild does the
 * compiling — which also means the extension and the React SDK are built from
 * exactly the same core, rather than from a published artifact that could
 * drift behind it.
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const outdir = join(root, "dist");
const watch = process.argv.includes("--watch");

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

/** @type {import("esbuild").BuildOptions} */
const shared = {
  outdir,
  bundle: true,
  target: ["chrome111"],
  platform: "browser",
  jsx: "automatic",
  // Chrome extensions ship the React they run with; the development build
  // would warn about devtools and cost ~400KB for nothing.
  define: { "process.env.NODE_ENV": '"production"' },
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
};

const builds = [
  // The service worker is declared `"type": "module"`, and the popup loads
  // through a module script tag.
  {
    ...shared,
    format: "esm",
    entryPoints: {
      background: join(root, "background/index.ts"),
      popup: join(root, "popup/index.tsx"),
    },
  },
  // The content script is injected by `chrome.scripting.executeScript`, which
  // runs files as classic scripts — an ES module there is a syntax error.
  {
    ...shared,
    format: "iife",
    entryPoints: { content: join(root, "content/index.tsx") },
  },
];

function copyStatic() {
  cpSync(join(root, "manifest.json"), join(outdir, "manifest.json"));
  cpSync(join(root, "popup/popup.html"), join(outdir, "popup.html"));
}

if (watch) {
  for (const options of builds) {
    const context = await esbuild.context(options);
    await context.watch();
  }
  copyStatic();
  console.log("[MotionLab] Watching. Load apps/extension/dist as an unpacked extension.");
} else {
  for (const options of builds) await esbuild.build(options);
  copyStatic();
  console.log("[MotionLab] Built to apps/extension/dist");
}

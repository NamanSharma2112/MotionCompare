/**
 * Bundle the TypeScript tests with esbuild, then hand them to `node --test`.
 *
 * Node can strip types but does not rewrite import paths, and the packages are
 * consumed as TypeScript source (no build step) — so bundling first is the
 * shortest path to running the real source under the real test runner.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { globSync } from "node:fs";
import * as esbuild from "esbuild";

const entryPoints = globSync("packages/*/test/**/*.test.ts");
if (entryPoints.length === 0) {
  console.error("No test files found.");
  process.exit(1);
}

const outdir = mkdtempSync(join(tmpdir(), "motionlab-tests-"));

try {
  await esbuild.build({
    entryPoints,
    outdir,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    sourcemap: "inline",
    external: ["node:*"],
    logLevel: "warning",
  });

  const result = spawnSync(
    process.execPath,
    ["--test", "--test-reporter=spec", join(outdir, "**", "*.js")],
    { stdio: "inherit", shell: false },
  );
  process.exit(result.status ?? 1);
} finally {
  rmSync(outdir, { recursive: true, force: true });
}

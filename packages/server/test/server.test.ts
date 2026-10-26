import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { createDecision, createExperiment, decisionPrompt, setVariantTransition } from "@motionlab/core";
import { createMotionLabHandlers } from "../src/index";

function decision() {
  let experiment = createExperiment({ keyframes: { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 } } });
  experiment = setVariantTransition(experiment, "B", { type: "spring", stiffness: 420, damping: 28, mass: 0.8 });
  return createDecision({
    experiment: { ...experiment, winner: "B" },
    component: { id: "checkout-card", label: "Checkout Card", file: "components/checkout-card.tsx" },
    interaction: "Enter",
  });
}

function post(body: unknown) {
  return new Request("http://localhost/api/motionlab", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("decisions endpoint", () => {
  it("writes a decision into the project and returns it", async () => {
    const root = mkdtempSync(join(tmpdir(), "ml-root-"));
    try {
      const handlers = createMotionLabHandlers({ root, isProduction: false });
      const response = await handlers.POST(post(decision()));
      assert.equal(response.status, 200);
      const saved = JSON.parse(readFileSync(join(root, "motionlab/decisions.json"), "utf8"));
      assert.equal(saved.decisions.length, 1);
      assert.equal(saved.decisions[0].transition.stiffness, 420);
      assert.equal(saved.decisions[0].status, "pending");
      assert.match(saved.decisions[0].code.motion, /stiffness: 420/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps one decision per component motion — the latest wins", async () => {
    const root = mkdtempSync(join(tmpdir(), "ml-root-"));
    try {
      const handlers = createMotionLabHandlers({ root, isProduction: false });
      await handlers.POST(post(decision()));
      const second = { ...decision(), transition: { type: "spring", stiffness: 300, damping: 20, mass: 1 } };
      await handlers.POST(post(second));
      const body = await (await handlers.GET()).json();
      assert.equal(body.decisions.length, 1);
      assert.equal(body.decisions[0].transition.stiffness, 300);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rebuilds code from validated values, never trusting what was sent", async () => {
    const root = mkdtempSync(join(tmpdir(), "ml-root-"));
    try {
      const handlers = createMotionLabHandlers({ root, isProduction: false });
      const tampered = { ...decision(), code: { motion: "rm -rf /", css: "evil" } };
      await handlers.POST(post(tampered));
      const saved = JSON.parse(readFileSync(join(root, "motionlab/decisions.json"), "utf8"));
      assert.doesNotMatch(saved.decisions[0].code.motion, /rm -rf/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses junk, oversized bodies, paths outside the project, and production", async () => {
    const root = mkdtempSync(join(tmpdir(), "ml-root-"));
    try {
      const handlers = createMotionLabHandlers({ root, isProduction: false });
      assert.equal((await handlers.POST(post({ hello: "world" }))).status, 400);
      const big = new Request("http://localhost/api/motionlab", { method: "POST", body: "x".repeat(70_000) });
      assert.equal((await handlers.POST(big)).status, 413);
      const outside = createMotionLabHandlers({ root, file: "../escape.json", isProduction: false });
      assert.equal((await outside.POST(post(decision()))).status, 500);
      const prod = createMotionLabHandlers({ root, isProduction: true });
      assert.equal((await prod.POST(post(decision()))).status, 404);
      assert.equal((await prod.GET()).status, 404);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("produces a prompt an agent can act on without the file", () => {
    const prompt = decisionPrompt(decision());
    assert.match(prompt, /Checkout Card/);
    assert.match(prompt, /components\/checkout-card\.tsx/);
    assert.match(prompt, /chose B/);
    assert.match(prompt, /stiffness: 420/);
  });
});

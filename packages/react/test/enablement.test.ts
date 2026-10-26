import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasMotionLabQuery, resolveEnabled } from "../src/provider/enablement";

/**
 * The production-safety rule, pinned down.
 *
 * MotionLab must never appear to a normal user by accident, so the one thing
 * these tests care most about is that a URL alone cannot summon the devtools
 * on a deployment that did not explicitly opt in.
 */
describe("devtools enablement", () => {
  it("is on in development without any opt-in", () => {
    assert.equal(resolveEnabled({ isProduction: false }), true);
    assert.equal(resolveEnabled({ isProduction: false, search: "" }), true);
  });

  it("is off in production by default", () => {
    assert.equal(resolveEnabled({ isProduction: true }), false);
    assert.equal(resolveEnabled({ isProduction: true, search: "?utm_source=x" }), false);
  });

  it("does NOT let ?motionlab alone enable a production build", () => {
    assert.equal(
      resolveEnabled({ isProduction: true, search: "?motionlab" }),
      false,
      "a query string must never be enough on its own",
    );
  });

  it("enables production preview only when the developer opted in AND asked", () => {
    assert.equal(
      resolveEnabled({ isProduction: true, productionPreview: true, search: "?motionlab" }),
      true,
    );
    assert.equal(
      resolveEnabled({ isProduction: true, productionPreview: true, search: "" }),
      false,
      "opting in does not expose the devtools on every request",
    );
    assert.equal(
      resolveEnabled({ isProduction: true, productionPreview: true }),
      false,
      "and not during SSR, where there is no search string to read",
    );
  });

  it("lets an explicit prop win over everything", () => {
    assert.equal(resolveEnabled({ enabled: false, isProduction: false }), false);
    assert.equal(
      resolveEnabled({ enabled: true, isProduction: true, productionPreview: false }),
      true,
    );
  });

  it("reads the flag in any query position, and ignores lookalikes", () => {
    assert.equal(hasMotionLabQuery("?motionlab"), true);
    assert.equal(hasMotionLabQuery("?a=1&motionlab&b=2"), true);
    assert.equal(hasMotionLabQuery("motionlab"), true);
    assert.equal(hasMotionLabQuery("?motionlab=preview"), true);
    assert.equal(hasMotionLabQuery("?motionlabs"), false);
    assert.equal(hasMotionLabQuery("?notmotionlab"), false);
    assert.equal(hasMotionLabQuery(""), false);
    assert.equal(hasMotionLabQuery(undefined), false);
  });
});

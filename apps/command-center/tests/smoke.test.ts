import test from "node:test";
import assert from "node:assert/strict";
import root from "../../../package.json" with { type: "json" };
import commandCenter from "../package.json" with { type: "json" };

test("command center is isolated from the legacy app", () => {
  assert.equal(typeof root.scripts.dev, "string");
  assert.equal(commandCenter.scripts.dev, "next dev");
  assert.equal(commandCenter.scripts.build, "next build");
  assert.equal(commandCenter.scripts.test, "vitest run");
});

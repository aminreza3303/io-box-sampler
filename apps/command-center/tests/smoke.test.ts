import { describe, expect, it } from "vitest";
import root from "../../../package.json" with { type: "json" };
import commandCenter from "../package.json" with { type: "json" };

describe("command center isolation", () => {
  it("keeps the command center app separate from the legacy app", () => {
    expect(typeof root.scripts.dev).toBe("string");
    expect(commandCenter.scripts.dev).toBe("next dev --hostname 0.0.0.0");
    expect(commandCenter.scripts.build).toBe("next build");
    expect(commandCenter.scripts.test).toBe("vitest run");
  });
});

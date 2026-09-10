import { describe, expect, it, vi } from "vitest";
import {
  ArchitectureRendererInitializationError,
  isArchitectureRendererInitializationError,
} from "./architecture-webgl";

describe("architecture WebGL error boundary", () => {
  it("recognizes only tagged renderer initialization failures", () => {
    const onError = vi.fn();
    const failure = new ArchitectureRendererInitializationError(new Error("renderer failed"), onError);

    expect(isArchitectureRendererInitializationError(failure)).toBe(true);
    expect(isArchitectureRendererInitializationError(new Error("unrelated"))).toBe(false);
    expect(failure.name).toBe("ArchitectureRendererInitializationError");
  });

  it("notifies the existing fallback at most once", () => {
    const onError = vi.fn();
    const failure = new ArchitectureRendererInitializationError(new Error("renderer failed"), onError);

    failure.notifyFallback();
    failure.notifyFallback();

    expect(onError).toHaveBeenCalledTimes(1);
  });
});

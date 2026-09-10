import { WebGLRenderer } from "three";
import type { WebGLRendererParameters } from "three";

export function canCreateArchitectureRenderer(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    if (!context) return false;

    const renderer = new WebGLRenderer({
      alpha: false,
      antialias: true,
      canvas,
      context,
      powerPreference: "high-performance",
    });

    try {
      return !renderer.getContext().isContextLost();
    } finally {
      renderer.dispose();
    }
  } catch {
    return false;
  }
}

export function createArchitectureRenderer<TDefaults extends object>(
  defaults: TDefaults,
  onError: () => void,
): WebGLRenderer {
  try {
    const renderer = new WebGLRenderer({
      ...(defaults as WebGLRendererParameters),
      alpha: false,
    });

    if (renderer.getContext().isContextLost()) {
      renderer.dispose();
      throw new Error("WebGL context unavailable after renderer initialization");
    }

    return renderer;
  } catch (error) {
    onError();
    throw error;
  }
}

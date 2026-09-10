import { WebGLRenderer } from "three";
import type { WebGLRendererParameters } from "three";

const architectureRendererErrorCode = "ARCHITECTURE_RENDERER_INITIALIZATION";

export class ArchitectureRendererInitializationError extends Error {
  readonly code = architectureRendererErrorCode;
  readonly originalError: unknown;
  private fallbackNotified = false;

  constructor(originalError: unknown, private readonly onError: () => void) {
    super("Architecture WebGL renderer initialization failed");
    this.name = "ArchitectureRendererInitializationError";
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  notifyFallback() {
    if (this.fallbackNotified) return;
    this.fallbackNotified = true;
    this.onError();
  }
}

export function isArchitectureRendererInitializationError(
  value: unknown,
): value is ArchitectureRendererInitializationError {
  if (value instanceof ArchitectureRendererInitializationError) return true;
  if (!value || typeof value !== "object") return false;

  const candidate = value as { code?: unknown; notifyFallback?: unknown };
  return candidate.code === architectureRendererErrorCode && typeof candidate.notifyFallback === "function";
}

function handleArchitectureRendererRejection(event: PromiseRejectionEvent) {
  if (!isArchitectureRendererInitializationError(event.reason)) return;
  event.preventDefault();
  event.reason.notifyFallback();
}

// R3F's Canvas starts an async configure run without attaching a rejection handler.
// Keep this guard feature-scoped: only our tagged renderer failures are prevented.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", handleArchitectureRendererRejection);
}

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
    const failure = new ArchitectureRendererInitializationError(error, onError);
    failure.notifyFallback();
    throw failure;
  }
}

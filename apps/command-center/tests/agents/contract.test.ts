import { describe, expect, it } from "vitest";
import { OmpAdapter } from "../../server/agents/omp-adapter";
import type { ProcessRunner } from "../../server/agents/process-runner";

const request = { runId: "run-1", role: "builder", prompt: "do work", cwd: process.cwd(), timeoutMs: 1000 };
function runner(result: { code: number | null; stdout: string; stderr: string; timedOut: boolean }): ProcessRunner { return { run: async () => result, stop: async () => undefined }; }

describe("OMP adapter contract", () => {
  it("reports a blocked runtime when no executable is configured", async () => { const adapter = new OmpAdapter(undefined, runner({ code: 0, stdout: "", stderr: "", timedOut: false })); await expect(adapter.health()).resolves.toMatchObject({ available: false }); await expect(adapter.run(request)).resolves.toMatchObject({ kind: "blocked", runId: "run-1" }); });
  it("parses valid JSON results", async () => { const adapter = new OmpAdapter("omp", runner({ code: 0, stdout: JSON.stringify({ kind: "result", output: "ok" }), stderr: "", timedOut: false })); await expect(adapter.run(request)).resolves.toMatchObject({ kind: "result", output: "ok", runId: "run-1" }); });
  it("blocks timeouts and reports malformed/non-zero results", async () => { const timeout = new OmpAdapter("omp", runner({ code: null, stdout: "partial", stderr: "", timedOut: true })); await expect(timeout.run(request)).resolves.toMatchObject({ kind: "blocked" }); const malformed = new OmpAdapter("omp", runner({ code: 0, stdout: "not-json", stderr: "", timedOut: false })); await expect(malformed.run(request)).resolves.toMatchObject({ kind: "error" }); const failed = new OmpAdapter("omp", runner({ code: 2, stdout: "", stderr: "bad", timedOut: false })); await expect(failed.run(request)).resolves.toMatchObject({ kind: "error", error: "bad" }); });
});

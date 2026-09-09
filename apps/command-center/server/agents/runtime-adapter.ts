import { processRunner, type ProcessRunner } from "./process-runner";
import type { AgentRequest, AgentResult, AgentRuntimeAdapter } from "./types";

export class CliAgentAdapter implements AgentRuntimeAdapter {
  constructor(private readonly runtime: "hermes" | "omp", private readonly executable: string | undefined = process.env[`${runtime.toUpperCase()}_EXECUTABLE`], private readonly runner: ProcessRunner = processRunner) {}
  async health() { return this.executable ? { available: true, detail: `${this.runtime} executable configured` } : { available: false, detail: `${this.runtime} is blocked: set ${this.runtime.toUpperCase()}_EXECUTABLE to an executable path` }; }
  async run(request: AgentRequest): Promise<AgentResult> {
    if (!this.executable) return { kind: "blocked", runId: request.runId, output: "", error: `${this.runtime} executable is not configured` };
    try {
      const result = await this.runner.run(this.executable, ["run", "--json", "--role", request.role, "--prompt", request.prompt], { runId: request.runId, cwd: request.cwd, timeoutMs: request.timeoutMs });
      if (result.timedOut) return { kind: "blocked", runId: request.runId, output: result.stdout, error: `${this.runtime} timed out after ${request.timeoutMs}ms` };
      if (result.code !== 0) return { kind: "error", runId: request.runId, output: result.stdout, error: result.stderr || `${this.runtime} exited with code ${String(result.code)}` };
      try { const parsed = JSON.parse(result.stdout) as Partial<AgentResult>; if (!parsed.kind || !parsed.output) throw new Error("invalid result"); return { ...parsed, runId: request.runId } as AgentResult; }
      catch { return { kind: "error", runId: request.runId, output: result.stdout, error: `${this.runtime} returned malformed JSON` }; }
    } catch (error) { return { kind: "blocked", runId: request.runId, output: "", error: error instanceof Error ? error.message : `${this.runtime} could not start` }; }
  }
  stop(runId: string) { return this.runner.stop(runId); }
}

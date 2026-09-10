import { processRunner, type ProcessRunner } from "./process-runner";
import type { AgentRequest, AgentResult, AgentRuntimeAdapter } from "./types";

export class CliAgentAdapter implements AgentRuntimeAdapter {
  constructor(private readonly runtime: "hermes" | "omp", private readonly executable: string | undefined, private readonly runner: ProcessRunner = processRunner) {}
  async health() { return this.executable ? { available: true, detail: `${this.runtime} executable configured` } : { available: false, detail: `${this.runtime} is blocked: set ${this.runtime.toUpperCase()}_EXECUTABLE to an executable path` }; }
  async run(request: AgentRequest): Promise<AgentResult> {
    if (!this.executable) return { kind: "blocked", runId: request.runId, output: "", error: `${this.runtime} executable is not configured` };
    try {
      const args = this.runtime === "hermes"
        ? ["chat", ...(request.sessionName ? ["--continue", request.sessionName, "--create-if-missing"] : []), "--provider", process.env.HERMES_PROVIDER?.trim() || "openrouter", "--model", process.env.HERMES_MODEL?.trim() || "openai/gpt-4o-mini", "--query", request.prompt, "--oneshot", "--quiet", "--in", request.cwd]
        : ["run", "--json", "--role", request.role, "--prompt", request.prompt];
      const result = await this.runner.run(this.executable, args, { runId: request.runId, cwd: request.cwd, timeoutMs: request.timeoutMs });
      if (result.timedOut) return { kind: "blocked", runId: request.runId, output: result.stdout, error: `${this.runtime} timed out after ${request.timeoutMs}ms` };
      if (result.code !== 0) return { kind: "error", runId: request.runId, output: result.stdout, error: result.stderr || `${this.runtime} exited with code ${String(result.code)}` };
      if (this.runtime === "hermes") {
        const output = result.stdout.trim();
        if (!output) return { kind: "error", runId: request.runId, output: "", error: "hermes returned empty output" };
        const sessionId = output.match(/session[_\s-]*id\s*[:#]\s*([A-Za-z0-9_-]+)/i)?.[1];
        const fencedJson = output.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
        const jsonCandidate = fencedJson ?? output;
        try {
          const parsed = JSON.parse(jsonCandidate) as Partial<AgentResult> & { session_id?: string };
          if (typeof parsed.output === "string" && parsed.output.trim()) return { kind: parsed.kind ?? "result", runId: request.runId, output: parsed.output.trim(), ...(parsed.sessionId || parsed.session_id || sessionId ? { sessionId: parsed.sessionId ?? parsed.session_id ?? sessionId } : {}), ...(parsed.data !== undefined ? { data: parsed.data } : {}) };
          if (parsed.output && typeof parsed.output === "object") return { kind: parsed.kind ?? "result", runId: request.runId, output: JSON.stringify(parsed.output), data: parsed.output, ...(parsed.sessionId || parsed.session_id || sessionId ? { sessionId: parsed.sessionId ?? parsed.session_id ?? sessionId } : {}) };
        } catch {
          // Hermes may return ordinary text; preserve it as-is.
        }
        const cleanOutput = output.replace(/\s*\n?\s*session[_\s-]*id\s*[:#]\s*[A-Za-z0-9_-]+\s*$/i, "").trim();
        return { kind: "result", runId: request.runId, output: cleanOutput || output, ...(sessionId ? { sessionId } : {}) };
      }
      try { const parsed = JSON.parse(result.stdout) as Partial<AgentResult>; if (!parsed.kind || !parsed.output) throw new Error("invalid result"); return { ...parsed, runId: request.runId } as AgentResult; }
      catch { return { kind: "error", runId: request.runId, output: result.stdout, error: `${this.runtime} returned malformed JSON` }; }
    } catch (error) { return { kind: "blocked", runId: request.runId, output: "", error: error instanceof Error ? error.message : `${this.runtime} could not start` }; }
  }
  stop(runId: string) { return this.runner.stop(runId); }
}

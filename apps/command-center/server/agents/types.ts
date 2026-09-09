export type AgentRuntime = "hermes" | "omp";

export interface AgentRequest { runId: string; role: string; prompt: string; cwd: string; timeoutMs: number; }
export interface AgentResult { kind: "result" | "proposal" | "question" | "blocked" | "error"; runId: string; output: string; data?: unknown; error?: string; usage?: { inputTokens?: number; outputTokens?: number }; }
export interface AgentRuntimeAdapter { health(): Promise<{ available: boolean; version?: string; detail: string }>; run(request: AgentRequest): Promise<AgentResult>; stop(runId: string): Promise<void>; }

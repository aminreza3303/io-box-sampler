import { randomUUID } from "node:crypto";
import { HermesAdapter } from "./hermes-adapter";
import { OmpAdapter } from "./omp-adapter";
import type { AgentRequest, AgentResult, AgentRuntimeAdapter } from "./types";

export const agentRoster = [
  { id: "hermes-mother", name: "Hermes / مادر", runtime: "hermes" as const, role: "orchestrator" },
  { id: "product-analyst", name: "تحلیلگر محصول", runtime: "omp" as const, role: "product-analyst" },
  { id: "builder", name: "سازنده", runtime: "omp" as const, role: "builder" },
  { id: "reviewer", name: "بازبین", runtime: "omp" as const, role: "reviewer" },
];

export function createAgentAdapters(overrides?: Partial<Record<"hermes" | "omp", AgentRuntimeAdapter>>) { return { hermes: overrides?.hermes ?? new HermesAdapter(), omp: overrides?.omp ?? new OmpAdapter() }; }
export async function dispatchToMother(prompt: string, cwd = process.cwd(), adapters = createAgentAdapters(), options: { sessionName?: string } = {}): Promise<AgentResult> {
  const request: AgentRequest = { runId: randomUUID(), role: "orchestrator", prompt, cwd, timeoutMs: 120_000, sessionName: options.sessionName };
  return adapters.hermes.run(request);
}

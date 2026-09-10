import { agentProposalSchema, type AgentProposal } from "../../lib/validators";

const OPEN_MARKER = "<COMMAND_CENTER_PROPOSAL>";
const CLOSE_MARKER = "</COMMAND_CENTER_PROPOSAL>";
const MAX_PROPOSAL_BLOCK = 12_000;

export function parseAgentProposalValue(value: unknown): AgentProposal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const task = input.task && typeof input.task === "object" && !Array.isArray(input.task) ? { ...(input.task as Record<string, unknown>) } : null;
  if (!task) return null;
  const priority = typeof task.priority === "string" ? task.priority.toUpperCase() : task.priority;
  const normalizedPriority = priority === "NORMAL" ? "MEDIUM" : priority;
  const result = agentProposalSchema.safeParse({ ...input, task: { ...task, priority: normalizedPriority } });
  return result.success ? result.data : null;
}

export function parseAgentProposal(output: string): AgentProposal | null {
  const start = output.indexOf(OPEN_MARKER);
  if (start < 0) return null;
  const contentStart = start + OPEN_MARKER.length;
  const end = output.indexOf(CLOSE_MARKER, contentStart);
  if (end < 0 || end - contentStart > MAX_PROPOSAL_BLOCK) return null;
  try {
    return parseAgentProposalValue(JSON.parse(output.slice(contentStart, end).trim()));
  } catch {
    return null;
  }
}

import { agentProposalSchema, type AgentProposal } from "../../lib/validators";

const OPEN_MARKER = "<COMMAND_CENTER_PROPOSAL>";
const CLOSE_MARKER = "</COMMAND_CENTER_PROPOSAL>";
const MAX_PROPOSAL_BLOCK = 12_000;

export function parseAgentProposal(output: string): AgentProposal | null {
  const start = output.indexOf(OPEN_MARKER);
  if (start < 0) return null;
  const contentStart = start + OPEN_MARKER.length;
  const end = output.indexOf(CLOSE_MARKER, contentStart);
  if (end < 0 || end - contentStart > MAX_PROPOSAL_BLOCK) return null;
  try {
    const parsed: unknown = JSON.parse(output.slice(contentStart, end).trim());
    const result = agentProposalSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

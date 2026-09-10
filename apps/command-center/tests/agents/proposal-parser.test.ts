import { describe, expect, it } from "vitest";
import { parseAgentProposal } from "../../server/agents/proposal-parser";

const validProposal = {
  title: "بازتنظیم انتقال وجه",
  summary: "یک کار اجرایی برای کاهش ریسک انتقال وجه",
  scope: "PROJECT",
  projectId: "project-1",
  teamId: "team-1",
  task: {
    title: "بازبینی سقف انتقال",
    description: "قواعد سقف انتقال را بازبینی و مستند کن.",
    priority: "HIGH",
    assigneeId: "user-1",
  },
};

describe("Hermes proposal parser", () => {
  it("extracts a valid command center proposal marker", () => {
    const result = parseAgentProposal(`تحلیل انجام شد.\n<COMMAND_CENTER_PROPOSAL>${JSON.stringify(validProposal)}</COMMAND_CENTER_PROPOSAL>`);
    expect(result).toEqual(validProposal);
  });

  it("ignores missing or malformed markers", () => {
    expect(parseAgentProposal("یک پاسخ معمولی بدون پیشنهاد")).toBeNull();
    expect(parseAgentProposal("<COMMAND_CENTER_PROPOSAL>{broken}</COMMAND_CENTER_PROPOSAL>")).toBeNull();
  });

  it("rejects unsafe or oversized proposal values", () => {
    expect(parseAgentProposal(`<COMMAND_CENTER_PROPOSAL>${JSON.stringify({ ...validProposal, scope: "ORGANIZATION" })}</COMMAND_CENTER_PROPOSAL>`)).toBeNull();
    expect(parseAgentProposal(`<COMMAND_CENTER_PROPOSAL>${JSON.stringify({ ...validProposal, task: { ...validProposal.task, title: "x".repeat(241) } })}</COMMAND_CENTER_PROPOSAL>`)).toBeNull();
  });
});

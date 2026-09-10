import { describe, expect, it } from "vitest";
import { makeSessionName } from "../../server/agents/session-service";
import { agentProposalSchema } from "../../lib/validators";

describe("Hermes project session contracts", () => {
  it("uses one stable session name per owner and project", () => {
    expect(makeSessionName("newcash", "user-1")).toBe("command-center-newcash-user-1");
    expect(makeSessionName("newcash", "user-1")).toBe(makeSessionName("newcash", "user-1"));
    expect(makeSessionName("shati", "user-1")).not.toBe(makeSessionName("newcash", "user-1"));
  });

  it("requires a project-scoped team for task proposals", () => {
    expect(agentProposalSchema.safeParse({ title: "پیشنهاد", scope: "PROJECT", projectId: "p1", task: { title: "کار" } }).success).toBe(false);
    expect(agentProposalSchema.safeParse({ title: "پیشنهاد", scope: "PROJECT", projectId: "p1", teamId: "t1", task: { title: "کار" } }).success).toBe(true);
  });
});

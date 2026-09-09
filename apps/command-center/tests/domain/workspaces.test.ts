import { describe, expect, it } from "vitest";
import { getProcessById, workspaceGroups } from "../../lib/workspaces";

describe("command center workspaces", () => {
  it("catalogues operations, finance, and admin processes", () => {
    expect(workspaceGroups.map((group) => group.id)).toEqual(["operations", "finance", "admin"]);
    expect(workspaceGroups.reduce((total, group) => total + group.processes.length, 0)).toBeGreaterThanOrEqual(15);
  });

  it("marks finance workflows as read-only and approval based", () => {
    const finance = workspaceGroups.find((group) => group.id === "finance");
    expect(finance?.processes.length).toBeGreaterThanOrEqual(6);
    expect(finance?.processes.every((process) => process.readOnly && process.requiresCeoApproval)).toBe(true);
  });

  it("resolves a process context for the AI workspace", () => {
    const process = getProcessById("transfer");
    expect(process?.title).toBe("انتقال وجه");
    expect(getProcessById("does-not-exist")).toBeUndefined();
  });
});

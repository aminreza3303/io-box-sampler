import { describe, expect, it } from "vitest";
import { HermesAdapter } from "../../server/agents/hermes-adapter";
import type { ProcessRunner } from "../../server/agents/process-runner";

const request = { runId: "run-hermes-1", role: "orchestrator", prompt: "برنامه را بررسی کن", cwd: process.cwd(), timeoutMs: 1000, sessionName: "command-center-newcash-user-1" };

function fakeRunner(result: { code: number | null; stdout: string; stderr: string; timedOut: boolean }, calls: Array<{ command: string; args: string[] }> = []): ProcessRunner {
  return {
    run: async (command, args) => { calls.push({ command, args }); return result; },
    stop: async () => undefined,
  };
}

describe("Hermes CLI adapter", () => {
  it("uses the installed hermes command and its persistent chat contract", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const adapter = new HermesAdapter(undefined, fakeRunner({ code: 0, stdout: "پاسخ Hermes\nSession ID: hermes-123", stderr: "", timedOut: false }, calls));
    await expect(adapter.run(request)).resolves.toMatchObject({ kind: "result", output: "پاسخ Hermes", sessionId: "hermes-123" });
    expect(calls[0]).toEqual({ command: "hermes", args: ["chat", "--continue", request.sessionName, "--create-if-missing", "--provider", "openrouter", "--model", "openai/gpt-4o-mini", "--query", request.prompt, "--oneshot", "--quiet", "--in", request.cwd] });
  });

  it("uses one-shot chat when no project session is supplied", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const adapter = new HermesAdapter("hermes", fakeRunner({ code: 0, stdout: "پاسخ", stderr: "", timedOut: false }, calls));
    await expect(adapter.run({ ...request, sessionName: undefined })).resolves.toMatchObject({ kind: "result", output: "پاسخ" });
    expect(calls[0].args).toEqual(["chat", "--provider", "openrouter", "--model", "openai/gpt-4o-mini", "--query", request.prompt, "--oneshot", "--quiet", "--in", request.cwd]);
  });

  it("normalizes Hermes JSON code-fence responses", async () => {
    const adapter = new HermesAdapter("hermes", fakeRunner({ code: 0, stdout: "```json\n{\"kind\":\"result\",\"output\":\"پاسخ تمیز\"}\n```", stderr: "", timedOut: false }));
    await expect(adapter.run(request)).resolves.toMatchObject({ kind: "result", output: "پاسخ تمیز" });
  });

  it("blocks timeouts and reports process failures without claiming success", async () => {
    const timeout = new HermesAdapter("hermes", fakeRunner({ code: null, stdout: "partial", stderr: "", timedOut: true }));
    await expect(timeout.run(request)).resolves.toMatchObject({ kind: "blocked", output: "partial" });
    const failed = new HermesAdapter("hermes", fakeRunner({ code: 2, stdout: "", stderr: "provider unavailable", timedOut: false }));
    await expect(failed.run(request)).resolves.toMatchObject({ kind: "error", error: "provider unavailable" });
  });

});

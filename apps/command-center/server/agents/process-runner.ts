import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export type ProcessResult = { code: number | null; stdout: string; stderr: string; timedOut: boolean };
export type ProcessRunner = { run(command: string, args: string[], options: { runId: string; cwd: string; timeoutMs: number; maxOutputBytes?: number }): Promise<ProcessResult>; stop(runId: string): Promise<void> };

function isAllowedCwd(cwd: string) {
  const resolved = path.resolve(cwd);
  const appRoot = path.resolve(process.cwd());
  const repositoryRoot = path.resolve(process.cwd(), "../..");
  const configuredRoot = process.env.COMMAND_CENTER_PROJECT_ROOT?.trim();
  const allowedRoots = configuredRoot ? [path.resolve(configuredRoot)] : [repositoryRoot, path.dirname(repositoryRoot)];
  return resolved === appRoot || allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

export class SafeProcessRunner implements ProcessRunner {
  private readonly children = new Map<string, ChildProcess>();
  async run(command: string, args: string[], options: { runId: string; cwd: string; timeoutMs: number; maxOutputBytes?: number }): Promise<ProcessResult> {
    if (!isAllowedCwd(options.cwd)) throw new Error("agent working directory is not allowlisted");
    if (path.isAbsolute(command) && !existsSync(command)) throw new Error("agent executable was not found");
    const max = options.maxOutputBytes ?? 256_000;
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: options.cwd, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      this.children.set(options.runId, child);
      let stdout = ""; let stderr = ""; let timedOut = false;
      const collect = (target: "stdout" | "stderr") => (chunk: Buffer) => { const value = chunk.toString(); if (target === "stdout") stdout = `${stdout}${value}`.slice(0, max); else stderr = `${stderr}${value}`.slice(0, max); };
      child.stdout.on("data", collect("stdout")); child.stderr.on("data", collect("stderr"));
      const timeout = setTimeout(() => { timedOut = true; child.kill(); }, Math.max(100, options.timeoutMs));
      child.on("error", (error) => { clearTimeout(timeout); this.children.delete(options.runId); reject(error); });
      child.on("close", (code) => { clearTimeout(timeout); this.children.delete(options.runId); resolve({ code, stdout, stderr, timedOut }); });
    });
  }
  async stop(runId: string) { this.children.get(runId)?.kill(); this.children.delete(runId); }
}

export const processRunner = new SafeProcessRunner();

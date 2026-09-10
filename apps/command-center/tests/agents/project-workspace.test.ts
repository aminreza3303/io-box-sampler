import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveProjectWorkspace } from "../../server/agents/project-workspace";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("project workspace resolver", () => {
  it("resolves newcash to the configured project root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "command-center-workspace-"));
    temporaryDirectories.push(root);
    const result = await resolveProjectWorkspace({ code: "newcash" }, { COMMAND_CENTER_PROJECT_ROOT: root });
    expect(result).toMatchObject({ key: "newcash", path: await realpath(root) });
  });

  it("supports a project-specific environment override", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "command-center-workspace-"));
    const shati = path.join(root, "shati-worktree");
    await mkdir(shati);
    temporaryDirectories.push(root);
    const result = await resolveProjectWorkspace({ code: "shati" }, { COMMAND_CENTER_PROJECT_ROOT: root, COMMAND_CENTER_PROJECT_SHATI_PATH: shati });
    expect(result).toMatchObject({ key: "shati", path: await realpath(shati) });
  });

  it("rejects missing and out-of-root workspaces", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "command-center-workspace-"));
    temporaryDirectories.push(root);
    await expect(resolveProjectWorkspace({ code: "taraz" }, { COMMAND_CENTER_PROJECT_ROOT: root })).resolves.toMatchObject({ error: expect.stringContaining("workspace") });
    await expect(resolveProjectWorkspace({ code: "shati" }, { COMMAND_CENTER_PROJECT_ROOT: root, COMMAND_CENTER_PROJECT_SHATI_PATH: path.join(root, "..") })).resolves.toMatchObject({ error: expect.stringContaining("allowlisted") });
  });
});

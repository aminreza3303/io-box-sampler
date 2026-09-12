import { realpath } from "node:fs/promises";
import path from "node:path";

export type ProjectWorkspace = { key: string; path: string; source: "root" | "override" | "convention" };
export type WorkspaceResolution = ProjectWorkspace | { key: string; error: string };

function envKey(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
}

function defaultRoot(cwd: string) {
  return path.resolve(cwd, "../..");
}

function isWithin(candidate: string, root: string) {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedRoot = path.resolve(root);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
}

export async function resolveProjectWorkspace(project: { code: string }, environment: Readonly<Record<string, string | undefined>> = process.env, cwd = process.cwd()): Promise<WorkspaceResolution> {
  const key = project.code.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(key)) return { key, error: "کد پروژه برای workspace معتبر نیست." };

  const configuredRoot = environment.COMMAND_CENTER_PROJECT_ROOT?.trim();
  const root = path.resolve(configuredRoot || defaultRoot(cwd));
  const override = environment[`COMMAND_CENTER_PROJECT_${envKey(key)}_PATH`]?.trim();
  const candidate = override
    ? path.resolve(override)
    : configuredRoot
      ? key === "newcash" ? root : path.resolve(root, key)
      : key === "newcash"
        ? root
        : path.resolve(path.dirname(root), key);
  const source = override ? "override" : key === "newcash" ? "root" : "convention";

  if (configuredRoot && !isWithin(candidate, root)) return { key, error: "workspace پروژه خارج از مسیر allowlisted است." };
  if (!configuredRoot && source === "convention" && path.dirname(candidate) !== path.dirname(root)) return { key, error: "workspace پروژه خارج از مسیر allowlisted است." };
  try {
    const canonical = await realpath(candidate);
    const canonicalRoot = await realpath(root).catch(() => root);
    const allowed = configuredRoot ? isWithin(canonical, canonicalRoot) : source === "root" ? canonical === canonicalRoot : path.dirname(canonical) === path.dirname(canonicalRoot);
    if (!allowed) return { key, error: "workspace پروژه خارج از مسیر allowlisted است." };
    return { key, path: canonical, source };
  } catch {
    return { key, error: `workspace پروژهٔ ${key} پیدا نشد.` };
  }
}

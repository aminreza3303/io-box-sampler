import { readFile } from "node:fs/promises";
import path from "node:path";

const promptFiles = {
  hermes: "hermes-mother.md",
  analyst: "product-analyst.md",
  builder: "builder.md",
  reviewer: "reviewer.md",
} as const;

export type AgentPromptKey = keyof typeof promptFiles;

export async function loadAgentPrompt(key: AgentPromptKey, cwd = process.cwd()) {
  try {
    return await readFile(path.join(cwd, "prompts", "agents", promptFiles[key]), "utf8");
  } catch {
    return "پرامپت runtime در محیط موجود نیست؛ محدودیت‌ها و وضعیت مسدودی را صادقانه گزارش کن.";
  }
}

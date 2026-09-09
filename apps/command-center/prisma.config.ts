import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("./.env.local", import.meta.url)) });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/command_center",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});

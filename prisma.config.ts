import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma skips .env files when a config file exists; load the same ones Next.js uses.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
});

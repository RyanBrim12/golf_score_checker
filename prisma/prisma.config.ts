import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: "./schema.prisma",
  migrations: {
    path: "./migrations",
  },
});

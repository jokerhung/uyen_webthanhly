// One-off local-only demo account. NEVER run against a non-local or non-dev database.
import { randomBytes, scryptSync } from "node:crypto";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());
const database = new URL(process.env.DATABASE_URL ?? "");
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/webkygui_dev") {
  throw new Error("Refusing demo admin outside local webkygui_dev database");
}
const prisma = new PrismaClient();
try {
  const existing = await prisma.adminUser.findUnique({ where: { email: "admin" }, select: { id: true } });
  if (existing) {
    console.log("Local admin exists; password left unchanged.");
  } else {
    const salt = randomBytes(16);
    const digest = scryptSync("123456", salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const passwordHash = `scrypt$16384$8$1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
    await prisma.adminUser.create({ data: { email: "admin", passwordHash, active: true } });
    console.log("Created local-only demo admin. Do not reuse this password outside local development.");
  }
} finally {
  await prisma.$disconnect();
}

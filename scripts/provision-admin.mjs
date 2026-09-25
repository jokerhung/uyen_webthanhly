// Provision an admin only from an operator-controlled machine. Feed password via stdin,
// never as a CLI argument or process environment variable.
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

nextEnv.loadEnvConfig(process.cwd());
const email = process.argv[2]?.trim().toLowerCase();
if (process.argv.length !== 3 || !email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || process.stdin.isTTY) {
  console.error("Usage: provide password through private stdin: node scripts/provision-admin.mjs admin@example.com < password-file");
  process.exit(1);
}
let password = "";
for await (const chunk of process.stdin) {
  password += chunk.toString("utf8");
  if (Buffer.byteLength(password) > 1026) { console.error("Password too long"); process.exit(1); }
}
password = password.replace(/\r?\n$/, "");
if (password.length < 12 || Buffer.byteLength(password) > 1024) {
  console.error("Password must be 12–1024 bytes");
  process.exit(1);
}
const salt = randomBytes(16);
const digest = await promisify(scryptCallback)(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
password = "";
// scrypt$N$r$p$base64url(salt)$base64url(64-byte digest)
const passwordHash = `scrypt$16384$8$1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
const prisma = new PrismaClient();
try {
  // Deliberately do not reset existing admins via this bootstrap utility.
  await prisma.adminUser.create({ data: { email, passwordHash, active: true } });
  console.log("Admin account created. Remove the temporary password file securely.");
} catch (error) {
  if (error?.code === "P2002") console.error("Admin account already exists; refusing to overwrite it.");
  else console.error("Could not create admin account.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

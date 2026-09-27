#!/usr/bin/env node
// Periodic durable cleanup worker. Never touches local logos; only keys previously queued by product routes.
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { inventory, storageRoot } from "./image-storage-common.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
if (process.argv.includes("--help")) { console.log("Usage: node scripts/cleanup-images.mjs [--driver local|minio] [--apply] (default dry-run; specify S3 credentials for minio --apply)"); process.exit(0); }
let apply = false;
let requestedDriver;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--apply" && !apply) apply = true;
  else if (process.argv[i] === "--driver" && !requestedDriver && ["local", "minio"].includes(process.argv[i + 1])) requestedDriver = process.argv[++i];
  else throw new Error(`Unknown or duplicate argument: ${process.argv[i]}`);
}
// Explicitly process old local jobs after cutover, without changing the app driver.
const driver = requestedDriver || process.env.PRODUCT_IMAGE_STORAGE_DRIVER || "local";
if (!["local", "minio"].includes(driver)) throw new Error("Invalid PRODUCT_IMAGE_STORAGE_DRIVER");
const db = new PrismaClient();
let s3;
try {
  // A worker can die after claiming a job. Reclaim leases only after the bounded S3
  // request window has elapsed; deletion is idempotent and references are rechecked.
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 15 * 60_000);
  const jobs = await db.storageCleanupJob.findMany({ where: { driver, OR: [{ status: "pending", nextAttemptAt: { lte: now } }, { status: "processing", updatedAt: { lt: staleBefore } }] }, orderBy: { createdAt: "asc" }, take: 50 });
  const { keys, protectedKeys, auditWarnings } = await inventory(db);
  if (auditWarnings.length) throw new Error(`Logo audit incomplete: ${auditWarnings.length} anomalies; refusing cleanup`);
  const root = driver === "local" && apply ? await storageRoot() : null;
  if (driver === "minio" && apply) {
    const required = ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
    if (required.some(key => !process.env[key]) || process.env.S3_FORCE_PATH_STYLE !== "true") throw new Error("Incomplete MinIO worker configuration");
    const endpoint = new URL(process.env.S3_ENDPOINT);
    if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.pathname !== "/" || endpoint.search || endpoint.hash || (endpoint.protocol === "http:" && !["localhost", "127.0.0.1", "minio"].includes(endpoint.hostname))) throw new Error("Unsafe S3_ENDPOINT");
    s3 = new S3Client({ endpoint: endpoint.origin, region: process.env.S3_REGION, forcePathStyle: true, maxAttempts: 2, requestHandler: new NodeHttpHandler({ connectionTimeout: 3000, requestTimeout: 10000 }), credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
  }
  const results = [];
  for (const job of jobs) {
    if (!/^[a-f0-9]{64}\.(jpg|png|webp)$/.test(job.storageKey)) { results.push({ key: job.storageKey, status: "invalid-key" }); continue; }
    const referenced = keys.includes(job.storageKey) || protectedKeys.has(job.storageKey);
    if (!apply) { results.push({ key: job.storageKey, status: referenced ? "protected" : "would-delete" }); continue; }
    const claimed = await db.storageCleanupJob.updateMany({ where: { id: job.id, driver, OR: [{ status: "pending", nextAttemptAt: { lte: now } }, { status: "processing", updatedAt: { lt: staleBefore } }] }, data: { status: "processing", attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      // Recheck after claiming, immediately before deleting. Never sweep unreferenced files.
      const now = await inventory(db);
      if (now.auditWarnings.length || now.keys.includes(job.storageKey) || now.protectedKeys.has(job.storageKey)) {
        await db.storageCleanupJob.update({ where: { id: job.id }, data: { status: "protected", lastError: "Product or logo reference" } });
        results.push({ key: job.storageKey, status: "protected" }); continue;
      }
      if (driver === "local") {
        // Never unlink a replaced symlink, including on Windows where O_NOFOLLOW varies.
        const { lstat } = await import("node:fs/promises");
        const target = path.join(root, job.storageKey);
        const stat = await lstat(target).catch(error => { if (error.code === "ENOENT") return null; throw error; });
        if (stat && (!stat.isFile() || stat.isSymbolicLink())) throw new Error("Unsafe cleanup target");
        if (stat) await unlink(target).catch(error => { if (error.code !== "ENOENT") throw error; });
      }
      else await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: job.storageKey }));
      await db.storageCleanupJob.update({ where: { id: job.id }, data: { status: "done", lastError: null } });
      results.push({ key: job.storageKey, status: "deleted" });
    } catch (error) {
      const delay = Math.min(3600, 2 ** Math.min(job.attempts + 1, 10) * 10) * 1000;
      await db.storageCleanupJob.update({ where: { id: job.id }, data: { status: "pending", lastError: error instanceof Error ? error.name.slice(0, 200) : "UnknownError", nextAttemptAt: new Date(Date.now() + delay) } });
      results.push({ key: job.storageKey, status: "deferred" });
    }
  }
  console.log(JSON.stringify({ driver, apply, results }, null, 2));
  if (results.some(row => ["invalid-key", "deferred"].includes(row.status))) process.exitCode = 2;
} finally { s3?.destroy(); await db.$disconnect(); }

#!/usr/bin/env node
// Read-only orphan inventory for the private PRODUCT bucket; never deletes local files or S3 objects.
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { database, inventory, s3, validKey, writeJson, errorText } from "./image-storage-common.mjs";

const usage = "Usage: node scripts/reconcile-product-images.mjs [--report path] [--grace-hours N]\nRequires migration credentials with ListBucket; never deletes objects.";
if (process.argv.includes("--help")) { console.log(usage); process.exit(0); }
let report = ".private/minio-reconciliation.json";
let graceHours = 48;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--report" && process.argv[i + 1]) report = process.argv[++i];
  else if (process.argv[i] === "--grace-hours" && /^(?:[1-9]\d{0,3})$/.test(process.argv[i + 1] ?? "")) graceHours = Number(process.argv[++i]);
  else throw new Error(`Unknown argument: ${process.argv[i]}`);
}
let db; let remote;
try {
  db = await database();
  remote = await s3();
  const before = await inventory(db);
  if (before.auditWarnings.length) throw new Error("Logo audit incomplete; cannot classify objects");
  const jobs = await db.storageCleanupJob.findMany({ select: { storageKey: true, status: true } });
  const cleanup = new Map(jobs.map(job => [job.storageKey, job.status]));
  const cutoff = Date.now() - graceHours * 3_600_000;
  const objects = [];
  let token;
  do {
    const page = await remote.client.send(new ListObjectsV2Command({ Bucket: remote.bucket, ContinuationToken: token, MaxKeys: 1000 }));
    for (const object of page.Contents ?? []) {
      const key = object.Key ?? "";
      const status = !validKey(key) ? "unknown-name" : before.protectedKeys.has(key) ? "logo-conflict" : before.keys.includes(key) ? "referenced" : cleanup.has(key) ? `cleanup-${cleanup.get(key)}` : !object.LastModified || object.LastModified.getTime() >= cutoff ? "within-grace" : "orphan-candidate";
      objects.push({ key, status, size: object.Size, lastModified: object.LastModified?.toISOString() ?? null });
    }
    token = page.NextContinuationToken;
    if (page.IsTruncated && !token) throw new Error("Incomplete S3 pagination");
  } while (token);
  const after = await inventory(db);
  const changed = JSON.stringify(before.keys) !== JSON.stringify(after.keys) || [...before.protectedKeys].some(key => !after.protectedKeys.has(key)) || [...after.protectedKeys].some(key => !before.protectedKeys.has(key));
  const missing = before.keys.filter(key => !objects.some(object => object.key === key));
  const result = { generatedAt: new Date().toISOString(), bucket: remote.bucket, graceHours, inventoryChanged: changed, referenced: before.keys.length, missingReferencedKeys: missing, objects };
  await writeJson(report, result);
  console.log(JSON.stringify({ report, scanned: objects.length, missingReferencedKeys: missing.length, orphanCandidates: objects.filter(object => object.status === "orphan-candidate").length, inventoryChanged: changed }, null, 2));
  if (changed || missing.length || objects.some(object => object.status === "logo-conflict")) process.exitCode = 2;
} catch (error) { console.error(errorText(error)); console.error(usage); process.exitCode = 1; }
finally { await db?.$disconnect(); remote?.client.destroy(); }

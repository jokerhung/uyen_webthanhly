#!/usr/bin/env node
// Inventory is read-only by default. --apply copies ItemImage bytes only; it never deletes local files or edits DB.
import { readFile } from "node:fs/promises";
import { database, inventory, storageRoot, localInventory, localDigest, s3Configured, s3, remoteDigest, uploadAbsent, sameDigest, validKey, options, writeJson, errorText } from "./image-storage-common.mjs";

const usage = "Usage: node scripts/migrate-images-to-minio.mjs [--dry-run | --apply] [--manifest path] [--report path]\nDefault: dry-run. --apply requires configured S3 and writes only absent objects, conditionally (If-None-Match: *).";
if (process.argv.includes("--help")) { console.log(usage); process.exit(0); }

let db; let remote;
try {
  const opts = options(process.argv.slice(2), true);
  db = await database();
  const root = await storageRoot();
  const { keys, protectedKeys, auditWarnings } = await inventory(db);
  const { files, unsafe } = await localInventory(root);
  const useRemote = s3Configured();
  if (opts.apply && !useRemote) throw new Error("--apply requires complete S3 configuration");
  if (useRemote) remote = await s3();
  let previous = {};
  try {
    const parsed = JSON.parse(await readFile(opts.manifest, "utf8"));
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) throw new Error("Unsupported manifest format");
    if (parsed.root && parsed.root !== root) throw new Error("Manifest source root differs from current root");
    if (parsed.bucket && remote && parsed.bucket !== remote.bucket) throw new Error("Manifest bucket differs from configured S3_BUCKET");
    // A local dry-run must not replace the verified apply manifest operators need
    // for post-copy reconciliation or rollback evidence.
    if (!opts.apply && parsed.mode === "apply") throw new Error("Refusing to overwrite applied manifest with dry-run; use a distinct --manifest path");
    previous = Object.fromEntries(parsed.items.filter(row => validKey(row.key)).map(row => [row.key, row]));
  } catch (error) { if (error?.code !== "ENOENT") throw error; }
  const items = [];
  const previousLogoAuditIssue = auditWarnings.length > 0;
  for (const key of keys) {
    const entry = { key, status: "pending" };
    items.push(entry);
    if (!validKey(key)) { entry.status = "invalid-key"; continue; }
    if (protectedKeys.has(key)) { entry.status = "logo-conflict"; continue; }
    if (previousLogoAuditIssue) { entry.status = "logo-audit-incomplete"; continue; }
    if (!files.has(key)) { entry.status = "missing-or-unsafe-source"; continue; }
    try {
      const local = await localDigest(root, key);
      entry.size = local.size; entry.sha256 = local.sha256;
      if (previous[key] && Number.isSafeInteger(previous[key].size) && previous[key].sha256 && (previous[key].size !== local.size || previous[key].sha256 !== local.sha256)) {
        entry.status = "source-changed-since-manifest"; continue;
      }
      if (!remote) { entry.status = "would-copy-unchecked"; continue; }
      const existing = await remoteDigest(remote, key); // Never trust ETag or metadata as checksum.
      if (existing) {
        entry.remote = existing;
        entry.status = sameDigest(local, existing) ? "verified-existing" : "remote-conflict";
        continue;
      }
      if (!opts.apply) { entry.status = "would-copy"; continue; }
      // A previous report is never trusted as proof; always check the current remote object.
      // Fail closed if the DB reference disappeared or became a logo before writing.
      const [live, currentLogo, audit] = await Promise.all([
        db.itemImage.findUnique({ where: { storageKey: key }, select: { id: true } }),
        db.shopSettings.findMany({ where: { logoKey: key }, select: { id: true } }),
        db.adminConfigEvent.findMany({ where: { action: "upload-logo", entityType: "shop_settings" }, select: { before: true, after: true } }),
      ]);
      const historicalLogo = audit.some(event => [event.before, event.after].some(value => value && typeof value === "object" && value.logoKey === key));
      if (!live || currentLogo.length || historicalLogo) { entry.status = "reference-changed"; continue; }
      const fresh = await localDigest(root, key);
      if (!sameDigest(local, fresh)) { entry.status = "source-changed"; continue; }
      try { await uploadAbsent(remote, key, fresh.bytes); }
      catch (error) {
        // A competing writer may have created the key. Re-read and compare rather than overwriting.
        if (![409, 412].includes(error?.$metadata?.httpStatusCode)) throw error;
        entry.concurrentCreate = true;
      }
      const copied = await remoteDigest(remote, key);
      entry.remote = copied;
      entry.status = sameDigest(local, copied) ? (entry.concurrentCreate ? "verified-existing" : "copied-verified") : "remote-conflict";
    } catch (error) { entry.status = "error"; entry.error = errorText(error); }
  }
  const ending = await inventory(db);
  const inventoryChanged = JSON.stringify(keys) !== JSON.stringify(ending.keys) || [...protectedKeys].some(key => !ending.protectedKeys.has(key)) || [...ending.protectedKeys].some(key => !protectedKeys.has(key));
  const unknownFiles = [...files.keys()].filter(key => !keys.includes(key)).sort();
  const summary = Object.fromEntries([...new Set(items.map(item => item.status))].sort().map(status => [status, items.filter(item => item.status === status).length]));
  const now = new Date().toISOString();
  const manifest = { version: 1, generatedAt: now, mode: opts.apply ? "apply" : "dry-run", root, bucket: remote?.bucket ?? null, items };
  const report = { generatedAt: now, mode: manifest.mode, itemImageCount: keys.length, inventoryChangedDuringRun: inventoryChanged, protectedLogoKeys: [...protectedKeys].sort(), auditWarnings: [...auditWarnings, ...ending.auditWarnings], unsafeEntries: unsafe, unknownFiles, summary, items };
  await writeJson(opts.manifest, manifest);
  await writeJson(opts.report, report);
  console.log(JSON.stringify({ manifest: opts.manifest, report: opts.report, summary, unknownFiles: unknownFiles.length, unsafeEntries: unsafe.length, auditWarnings: auditWarnings.length }, null, 2));
  if (inventoryChanged || items.some(item => !["verified-existing", "copied-verified", "would-copy", "would-copy-unchecked"].includes(item.status)) || report.auditWarnings.length) process.exitCode = 2;
} catch (error) { console.error(errorText(error)); console.error(usage); process.exitCode = 1; }
finally { await db?.$disconnect(); remote?.client.destroy(); }

#!/usr/bin/env node
// Read-only reconciliation of EVERY currently referenced ItemImage key against local and MinIO.
import { readFile } from "node:fs/promises";
import { database, inventory, storageRoot, localInventory, localDigest, s3, remoteDigest, sameDigest, validKey, options, writeJson, errorText } from "./image-storage-common.mjs";

const usage = "Usage: node scripts/verify-image-storage.mjs [--manifest path] [--report path]\nRequires DATABASE_URL and S3 configuration. Reads every live ItemImage key; no writes to DB, object storage or local image root.";
if (process.argv.includes("--help")) { console.log(usage); process.exit(0); }
let db; let remote;
try {
  const opts = options(process.argv.slice(2));
  db = await database();
  const root = await storageRoot();
  const { keys, protectedKeys, auditWarnings } = await inventory(db);
  const { files, unsafe } = await localInventory(root);
  remote = await s3();
  let manifestItems = new Map();
  try {
    const manifest = JSON.parse(await readFile(opts.manifest, "utf8"));
    if (manifest.version !== 1 || !Array.isArray(manifest.items)) throw new Error("Unsupported manifest format");
    if (manifest.bucket && manifest.bucket !== remote.bucket) throw new Error("Manifest bucket differs from configured S3_BUCKET");
    if (manifest.root && manifest.root !== root) throw new Error("Manifest source root differs from current root");
    // A dry-run manifest is not proof of a copy; require a verified apply snapshot.
    if (manifest.mode !== "apply") throw new Error("Verification requires an applied migration manifest");
    manifestItems = new Map(manifest.items.filter(item => validKey(item.key) && ["verified-existing", "copied-verified"].includes(item.status) && Number.isSafeInteger(item.size) && /^[a-f0-9]{64}$/.test(item.sha256)).map(item => [item.key, item]));
  } catch (error) { if (error?.code !== "ENOENT") throw error; }
  const items = [];
  for (const key of keys) {
    const row = { key, status: "pending" }; items.push(row);
    if (!validKey(key)) { row.status = "invalid-key"; continue; }
    const logoConflict = protectedKeys.has(key);
    try {
      // Inspect remote for each live key even if local is unavailable. Never trust ETag.
      const remoteValue = await remoteDigest(remote, key);
      if (remoteValue) row.remote = remoteValue;
      if (files.has(key)) {
        try { const local = await localDigest(root, key); row.local = { size: local.size, sha256: local.sha256 }; }
        catch (error) { row.localError = errorText(error); }
      } else row.localError = "Source missing or unsafe";
      const recorded = manifestItems.get(key);
      if (recorded?.sha256 && Number.isSafeInteger(recorded.size)) row.manifest = { size: recorded.size, sha256: recorded.sha256 };
      if (!remoteValue) row.status = "missing-remote";
      else if (row.local) row.status = sameDigest(row.local, remoteValue) ? "verified" : "mismatch";
      else if (row.manifest) row.status = sameDigest(row.manifest, remoteValue) ? "verified-manifest-only" : "mismatch";
      else row.status = "unverifiable-no-source";
      if (row.manifest && row.local && !sameDigest(row.manifest, row.local)) { row.status = "manifest-source-conflict"; }
      if (logoConflict) row.status = "logo-conflict";
    } catch (error) { row.status = "error"; row.error = errorText(error); }
  }
  // Compare against a second snapshot to catch concurrent mutations during the scan.
  const ending = await inventory(db);
  const changed = keys.length !== ending.keys.length || keys.some((key, index) => key !== ending.keys[index]) || [...protectedKeys].some(key => !ending.protectedKeys.has(key)) || [...ending.protectedKeys].some(key => !protectedKeys.has(key));
  const summary = Object.fromEntries([...new Set(items.map(item => item.status))].sort().map(status => [status, items.filter(item => item.status === status).length]));
  const report = { generatedAt: new Date().toISOString(), bucket: remote.bucket, root, liveKeyCount: keys.length, inventoryChangedDuringRun: changed, protectedLogoKeys: [...protectedKeys].sort(), auditWarnings: [...auditWarnings, ...ending.auditWarnings], unsafeEntries: unsafe, unknownFiles: [...files.keys()].filter(key => !keys.includes(key)).sort(), summary, items };
  await writeJson(opts.report, report);
  console.log(JSON.stringify({ report: opts.report, summary, inventoryChangedDuringRun: changed, liveKeyCount: keys.length }, null, 2));
  if (changed || report.auditWarnings.length || items.some(item => item.status !== "verified")) process.exitCode = 2;
} catch (error) { console.error(errorText(error)); console.error(usage); process.exitCode = 1; }
finally { await db?.$disconnect(); remote?.client.destroy(); }

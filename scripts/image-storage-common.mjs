import nextEnv from "@next/env";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectRoot, process.env.NODE_ENV !== "production");
export const KEY_PATTERN = /^[a-f0-9]{64}\.(?:jpg|png|webp)$/;
const owned = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const validKey = key => typeof key === "string" && KEY_PATTERN.test(key);
export const errorText = error => error instanceof Error ? `${error.name}: ${error.message}` : String(error);
export function options(args, allowApply = false) {
  const result = { apply: false, manifest: path.join(projectRoot, ".private", "minio-migration-manifest.json"), report: path.join(projectRoot, ".private", "minio-migration-report.json") };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--apply" && allowApply) result.apply = true;
    else if (arg === "--dry-run" && allowApply) result.apply = false;
    else if (arg === "--manifest" && args[i + 1]) result.manifest = path.resolve(args[++i]);
    else if (arg === "--report" && args[i + 1]) result.report = path.resolve(args[++i]);
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  if (path.resolve(result.manifest) === path.resolve(result.report)) throw new Error("Manifest and report must have distinct paths");
  return result;
}
export async function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient();
}
export async function inventory(db) {
  // Fail closed if the audit history cannot be queried: previous logo references must not be migrated.
  const [images, settings, events] = await db.$transaction([
    db.itemImage.findMany({ select: { storageKey: true }, orderBy: { storageKey: "asc" } }),
    db.shopSettings.findMany({ select: { logoKey: true } }),
    db.adminConfigEvent.findMany({ where: { action: "upload-logo", entityType: "shop_settings" }, select: { before: true, after: true } }),
  ]);
  const protectedKeys = new Set(settings.map(row => row.logoKey).filter(key => typeof key === "string"));
  const auditWarnings = [];
  for (const event of events) {
    for (const field of ["before", "after"]) {
      const value = event[field];
      if (value && typeof value === "object" && !Array.isArray(value) && owned(value, "logoKey")) {
        if (typeof value.logoKey === "string") protectedKeys.add(value.logoKey);
        else if (value.logoKey !== null) auditWarnings.push(`Unexpected ${field}.logoKey in logo audit event`);
      } else auditWarnings.push(`Missing ${field}.logoKey in logo audit event`);
    }
  }
  return { keys: [...new Set(images.map(row => row.storageKey))].sort(), protectedKeys, auditWarnings };
}
async function rejectSymlinkComponents(target) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  for (const component of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const info = await lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`Storage root has symlink/non-directory component: ${current}`);
  }
  return await realpath(resolved);
}
export async function storageRoot() {
  const configured = process.env.CONSIGNMENT_STORAGE_DIR?.trim();
  const root = path.resolve(configured || path.join(projectRoot, ".private", "consignments"));
  const publicDir = path.join(projectRoot, "public");
  if (root === publicDir || root.startsWith(publicDir + path.sep)) throw new Error("Storage root cannot be inside public");
  const actual = await rejectSymlinkComponents(root);
  const publicActual = await realpath(publicDir).catch(() => publicDir);
  if (actual === publicActual || actual.startsWith(publicActual + path.sep)) throw new Error("Storage root resolves inside public");
  return actual;
}
export async function localInventory(root) {
  const files = new Map();
  const unsafe = [];
  for (const dirent of await readdir(root, { withFileTypes: true })) {
    if (dirent.isFile()) files.set(dirent.name, true);
    else unsafe.push({ name: dirent.name, type: dirent.isSymbolicLink() ? "symlink" : "non-file" });
  }
  return { files, unsafe };
}
export async function localDigest(root, key) {
  if (!validKey(key)) throw new Error("Invalid storage key");
  const name = path.join(root, key);
  const entry = await lstat(name); // Reject symlinks even where O_NOFOLLOW is unavailable.
  if (!entry.isFile() || entry.isSymbolicLink()) throw new Error("Source is not a regular file");
  const handle = await open(name, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.dev !== entry.dev || stat.ino !== entry.ino) throw new Error("Source changed while opening");
    if (stat.size > 12 * 1024 * 1024) throw new Error("Source exceeds product image limit");
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (after.size !== bytes.length || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs) throw new Error("Source changed while reading");
    return { size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), bytes };
  } finally { await handle.close(); }
}
export function s3Configured() {
  const names = ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  // A local-only dry-run works with a copied .env.example: endpoint/region/bucket
  // are documented there, while credentials remain deliberately unset.
  if (!process.env.S3_ACCESS_KEY_ID && !process.env.S3_SECRET_ACCESS_KEY) return false;
  const missing = names.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Incomplete S3 configuration: missing ${missing.join(", ")}`);
  return true;
}
export async function s3() {
  if (!s3Configured()) throw new Error("S3 configuration is required");
  const { S3Client, GetObjectCommand, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const endpoint = new URL(process.env.S3_ENDPOINT);
  if (!["http:", "https:"].includes(endpoint.protocol)) throw new Error("S3_ENDPOINT must use HTTP or HTTPS");
  if (endpoint.username || endpoint.password || endpoint.pathname !== "/" || endpoint.search || endpoint.hash || (endpoint.protocol === "http:" && !["localhost", "127.0.0.1", "minio"].includes(endpoint.hostname))) throw new Error("Unsafe S3_ENDPOINT");
  if (process.env.S3_FORCE_PATH_STYLE !== "true") throw new Error("S3_FORCE_PATH_STYLE must be true");
  const { NodeHttpHandler } = await import("@smithy/node-http-handler");
  const client = new S3Client({ endpoint: endpoint.origin, region: process.env.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }, maxAttempts: 2, requestHandler: new NodeHttpHandler({ connectionTimeout: 3000, requestTimeout: 10000 }) });
  return { client, bucket: process.env.S3_BUCKET, GetObjectCommand, PutObjectCommand };
}
export async function remoteDigest(s3Config, key) {
  if (!validKey(key)) throw new Error("Invalid storage key");
  let result;
  try { result = await s3Config.client.send(new s3Config.GetObjectCommand({ Bucket: s3Config.bucket, Key: key })); }
  catch (error) {
    // A missing bucket or incorrect endpoint is not a missing object.
    if (error?.name === "NoSuchKey" || error?.name === "NotFound") return null;
    throw error;
  }
  const hash = createHash("sha256");
  let size = 0;
  if (!result.Body) throw new Error("Remote object returned no body");
  const maxBytes = 12 * 1024 * 1024;
  if (result.ContentLength !== undefined && result.ContentLength > maxBytes) throw new Error("Remote object exceeds image limit");
  for await (const chunk of result.Body) {
    size += chunk.length;
    if (size > maxBytes) { if ("destroy" in result.Body && typeof result.Body.destroy === "function") result.Body.destroy(); throw new Error("Remote object exceeds image limit"); }
    hash.update(chunk);
  }
  if (result.ContentLength !== undefined && size !== result.ContentLength) throw new Error("Remote ContentLength does not match downloaded bytes");
  return { size, sha256: hash.digest("hex") };
}
export async function uploadAbsent(s3Config, key, bytes) {
  if (!validKey(key)) throw new Error("Invalid storage key");
  const mime = key.endsWith(".webp") ? "image/webp" : key.endsWith(".png") ? "image/png" : "image/jpeg";
  return s3Config.client.send(new s3Config.PutObjectCommand({ Bucket: s3Config.bucket, Key: key, Body: bytes, ContentLength: bytes.length, ContentType: mime, Metadata: { sha256: createHash("sha256").update(bytes).digest("hex") }, IfNoneMatch: "*" }));
}
export async function writeJson(filename, value) {
  const dest = path.resolve(filename);
  await mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
  const temporary = `${dest}.${process.pid}.${Date.now()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 }); await rename(temporary, dest); }
  catch (error) { const { unlink } = await import("node:fs/promises"); await unlink(temporary).catch(() => {}); throw error; }
}
export const sameDigest = (a, b) => Boolean(a && b && a.size === b.size && a.sha256 === b.sha256);

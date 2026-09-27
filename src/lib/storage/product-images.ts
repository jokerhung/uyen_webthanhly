import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { deletePrivateImage, detectImageType, readPrivateImage, storePrivateImage, type StoredPrivateImage } from "./images";
import { productImageDriver, productS3Config } from "./product-image-config";

const keyPattern = /^[a-f0-9]{64}\.(?:jpg|png|webp)$/;
const MAX_READ = 12 * 1024 * 1024;
let cached: { signature: string; client: S3Client } | undefined;
function backend() {
  const config = productS3Config();
  const signature = createHash("sha256").update(JSON.stringify(config)).digest("hex");
  if (cached?.signature !== signature) {
    cached?.client.destroy();
    cached = { signature, client: new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: true, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }, maxAttempts: 2, requestHandler: new NodeHttpHandler({ connectionTimeout: 3_000, requestTimeout: 10_000 }) }) };
  }
  return { config, client: cached.client };
}
function validateKey(key: string) { if (!keyPattern.test(key)) throw new Error("Invalid product image storage key"); }
function missing(error: unknown) { return error && typeof error === "object" && "name" in error && ["NoSuchKey", "NotFound"].includes(String(error.name)); }
export class ProductImageNotFound extends Error { constructor() { super("Product image not found"); } }

export async function storeProductImage(bytes: Uint8Array): Promise<StoredPrivateImage> {
  if (productImageDriver() === "local") return storePrivateImage(bytes);
  const kind = detectImageType(bytes);
  if (!kind || bytes.byteLength > MAX_READ) throw new Error("Invalid product image contents or size");
  const storageKey = `${randomBytes(32).toString("hex")}${kind.extension}`;
  const { config, client } = backend();
  await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: storageKey, Body: bytes, ContentType: kind.mimeType, Metadata: { sha256: createHash("sha256").update(bytes).digest("hex") } }));
  return { storageKey, mimeType: kind.mimeType, byteSize: bytes.byteLength };
}
export async function readProductImage(storageKey: string): Promise<Buffer> {
  validateKey(storageKey);
  if (productImageDriver() === "local") return readPrivateImage(storageKey);
  const { config, client } = backend();
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: storageKey }));
    if (!response.Body || (response.ContentLength !== undefined && response.ContentLength > MAX_READ)) throw new Error("Product image exceeds read limit");
    // Node route handlers receive an async iterable; ContentLength is advisory,
    // so enforce the byte limit while consuming the stream as well.
    const body = response.Body;
    if (!(Symbol.asyncIterator in body)) throw new Error("Unsupported product image response body");
    const parts: Buffer[] = []; let size = 0;
    for await (const part of body as AsyncIterable<Uint8Array>) {
      size += part.byteLength;
      if (size > MAX_READ) { if ("destroy" in body && typeof body.destroy === "function") body.destroy(); throw new Error("Product image exceeds read limit"); }
      parts.push(Buffer.from(part));
    }
    return Buffer.concat(parts, size);
  } catch (error) { if (missing(error)) throw new ProductImageNotFound(); throw error; }
}
export async function headProductImage(storageKey: string): Promise<{ byteSize: number; sha256?: string }> {
  validateKey(storageKey);
  if (productImageDriver() === "local") { const data = await readPrivateImage(storageKey); return { byteSize: data.length, sha256: createHash("sha256").update(data).digest("hex") }; }
  const { config, client } = backend();
  try { const row = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: storageKey })); return { byteSize: row.ContentLength ?? 0, sha256: row.Metadata?.sha256 }; }
  catch (error) { if (missing(error)) throw new ProductImageNotFound(); throw error; }
}
export async function deleteProductImage(storageKey: string): Promise<void> {
  validateKey(storageKey);
  if (productImageDriver() === "local") { await deletePrivateImage(storageKey).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }); return; }
  const { config, client } = backend();
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: storageKey }));
}
/** Best effort rollback only. Caller queues failed deletions for durable retry. */
export async function cleanupProductImages(keys: readonly string[]): Promise<void> {
  const results = await Promise.allSettled(keys.map(deleteProductImage));
  const errors = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (errors.length) throw new AggregateError(errors.map(error => error.reason), "Product image cleanup failed");
}

import "server-only";

export type ProductImageDriver = "local" | "minio";
export function productImageDriver(): ProductImageDriver {
  const driver = process.env.PRODUCT_IMAGE_STORAGE_DRIVER?.trim() || "local";
  if (driver !== "local" && driver !== "minio") throw new Error("Invalid PRODUCT_IMAGE_STORAGE_DRIVER (expected local or minio)");
  return driver;
}
export type S3ProductConfig = { endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string };
export function productS3Config(): S3ProductConfig {
  const endpoint = process.env.S3_ENDPOINT?.trim() ?? "";
  const region = process.env.S3_REGION?.trim() ?? "";
  const bucket = process.env.S3_BUCKET?.trim() ?? "";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() ?? "";
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) throw new Error("MinIO product-image configuration incomplete");
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new Error("Invalid S3_ENDPOINT"); }
  if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid S3_ENDPOINT");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "minio"].includes(url.hostname)) throw new Error("S3_ENDPOINT requires HTTPS except local Docker/loopback");
  if (process.env.S3_FORCE_PATH_STYLE !== "true") throw new Error("S3_FORCE_PATH_STYLE must be true for MinIO");
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || !/^[a-z0-9-]+$/.test(region)) throw new Error("Invalid S3 bucket or region");
  return { endpoint: url.origin, region, bucket, accessKeyId, secretAccessKey };
}

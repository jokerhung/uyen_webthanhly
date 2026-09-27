import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { productImageDriver, productS3Config } from "../../src/lib/storage/product-image-config";

const names = ["PRODUCT_IMAGE_STORAGE_DRIVER", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_FORCE_PATH_STYLE"] as const;
const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
afterEach(() => {
  for (const name of names) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});
function validConfig() {
  process.env.S3_ENDPOINT = "http://127.0.0.1:9000";
  process.env.S3_REGION = "us-east-1";
  process.env.S3_BUCKET = "besties-media";
  process.env.S3_ACCESS_KEY_ID = "test-key";
  process.env.S3_SECRET_ACCESS_KEY = "test-secret";
  process.env.S3_FORCE_PATH_STYLE = "true";
}

describe("product-image storage configuration", () => {
  it("defaults to local and refuses an unknown driver", () => {
    delete process.env.PRODUCT_IMAGE_STORAGE_DRIVER;
    expect(productImageDriver()).toBe("local");
    process.env.PRODUCT_IMAGE_STORAGE_DRIVER = "minio";
    expect(productImageDriver()).toBe("minio");
    process.env.PRODUCT_IMAGE_STORAGE_DRIVER = "s3";
    expect(productImageDriver).toThrow("Invalid PRODUCT_IMAGE_STORAGE_DRIVER");
  });
  it("requires complete private credentials and path-style requests", () => {
    validConfig();
    expect(productS3Config()).toEqual({ endpoint: "http://127.0.0.1:9000", region: "us-east-1", bucket: "besties-media", accessKeyId: "test-key", secretAccessKey: "test-secret" });
    delete process.env.S3_SECRET_ACCESS_KEY;
    expect(productS3Config).toThrow("incomplete");
    validConfig();
    process.env.S3_FORCE_PATH_STYLE = "false";
    expect(productS3Config).toThrow("S3_FORCE_PATH_STYLE");
  });
  it("rejects remote HTTP and URL credentials but accepts HTTPS", () => {
    validConfig();
    process.env.S3_ENDPOINT = "http://object-store.example:9000";
    expect(productS3Config).toThrow("requires HTTPS");
    process.env.S3_ENDPOINT = "https://user:secret@object-store.example";
    expect(productS3Config).toThrow("Invalid S3_ENDPOINT");
    process.env.S3_ENDPOINT = "https://object-store.example";
    expect(productS3Config().endpoint).toBe("https://object-store.example");
  });
});

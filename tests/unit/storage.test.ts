import { mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupPrivateImages,
  deletePrivateImage,
  detectImageType,
  readPrivateImage,
  storePrivateImage,
} from "../../src/lib/storage/images";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), Buffer.alloc(4)]);
let temporaryDirectory: string;
let savedStorageDirectory: string | undefined;

beforeEach(async () => {
  savedStorageDirectory = process.env.CONSIGNMENT_STORAGE_DIR;
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "consignment-storage-test-"));
  process.env.CONSIGNMENT_STORAGE_DIR = path.join(temporaryDirectory, "nested", "private");
});

afterEach(async () => {
  if (savedStorageDirectory === undefined) delete process.env.CONSIGNMENT_STORAGE_DIR;
  else process.env.CONSIGNMENT_STORAGE_DIR = savedStorageDirectory;
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe("private image storage", () => {
  it("detects supported formats by magic bytes, not names, and rejects SVG and arbitrary data", () => {
    expect(detectImageType(jpeg)).toEqual({ mimeType: "image/jpeg", extension: ".jpg" });
    expect(detectImageType(png)).toEqual({ mimeType: "image/png", extension: ".png" });
    expect(detectImageType(webp)).toEqual({ mimeType: "image/webp", extension: ".webp" });
    expect(detectImageType(Buffer.from("RIFF\0\0\0\0WEBPVP8L"))?.extension).toBe(".webp");
    expect(detectImageType(Buffer.from("RIFF\0\0\0\0WEBPVP8X"))?.extension).toBe(".webp");
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(detectImageType(Buffer.from("not a PNG"))).toBeNull();
    expect(detectImageType(Buffer.from("RIFF\0\0\0\0WEBPBOGUS"))).toBeNull();
  });

  it("rejects unsupported bytes without creating storage", async () => {
    await expect(storePrivateImage(Buffer.from("<svg/>"))).rejects.toThrow("Unsupported image contents");
    await expect(stat(process.env.CONSIGNMENT_STORAGE_DIR!)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("stores distinct unpredictable private keys with owner-only permissions and cleans up", async () => {
    const first = await storePrivateImage(jpeg);
    const second = await storePrivateImage(jpeg);
    expect(first).toMatchObject({ mimeType: "image/jpeg", byteSize: jpeg.length });
    expect(first.storageKey).toMatch(/^[a-f0-9]{64}\.jpg$/);
    expect(first.storageKey).not.toBe(second.storageKey);
    expect(await readPrivateImage(first.storageKey)).toEqual(jpeg);
    expect(await readFile(path.join(process.env.CONSIGNMENT_STORAGE_DIR!, first.storageKey))).toEqual(jpeg);
    if (process.platform !== "win32") {
      expect((await stat(process.env.CONSIGNMENT_STORAGE_DIR!)).mode & 0o777).toBe(0o700);
      expect((await stat(path.join(process.env.CONSIGNMENT_STORAGE_DIR!, first.storageKey))).mode & 0o777).toBe(0o600);
    }
    await cleanupPrivateImages([first.storageKey, second.storageKey]);
    expect(await readdir(process.env.CONSIGNMENT_STORAGE_DIR!)).toEqual([]);
  });

  it("validates keys before reading or deleting arbitrary paths", async () => {
    await expect(readPrivateImage("../secret.jpg")).rejects.toThrow("Invalid private image storage key");
    await expect(deletePrivateImage("../../public/file.png")).rejects.toThrow("Invalid private image storage key");
  });

  it("rejects configured storage within the public directory", async () => {
    process.env.CONSIGNMENT_STORAGE_DIR = path.join(process.cwd(), "public", "consignments");
    await expect(storePrivateImage(png)).rejects.toThrow("cannot be inside public");
  });

  it("does not follow a symlink substituted for a private image", async () => {
    if (process.platform === "win32") return;
    const stored = await storePrivateImage(webp);
    await rm(path.join(process.env.CONSIGNMENT_STORAGE_DIR!, stored.storageKey));
    const secretPath = path.join(temporaryDirectory, "secret.txt");
    await writeFile(secretPath, "private-data");
    await symlink(secretPath, path.join(process.env.CONSIGNMENT_STORAGE_DIR!, stored.storageKey));
    await expect(readPrivateImage(stored.storageKey)).rejects.toThrow();
  });
});

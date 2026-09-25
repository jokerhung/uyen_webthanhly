import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, open, realpath, unlink } from "node:fs/promises";
import path from "node:path";

export type PrivateImageType = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: ".jpg" | ".png" | ".webp";
};

export type StoredPrivateImage = {
  storageKey: string;
  mimeType: PrivateImageType["mimeType"];
  byteSize: number;
};

const KEY_PATTERN = /^[a-f0-9]{64}\.(?:jpg|png|webp)$/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Inspect the file contents, never the browser-supplied name or MIME type. */
export function detectImageType(bytes: Uint8Array): PrivateImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: ".jpg" };
  }
  if (bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    return { mimeType: "image/png", extension: ".png" };
  }
  if (
    bytes.length >= 16 &&
    Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(Buffer.from(bytes.subarray(12, 16)).toString("ascii"))
  ) {
    return { mimeType: "image/webp", extension: ".webp" };
  }
  return null;
}

function inside(candidate: string, directory: string): boolean {
  const relative = path.relative(directory, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function storageRoot(): Promise<string> {
  const configured = process.env.CONSIGNMENT_STORAGE_DIR?.trim();
  const root = path.resolve(configured || path.join(process.cwd(), ".private", "consignments"));
  const publicDir = path.resolve(process.cwd(), "public");
  // Reject even nonexistent paths inside public, not only existing symlinks into it.
  if (inside(root, publicDir)) throw new Error("Private image storage cannot be inside public");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Private image storage root must be a directory");
  const actualRoot = await realpath(root);
  const actualPublic = await realpath(publicDir).catch(() => publicDir);
  if (inside(actualRoot, actualPublic) || inside(actualRoot, publicDir)) {
    throw new Error("Private image storage cannot be inside public");
  }
  await chmod(root, 0o700);
  return actualRoot;
}

function imagePath(root: string, storageKey: string): string {
  if (!KEY_PATTERN.test(storageKey)) throw new Error("Invalid private image storage key");
  return path.join(root, storageKey);
}

/** Caller enforces the configured file-size and per-item image-count policy before writing. */
export async function storePrivateImage(bytes: Uint8Array): Promise<StoredPrivateImage> {
  const imageType = detectImageType(bytes);
  if (!imageType) throw new Error("Unsupported image contents; expected JPEG, PNG, or WebP");
  const root = await storageRoot();
  // wx means no existing file is ever overwritten; the OS grants owner-only access.
  const storageKey = `${randomBytes(32).toString("hex")}${imageType.extension}`;
  const destination = imagePath(root, storageKey);
  const file = await open(destination, "wx", 0o600);
  try {
    await file.writeFile(bytes);
  } catch (error) {
    await file.close();
    await unlink(destination).catch(() => undefined);
    throw error;
  }
  await file.close();
  return { storageKey, mimeType: imageType.mimeType, byteSize: bytes.byteLength };
}

/** Only call from an authorized server route; this does not expose a public URL. */
export async function readPrivateImage(storageKey: string): Promise<Buffer> {
  const root = await storageRoot();
  const file = await open(imagePath(root, storageKey), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    if (!(await file.stat()).isFile()) throw new Error("Private image is not a regular file");
    return await file.readFile();
  } finally {
    await file.close();
  }
}

/** Remove one newly uploaded image if a later transaction fails. */
export async function deletePrivateImage(storageKey: string): Promise<void> {
  const root = await storageRoot();
  await unlink(imagePath(root, storageKey));
}

/** Attempt all rollbacks even if a particular file cannot be removed. */
export async function cleanupPrivateImages(storageKeys: readonly string[]): Promise<void> {
  const results = await Promise.allSettled(storageKeys.map((storageKey) => deletePrivateImage(storageKey)));
  const errors = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (errors.length) throw new AggregateError(errors.map((result) => result.reason), "Private image cleanup failed");
}

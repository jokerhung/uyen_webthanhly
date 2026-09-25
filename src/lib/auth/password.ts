import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_BYTES, { N: COST, r: BLOCK_SIZE, p: PARALLELISM, maxmem: MAX_MEMORY }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_BYTES = 64;
const MAX_MEMORY = 64 * 1024 * 1024;
const DUMMY_SALT = Buffer.alloc(16, 0);
const DUMMY_HASH = Buffer.alloc(KEY_BYTES, 0);

/** Stored format: scrypt$16384$8$1$<16-byte base64url salt>$<64-byte base64url digest>. */
export async function hashAdminPassword(password: string): Promise<string> {
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 1024) throw new Error("Invalid password length");
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt));
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELISM}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyAdminPassword(password: string, stored: string | null): Promise<boolean> {
  const pieces = stored?.split("$");
  const validFormat = pieces?.length === 6 && pieces[0] === "scrypt" && pieces[1] === String(COST) &&
    pieces[2] === String(BLOCK_SIZE) && pieces[3] === String(PARALLELISM) &&
    /^[A-Za-z0-9_-]{22}$/.test(pieces[4]) && /^[A-Za-z0-9_-]{86}$/.test(pieces[5]);
  const salt = validFormat ? Buffer.from(pieces[4], "base64url") : DUMMY_SALT;
  const expected = validFormat ? Buffer.from(pieces[5], "base64url") : DUMMY_HASH;
  const derived = (await scrypt(password, salt));
  return Boolean(validFormat && expected.length === KEY_BYTES && timingSafeEqual(derived, expected));
}

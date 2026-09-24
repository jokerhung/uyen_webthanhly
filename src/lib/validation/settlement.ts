export function normalizeVietnamesePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s.()-]/g, "");
  const local = cleaned.startsWith("+84") ? `0${cleaned.slice(3)}` : cleaned;
  if (!/^0[35789]\d{8}$/.test(local)) return null;
  return local;
}

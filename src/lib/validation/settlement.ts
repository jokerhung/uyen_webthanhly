export function normalizeSettlementQuery(input: string): string | null {
  const value = input.trim();
  if (value === "0000000000") return value;
  const phone = normalizeVietnamesePhone(value);
  if (phone) return phone;
  const code = value.toUpperCase();
  return /^(?:HUN-[A-F0-9]{32}|DEMO-SETTLEMENT-\d{4}|DEMO-ONLY-NOT-A-REAL-RECEIPT)$/.test(code) ? code : null;
}

export function normalizeVietnamesePhone(input: string): string | null {
  const cleaned = input.trim().replace(/[\s.()-]/g, "");
  const local = cleaned.startsWith("+84") ? `0${cleaned.slice(3)}` : cleaned;
  if (!/^0[35789]\d{8}$/.test(local)) return null;
  return local;
}

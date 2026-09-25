import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { checkIntakeRateLimit } from "@/lib/db/rate-limit";
import { normalizeSettlementQuery, normalizeVietnamesePhone } from "@/lib/validation/settlement";
import { itemStatusLabels } from "@/lib/admin/item-status";

export const runtime = "nodejs";
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ kind: "error" }, 403);
  let input: unknown;
  try { input = await request.json(); } catch { return reply({ kind: "invalid" }, 400); }
  if (!input || typeof input !== "object" || !("query" in input) || typeof input.query !== "string" || input.query.length > 128) return reply({ kind: "invalid" }, 422);
  const query = normalizeSettlementQuery(input.query);
  if (!query) return reply({ kind: "invalid" }, 422);
  try {
    const bucket = createHash("sha256").update(`settlement:${query}`).digest("hex");
    if (!(await checkIntakeRateLimit(bucket, 30))) return reply({ kind: "rate-limited" }, 429);
    const phone = normalizeVietnamesePhone(query);
    const receipts = await prisma.consignment.findMany({
      where: phone ? { consignor: { phoneNormalized: phone } } : { publicCode: query },
      orderBy: { createdAt: "desc" }, take: 50,
      select: { publicCode: true, createdAt: true, items: { select: { status: true } } },
    });
    if (!receipts.length) return reply({ kind: "empty" });
    // Phone lookup exposes a minimal status summary, never contact data,
    // item descriptions, prices or full bearer-like receipt codes.
    return reply({ kind: "receipts", reports: receipts.map(receipt => ({
      code: phone ? `…${receipt.publicCode.slice(-8)}` : receipt.publicCode,
      receivedAt: receipt.createdAt.toISOString(),
      itemCount: receipt.items.length,
      statuses: Object.entries(receipt.items.reduce<Record<string, number>>((counts, item) => {
        const label = itemStatusLabels[item.status]; counts[label] = (counts[label] ?? 0) + 1; return counts;
      }, {})).map(([label, count]) => ({ label, count })),
    })) });
  } catch {
    return reply({ kind: "error" }, 500);
  }
}

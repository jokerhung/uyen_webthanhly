import "server-only";
import { prisma } from "./client";

/** Shared PostgreSQL-backed fixed window. Not dependent on process memory. */
export async function checkIntakeRateLimit(clientHash: string, maxPerWindow = 5): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ allowed: boolean }[]>`
    INSERT INTO intake_rate_limits (client_hash, window_start, attempts)
    VALUES (${clientHash}, date_trunc('hour', CURRENT_TIMESTAMP), 1)
    ON CONFLICT (client_hash, window_start)
    DO UPDATE SET attempts = intake_rate_limits.attempts + 1
    RETURNING attempts <= ${maxPerWindow} AS allowed
  `;
  return rows[0]?.allowed === true;
}

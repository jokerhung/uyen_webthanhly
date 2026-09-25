import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/client";

/** Atomic 15-minute, database-shared login limit. Buckets never contain raw email/IP. */
export async function checkAdminLoginRateLimit(email: string): Promise<boolean> {
  const bucketHash = createHash("sha256").update(`admin-login-email:${email}`).digest("hex");
  // Do not trust X-Forwarded-For unless the deployment explicitly overwrites it.
  const [bucket] = await prisma.$queryRaw<{ allowed: boolean }[]>`
    INSERT INTO admin_login_rate_limits (bucket_hash, window_start, attempts)
    VALUES (${bucketHash}, date_trunc('hour', CURRENT_TIMESTAMP) +
      ((EXTRACT(MINUTE FROM CURRENT_TIMESTAMP)::integer / 15) * interval '15 minutes'), 1)
    ON CONFLICT (bucket_hash, window_start)
    DO UPDATE SET attempts = admin_login_rate_limits.attempts + 1
    RETURNING attempts <= 5 AS allowed
  `;
  return bucket?.allowed === true;
}

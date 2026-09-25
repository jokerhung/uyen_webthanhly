import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { AdminRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { isLocalDevAdminEnabled } from "./local-dev";

const SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const cookieName = process.env.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session";

export type AdminSession = { id: string; email: string; role: AdminRole };

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !TOKEN_PATTERN.test(token)) return null;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: { expiresAt: true, admin: { select: { id: true, email: true, role: true, active: true } } },
  });
  if (!session || session.expiresAt.getTime() <= Date.now() || !session.admin.active) return null;
  if (session.admin.email === "admin" && !isLocalDevAdminEnabled()) return null;
  const { id, email, role } = session.admin;
  return { id, email, role };
}

/** For server-rendered admin pages. For APIs use getAdminSession() and return 401 instead. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function createAdminSession(adminId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await prisma.adminSession.create({ data: { adminId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + SESSION_LIFETIME_SECONDS * 1000) } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_LIFETIME_SECONDS,
  });
}

export async function deleteAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token && TOKEN_PATTERN.test(token)) {
    await prisma.adminSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
  jar.set(cookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

/** Same-origin checks for session mutations and other cookie-authenticated admin API mutations. */
export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || origin === "null" || (fetchSite && fetchSite !== "same-origin")) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

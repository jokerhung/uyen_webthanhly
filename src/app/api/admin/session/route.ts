import { prisma } from "@/lib/db/client";
import { checkAdminLoginRateLimit } from "@/lib/auth/rate-limit";
import { verifyAdminPassword } from "@/lib/auth/password";
import { isLocalDevAdminEnabled } from "@/lib/auth/local-dev";
import { createAdminSession, deleteAdminSession, getAdminSession, isSameOriginMutation } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;
const json = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const unauthorized = () => json({ error: "Invalid credentials" }, 401);

async function readSmallBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("Body too large"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function GET(): Promise<Response> {
  try {
    const admin = await getAdminSession();
    return admin ? json({ authenticated: true, admin: { id: admin.id, email: admin.email, role: admin.role } }, 200) : unauthorized();
  } catch {
    console.error("Admin session lookup failed");
    return json({ error: "Service unavailable" }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  const isForm = (request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/x-www-form-urlencoded");
  if (!isForm) return loginJson(request);
  if (!isSameOriginMutation(request)) return new Response(null, { status: 303, headers: { Location: "/admin/login?error=origin", "Cache-Control": "no-store" } });
  let fields: URLSearchParams;
  try { fields = new URLSearchParams(await readSmallBody(request)); }
  catch { return new Response(null, { status: 303, headers: { Location: "/admin/login?error=invalid", "Cache-Control": "no-store" } }); }
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  const result = await loginJson(new Request(request.url, { method: "POST", headers, body: JSON.stringify({ email: fields.get("email"), password: fields.get("password") }) }));
  const responseHeaders = new Headers(result.headers);
  responseHeaders.delete("content-type");
  responseHeaders.set("Location", result.ok ? "/admin/consignments" : `/admin/login?error=${result.status === 429 ? "rate" : result.status === 503 ? "service" : "invalid"}`);
  return new Response(null, { status: 303, headers: responseHeaders });
}

async function loginJson(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request)) return json({ error: "Forbidden" }, 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return json({ error: "Invalid request" }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return json({ error: "Invalid request" }, 413);
  let body: unknown;
  try { body = JSON.parse(await readSmallBody(request)); }
  catch { return json({ error: "Invalid request" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return unauthorized();
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string" || email.length > 320 || password.length > 1024) return unauthorized();
  const normalizedEmail = email.trim().toLowerCase();
  const localDevLogin = normalizedEmail === "admin" && isLocalDevAdminEnabled();
  if (!localDevLogin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return unauthorized();
  try {
    if (!(await checkAdminLoginRateLimit(normalizedEmail))) return json({ error: "Too many attempts. Try again later." }, 429);
    const admin = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail }, select: { id: true, active: true, passwordHash: true },
    });
    const validPassword = await verifyAdminPassword(password, admin?.passwordHash ?? null);
    if (!admin?.active || !validPassword || (normalizedEmail === "admin" && !isLocalDevAdminEnabled())) return unauthorized();
    await createAdminSession(admin.id);
    return json({ authenticated: true }, 200);
  } catch {
    console.error("Admin login failed");
    return json({ error: "Service unavailable" }, 503);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isSameOriginMutation(request)) return json({ error: "Forbidden" }, 403);
  try {
    await deleteAdminSession();
    return json({ authenticated: false }, 200);
  } catch {
    console.error("Admin logout failed");
    return json({ error: "Service unavailable" }, 503);
  }
}

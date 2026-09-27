import { getManagedOptions, postManagedOption } from "@/lib/admin/listing-option-routes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() { return getManagedOptions("brand"); }
export function POST(request: Request) { return postManagedOption("brand", request); }

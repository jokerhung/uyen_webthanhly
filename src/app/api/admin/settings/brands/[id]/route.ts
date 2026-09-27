import { patchManagedOption } from "@/lib/admin/listing-option-routes";
export const runtime = "nodejs";
export function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { return patchManagedOption("brand", request, params); }

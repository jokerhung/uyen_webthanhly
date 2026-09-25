import type { MetadataRoute } from "next";
import { indexingAllowed, publicSiteOrigin } from "@/lib/catalog/indexing";

export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/consign/submit", "/buy/submit", "/sales"] }, sitemap: `${publicSiteOrigin()}/sitemap.xml` };
}

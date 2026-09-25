export function publicSiteOrigin(): string | null {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || ["localhost", "127.0.0.1"].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}

export function indexingAllowed(): boolean {
  return process.env.NODE_ENV === "production" && process.env.PUBLIC_INDEXING_ENABLED === "true" && publicSiteOrigin() !== null;
}

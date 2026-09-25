// Never accept a short, username-only developer account outside the disposable local database.
export function isLocalDevAdminEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return ["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname === "/webkygui_dev";
  } catch { return false; }
}

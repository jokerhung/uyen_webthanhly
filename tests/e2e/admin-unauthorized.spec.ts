import { expect, test } from "@playwright/test";

for (const route of ["/admin/items", "/admin/items/demo", "/admin/consignments", "/admin/consignments/demo"]) {
  test(`admin page redirects anonymous users: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Đăng nhập quản trị" })).toBeVisible();
  });
}

test("admin APIs never expose private data without a session", async ({ request, baseURL }) => {
  const session = await request.get("/api/admin/session");
  expect(session.status()).toBe(401);
  const image = await request.get(`/api/admin/images/${"a".repeat(64)}.webp`);
  expect(image.status()).toBe(401);
  const mutation = await request.patch("/api/admin/items/00000000-0000-4000-8000-000000000000", {
    headers: { Origin: baseURL! }, data: { action: "approve", expectedStatus: "PENDING", salePrice: 1 },
  });
  expect(mutation.status()).toBe(401);
});

test("login API rejects cross-origin writes", async ({ request }) => {
  const response = await request.post("/api/admin/session", { headers: { Origin: "https://evil.example" }, data: { email: "test@example.com", password: "incorrect" } });
  expect(response.status()).toBe(403);
});

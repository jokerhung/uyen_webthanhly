import { test, expect } from "@playwright/test";

// Only assert the gate when the selected environment has not approved intake.
test("intake remains disabled until policy approval", async ({ page, request }) => {
  test.skip(process.env.PRIVACY_POLICY_REVIEWED === "true", "This environment enables intake; verify against a disabled environment instead.");
  await page.goto("/consign/submit");
  await expect(page.getByText(/tạm chưa tiếp nhận phiếu ký gửi online/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /tạm ngừng tiếp nhận online/i })).toBeDisabled();
  const response = await request.post("/api/consignments", { multipart: { name: "Test" }, headers: { "Idempotency-Key": "1234567890abcdef", Origin: new URL(page.url()).origin } });
  expect(response.status()).toBe(503);
});

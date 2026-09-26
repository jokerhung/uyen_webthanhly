import { describe, expect, it } from "vitest";
import { announcementInputSchema } from "../../src/lib/shop/announcement-validation";

const valid = { expectedVersion: 1, announcementText: "Chào bạn ✦ Giảm giá mùa hè", announcementEnabled: true };
describe("announcement validation", () => {
  it("trims Vietnamese plain text without interpreting HTML", () => {
    expect(announcementInputSchema.parse({ ...valid, announcementText: "  <script>alert(1)</script>  " }).announcementText).toBe("<script>alert(1)</script>");
  });
  it("requires nonempty text only when enabled", () => {
    expect(announcementInputSchema.safeParse({ ...valid, announcementText: "   " }).success).toBe(false);
    expect(announcementInputSchema.parse({ ...valid, announcementText: "   ", announcementEnabled: false }).announcementText).toBe("");
  });
  it("rejects oversized or unauthorized fields, bad version and nonboolean switch", () => {
    for (const invalid of [{ announcementText: "x".repeat(501) }, { expectedVersion: 0 }, { announcementEnabled: "true" }, { shopName: "Injected" }]) {
      expect(announcementInputSchema.safeParse({ ...valid, ...invalid }).success).toBe(false);
    }
  });
});

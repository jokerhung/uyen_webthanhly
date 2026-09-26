import { describe, expect, it } from "vitest";
import { brand } from "../../src/content/brand";
import { getSiteConfig } from "../../src/content/site";
import { shopSettingsInputSchema } from "../../src/lib/shop/validation";

const base = { expectedVersion: 1, shopName: brand.name, slogan: brand.tagline, primaryColor: "#764D32", backgroundColor: "#FFF9F1", surfaceColor: "#FFFFFF", address: brand.address, facebookUrl: brand.facebook, phone: brand.phone, opensAt: "09:00", closesAt: "22:00" };

describe("shop profile validation", () => {
  it("normalizes phone, color and accepts next-day hours", () => {
    const result = shopSettingsInputSchema.parse({ ...base, opensAt: "22:00", closesAt: "03:00" });
    expect(result.phone).toBe("0986489942");
    expect(result.primaryColor).toBe("#764D32");
    expect(shopSettingsInputSchema.parse({ ...base, slogan: "  Đồ đẹp thêm một lần yêu  " }).slogan).toBe("Đồ đẹp thêm một lần yêu");
  });
  it("rejects invalid colors, facebook credentials, equal hours and phone", () => {
    for (const extra of [{ primaryColor: "red" }, { facebookUrl: "https://evil.example" }, { facebookUrl: "https://u:p@facebook.com/" }, { phone: "0123" }, { slogan: "   " }, { slogan: "x".repeat(201) }, { closesAt: "09:00" }]) {
      expect(shopSettingsInputSchema.safeParse({ ...base, ...extra }).success).toBe(false);
    }
  });
  it("keeps technical intake flags separate from public shop contact", () => {
    expect(getSiteConfig()).not.toHaveProperty("shopPhone");
    expect(getSiteConfig()).not.toHaveProperty("brand");
  });
});

import { describe, expect, it } from "vitest";
import { statusActionSchema } from "../../src/lib/admin/status-transitions";
import { activeItemStatuses, statusActionTargets } from "../../src/lib/admin/item-status";
const listing = { genderId: "gender-unisex", seasonId: "season-summer", category: "ao", materialId: "material-cotton", sizeId: "size-m", brandId: "brand-no-brand", priceOptionId: "price-120000" };

describe("admin item transitions", () => {
  it("requires all seven lookup choices and rejects a client-supplied price", () => {
    expect(statusActionSchema.safeParse({ action: "approve", expectedStatus: "RECEIVED", ...listing }).success).toBe(true);
    for (const field of Object.keys(listing)) {
      expect(statusActionSchema.safeParse({ action: "approve", expectedStatus: "RECEIVED", ...listing, [field]: "" }).success).toBe(false);
    }
    expect(statusActionSchema.safeParse({ action: "approve", expectedStatus: "RECEIVED", ...listing, salePrice: 1 }).success).toBe(false);
    expect(statusActionSchema.safeParse({ action: "approve", expectedStatus: "APPROVED", ...listing }).success).toBe(false);
  });
  it("allows skipped states but disallows injected actor", () => {
    expect(statusActionSchema.safeParse({ action: "negotiate", expectedStatus: "PENDING", reason: "Đang trao đổi giá" }).success).toBe(true);
    expect(statusActionSchema.safeParse({ action: "receive", expectedStatus: "PENDING" }).success).toBe(true);
    expect(statusActionSchema.safeParse({ action: "negotiate", expectedStatus: "PENDING", actorAdminId: "forged" }).success).toBe(false);
  });
  it("allows all 56 different-state transitions and rejects all 8 no-ops", () => {
    for (const expectedStatus of activeItemStatuses) {
      for (const [action, target] of Object.entries(statusActionTargets)) {
        const payload = { action, expectedStatus, ...(action === "approve" ? listing : {}) };
        expect(statusActionSchema.safeParse(payload).success, `${expectedStatus} -> ${target}`).toBe(expectedStatus !== target);
      }
    }
  });
});

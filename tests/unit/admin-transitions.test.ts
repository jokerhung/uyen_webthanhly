import { describe, expect, it } from "vitest";
import { statusActionSchema } from "../../src/lib/admin/status-transitions";
import { activeItemStatuses, statusActionTargets } from "../../src/lib/admin/item-status";

describe("admin item transitions", () => {
  it("requires positive sale price on approval", () => {
    expect(statusActionSchema.safeParse({ action: "approve", expectedStatus: "RECEIVED", salePrice: 120000 }).success).toBe(true);
    expect(statusActionSchema.safeParse({ action: "approve", expectedStatus: "RECEIVED", salePrice: 0 }).success).toBe(false);
    expect(statusActionSchema.safeParse({ action: "approve", expectedStatus: "APPROVED", salePrice: 120000 }).success).toBe(false);
  });
  it("allows skipped states but disallows injected actor", () => {
    expect(statusActionSchema.safeParse({ action: "negotiate", expectedStatus: "PENDING", reason: "Đang trao đổi giá" }).success).toBe(true);
    expect(statusActionSchema.safeParse({ action: "receive", expectedStatus: "PENDING" }).success).toBe(true);
    expect(statusActionSchema.safeParse({ action: "negotiate", expectedStatus: "PENDING", actorAdminId: "forged" }).success).toBe(false);
  });
  it("allows all 56 different-state transitions and rejects all 8 no-ops", () => {
    for (const expectedStatus of activeItemStatuses) {
      for (const [action, target] of Object.entries(statusActionTargets)) {
        const payload = { action, expectedStatus, ...(action === "approve" ? { salePrice: 120000 } : {}) };
        expect(statusActionSchema.safeParse(payload).success, `${expectedStatus} -> ${target}`).toBe(expectedStatus !== target);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { intakeInputSchema } from "../../src/lib/validation/consignment";

const item = { name: "Áo khoác mô phỏng", category: "ao", description: "Chỉ để thử nghiệm", condition: "Đã dùng", desiredPrice: 100000 };

describe("public consignment input", () => {
  it("accepts a contact and item without admin privileges", () => {
    expect(intakeInputSchema.safeParse({ name: "Người thử", phone: "+84912345678", consent: "true", intakeType: "consign", items: [item] }).success).toBe(true);
  });
  it("accepts only explicit consign or buy intake type", () => {
    expect(intakeInputSchema.safeParse({ name: "Người thử", phone: "0912345678", consent: "true", intakeType: "buy", items: [item] }).success).toBe(true);
    expect(intakeInputSchema.safeParse({ name: "Người thử", phone: "0912345678", consent: "true", intakeType: "other", items: [item] }).success).toBe(false);
    expect(intakeInputSchema.safeParse({ name: "Người thử", phone: "0912345678", consent: "true", items: [item] }).success).toBe(false);
  });
  it("rejects status and sale price injected by anonymous clients", () => {
    for (const extra of [{ status: "APPROVED" }, { salePrice: 1 }, { reviewedById: randomUUID() }]) {
      expect(intakeInputSchema.safeParse({ name: "Người thử", phone: "0912345678", consent: "true", intakeType: "consign", items: [{ ...item, ...extra }] }).success).toBe(false);
    }
  });
  it("requires consent, valid phone and positive price", () => {
    expect(intakeInputSchema.safeParse({ name: "Người thử", phone: "nope", consent: "false", intakeType: "consign", items: [item] }).success).toBe(false);
    expect(intakeInputSchema.safeParse({ name: "Người thử", phone: "0912345678", consent: "true", intakeType: "consign", items: [{ ...item, desiredPrice: 0 }] }).success).toBe(false);
  });
});

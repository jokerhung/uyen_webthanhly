import { describe, expect, it } from "vitest";
import { createCategorySchema, normalizeCategoryName, toggleCategorySchema } from "../../src/lib/admin/category-validation";

describe("category naming and protected payloads", () => {
  it("trims/collapses Unicode whitespace, normalizes NFC, casefolds without stripping accents", () => {
    const value = normalizeCategoryName("  A\u0301o\u00a0  khoác  ");
    expect(value).toEqual({ name: "Áo khoác", normalizedName: "áo khoác" });
    expect(normalizeCategoryName("Áo").normalizedName).not.toBe(normalizeCategoryName("Ao").normalizedName);
  });
  it("rejects empty, oversized and forged slug/kind/actor", () => {
    for (const input of [{ name: "   " }, { name: "x".repeat(101) }, { name: "Túi", slug: "forged" }, { name: "Túi", kind: "brand" }, { name: "Túi", adminId: "forged" }]) expect(createCategorySchema.safeParse(input).success).toBe(false);
  });
  it("requires a state transition with expected current state", () => {
    expect(toggleCategorySchema.safeParse({ active: false, expectedActive: true }).success).toBe(true);
    expect(toggleCategorySchema.safeParse({ active: true, expectedActive: true }).success).toBe(false);
    expect(toggleCategorySchema.safeParse({ active: true, expectedActive: false, slug: "forged" }).success).toBe(false);
  });
});

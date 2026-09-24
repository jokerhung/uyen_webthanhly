import { describe, expect, it } from "vitest";
import { branchGroups, openingHours } from "../../src/content/branches";
import { aboutParagraphs, timeline } from "../../src/content/about";
import { getSiteConfig } from "../../src/content/site";

describe("public about content", () => {
  it("lists three uniquely identified physical locations in two groups", () => {
    const locations = branchGroups.flatMap((group) => group.branches);
    expect(locations).toHaveLength(3);
    expect(new Set(locations.map((branch) => branch.id)).size).toBe(3);
    expect(branchGroups).toHaveLength(2);
    expect(locations.every((branch) => branch.directionsStatus === "unverified")).toBe(true);
  });

  it("keeps the chronology and hours explicit", () => {
    expect(timeline.map(({ year }) => year)).toEqual(["2021", "2022", "2024", "2026"]);
    expect(timeline.filter(({ current }) => current)).toHaveLength(1);
    expect(aboutParagraphs).toHaveLength(3);
    expect(openingHours).toBe("10h–20h30");
  });

  it("uses the configured phone, not the source site's hard-coded branch numbers", () => {
    const before = process.env.SHOP_PHONE;
    try {
      process.env.SHOP_PHONE = " 0123 456 789 ";
      expect(getSiteConfig().shopPhone).toBe("0123 456 789");
      delete process.env.SHOP_PHONE;
      expect(getSiteConfig().shopPhone).toBeNull();
      expect(JSON.stringify(branchGroups)).not.toMatch(/0397 710 510|0923 002 177|0972 865 615/);
    } finally {
      if (before === undefined) delete process.env.SHOP_PHONE;
      else process.env.SHOP_PHONE = before;
    }
  });
});

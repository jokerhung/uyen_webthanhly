import { describe, expect, it } from "vitest";
import { buyAnnouncement, buyCriteria, buyPrices, getBuyProcesses } from "../../src/content/buy";
import { consignCriteria, consignFees, getConsignProcesses } from "../../src/content/consign";
const shop = { shopName: "TEST SHOP", address: "Test Lane", phone: "0986489942" } as Parameters<typeof getBuyProcesses>[0];

describe("public service page content", () => {
  it("does not promise unapproved fees or purchase prices", () => {
    expect(consignFees).toHaveLength(1);
    expect(consignFees[0].description).toContain("Liên hệ");
    expect(consignCriteria.length).toBeGreaterThan(0);
    expect(buyPrices[0].price).toBe("Liên hệ shop");
    expect(buyAnnouncement.length).toBeGreaterThan(0);
    expect(buyCriteria.length).toBeGreaterThan(0);
  });
  it("uses online request forms rather than old hard-coded contact links", () => {
    expect(getConsignProcesses(shop).online.steps[0].text).toContain("form");
    expect(getBuyProcesses(shop).online.steps[0].text).toContain("form");
    expect(getConsignProcesses(shop).direct.steps[0].text).toContain(shop.phone);
    expect(getBuyProcesses(shop).direct.steps[1].text).toContain(shop.address);
  });
});

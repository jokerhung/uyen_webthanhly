import { describe, expect, it } from "vitest";
import { buyAnnouncement, buyCriteria, buyPrices, buyProcesses } from "../../src/content/buy";
import { consignBranches, consignCriteria, consignFees, consignProcesses } from "../../src/content/consign";

describe("public service page content", () => {
  it("contains the four published consignment fee bands in order", () => {
    expect(consignFees.map(fee => fee.range)).toEqual(["Dưới 60k", "Từ 60k – 130k", "Trên 130k", "Không bán được"]);
    expect(consignFees.at(-1)).toMatchObject({ noFee: true, description: "Không mất phí" });
    expect(consignCriteria).toHaveLength(6);
  });
  it("contains 4 direct and 5 online consignment steps", () => {
    expect(consignProcesses.direct.steps).toHaveLength(4);
    expect(consignProcesses.online.steps).toHaveLength(5);
    expect(consignProcesses.online.steps[0].link?.href).toBe("https://zalo.me/hunthanhly");
    expect(consignBranches.flatMap(group => group.branches)).toHaveLength(3);
  });
  it("contains the published purchase announcement, three prices, and criteria", () => {
    expect(buyAnnouncement).toHaveLength(2);
    expect(buyPrices.map(price => price.price)).toEqual(["80k – 100k / kg", "150k – 200k / kg", "Báo giá theo chiếc"]);
    expect(buyCriteria.flatMap(group => group.items)).toHaveLength(3);
  });
  it("contains 3 direct and 4 online purchase steps and warns against shipping valuables", () => {
    expect(buyProcesses.direct.steps).toHaveLength(3);
    expect(buyProcesses.online.steps).toHaveLength(4);
    expect(buyProcesses.online.steps[0].warning).toContain("KHÔNG NHẬN SHIP");
  });
});

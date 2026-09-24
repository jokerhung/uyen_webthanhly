import { describe, expect, it } from "vitest";
import { normalizeVietnamesePhone } from "../../src/lib/validation/settlement";
import { demoSettlementService } from "../../src/lib/services/settlement";
import { DEMO_PHONE } from "../../src/mocks/settlements";

describe("settlement demo", () => {
  it("normalizes only plausible Vietnamese mobile numbers", () => {
    expect(normalizeVietnamesePhone("+84 912 345 678")).toBe("0912345678");
    expect(normalizeVietnamesePhone("0912.345.678")).toBe("0912345678");
    expect(normalizeVietnamesePhone("0123456789")).toBeNull();
    expect(normalizeVietnamesePhone("0912345678x")).toBeNull();
  });
  it("returns only synthetic fixture, no real personal data", async () => {
    expect((await demoSettlementService.lookup(DEMO_PHONE)).kind).toBe("success");
    expect((await demoSettlementService.lookup("0912345678")).kind).toBe("empty");
  });
});

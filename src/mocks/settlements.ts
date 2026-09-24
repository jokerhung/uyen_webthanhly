import type { SettlementReport } from "@/types/settlement";

/** Synthetic, reserved invalid-number fixture: never use a real customer's number. */
export const DEMO_PHONE = "0000000000";
export const DEMO_REPORT: SettlementReport = {
  code: "DEMO-SETTLEMENT-0001",
  receivedAt: "2026-01-01",
  status: "paid",
  grossAmount: 200000,
  fee: 50000,
  netAmount: 150000,
};

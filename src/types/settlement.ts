export type SettlementStatus = "pending" | "paid";
export type SettlementReport = Readonly<{
  code: string;
  receivedAt: string;
  status: SettlementStatus;
  grossAmount: number;
  fee: number;
  netAmount: number;
}>;
export type LookupResult =
  | { kind: "receipts"; reports: { code: string; receivedAt: string; itemCount: number; statuses: { label: string; count: number }[] }[] }
  | { kind: "success"; report: SettlementReport }
  | { kind: "empty" }
  | { kind: "error" }
  | { kind: "rate-limited" }
  | { kind: "verification-required" };

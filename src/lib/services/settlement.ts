import { DEMO_PHONE, DEMO_REPORT } from "../../mocks/settlements";
import type { LookupResult } from "../../types/settlement";
import { normalizeSettlementQuery } from "../validation/settlement";

export interface SettlementService { lookup(query: string, signal?: AbortSignal): Promise<LookupResult> }

/** Browser-only fixture. No network, storage, or customer data involved. */
export const demoSettlementService: SettlementService = {
  async lookup(query, signal) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, 450);
      function onAbort() { clearTimeout(timeout); reject(new DOMException("Cancelled", "AbortError")); }
      if (signal?.aborted) onAbort();
      else signal?.addEventListener("abort", onAbort, { once: true });
    });
    const normalized = normalizeSettlementQuery(query);
    return normalized === DEMO_PHONE || normalized === DEMO_REPORT.code ? { kind: "success", report: DEMO_REPORT } : { kind: "empty" };
  },
};

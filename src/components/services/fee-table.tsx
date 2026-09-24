import type { FeeTier } from "@/types/services";

export function FeeTable({ fees, example }: { readonly fees: readonly FeeTier[]; readonly example: string }) {
  return <><div className="fee-table" role="table" aria-label="Biểu phí ký gửi">
    {fees.map(fee => <div className={`fee-row${fee.noFee ? " fee-row--free" : ""}`} role="row" key={fee.range}>
      <span className="fee-row__range" role="rowheader">{fee.range}</span><span className="fee-row__desc" role="cell">{fee.description}</span>
    </div>)}
  </div><p className="fee-note">{example}</p></>;
}

"use client";

import { useState } from "react";
import { Copy, Phone } from "lucide-react";
import type { ServiceBranchGroup } from "@/types/services";

function CopyBranchPhone({ phone }: { readonly phone: string }) {
  const [feedback, setFeedback] = useState("");
  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(phone.replace(/\s/g, ""));
      setFeedback("Đã sao chép số điện thoại");
    } catch {
      setFeedback("Không thể sao chép. Vui lòng chọn và sao chép số điện thoại thủ công.");
    }
  }
  return <span className="branch-group__phone"><Phone size={16} aria-hidden="true" /> <span>{phone}</span> <button type="button" className="branch-group__copy" onClick={copyPhone} aria-label={`Sao chép ${phone}`} title="Sao chép"><Copy size={14} aria-hidden="true" /></button><span className="branch-group__feedback" role="status">{feedback}</span></span>;
}

export function ConsignBranchGroups({ groups }: { readonly groups: readonly ServiceBranchGroup[] }) {
  return <div className="methods__branches">{groups.map(group => <section className="branch-group" key={group.name}>
    <h3 className="branch-group__name">{group.name}</h3>
    <p className="branch-group__desc">{group.description}</p>
    <div className="branch-group__list">{group.branches.map(branch => <div className="branch-group__item" key={branch.address}>
      <div className="branch-group__address">📍 {branch.address}</div><CopyBranchPhone phone={branch.phone} />
    </div>)}</div>
  </section>)}</div>;
}

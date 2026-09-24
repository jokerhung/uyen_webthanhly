"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ServiceMode, ServiceProcesses } from "@/types/services";
import { ProcessSteps } from "./process-steps";
import { ConsignBranchGroups } from "./consign-branch-groups";
import { consignBranches, consignNotes } from "@/content/consign";

type Props = { readonly kind: "consign" | "buy"; readonly heading: string; readonly processes: ServiceProcesses };
const modes: readonly ServiceMode[] = ["direct", "online"];

export function ServiceModeTabs({ kind, heading, processes }: Props) {
  const [mode, setMode] = useState<ServiceMode>("direct");
  const refs = useRef<Record<ServiceMode, HTMLButtonElement | null>>({ direct: null, online: null });
  const active = processes[mode];
  const prefix = `${kind}-method`;

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, current: ServiceMode) {
    let next: ServiceMode;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = current === "direct" ? "online" : "direct";
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = current === "direct" ? "online" : "direct";
    else if (event.key === "Home") next = "direct";
    else if (event.key === "End") next = "online";
    else return;
    event.preventDefault();
    setMode(next);
    refs.current[next]?.focus();
  }

  return <section className="methods" aria-label={heading}>
    <h2 className="info-block__label methods__heading">{heading}</h2>
    <div className="methods__tabs" role="tablist" aria-label={heading}>
      {modes.map(current => <button
        key={current} ref={element => { refs.current[current] = element; }}
        id={`${prefix}-${current}`} type="button" role="tab"
        aria-selected={mode === current} aria-controls={`${prefix}-panel`}
        tabIndex={mode === current ? 0 : -1}
        className={`methods__tab${mode === current ? " is-active" : ""}`}
        onClick={() => setMode(current)} onKeyDown={event => onTabKeyDown(event, current)}
      >{processes[current].label}</button>)}
    </div>
    <div id={`${prefix}-panel`} className="methods__panel" role="tabpanel" aria-labelledby={`${prefix}-${mode}`} tabIndex={0}>
      {active.note && <p className="methods__note">{active.note}</p>}
      <ProcessSteps steps={active.steps} />
      {kind === "consign" && <>
        {mode === "online" && <p className="methods__submit">Ngoài cách liên hệ qua Zalo như trên, bạn có thể gửi thông tin hàng hóa qua website. <Link href="/consign/submit">Gửi ký gửi online →</Link></p>}
        <p className="online-consign-note"><strong>Lưu ý:</strong><br />{consignNotes.map(note => <span key={note}>— {note}<br /></span>)}</p>
        <ConsignBranchGroups groups={consignBranches} />
      </>}
    </div>
  </section>;
}

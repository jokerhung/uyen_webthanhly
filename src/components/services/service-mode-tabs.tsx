import Link from "next/link";
import type { ServiceProcesses } from "@/types/services";
import { ProcessSteps } from "./process-steps";
import { ConsignBranchGroups } from "./consign-branch-groups";
import { consignNotes } from "@/content/consign";
import type { ServiceBranchGroup } from "@/types/services";

type Props = { readonly kind: "consign" | "buy"; readonly heading: string; readonly processes: ServiceProcesses; readonly branches?: readonly ServiceBranchGroup[] };

export function ServiceModeTabs({ kind, heading, processes, branches }: Props) {
  return <section className="methods" aria-label={heading}>
    <h2 className="info-block__label methods__heading">{heading}</h2>
    <div className="methods__tabs" aria-label={heading}>
      <span className="methods__tab is-active" aria-current="step">{processes.direct.label}</span>
      <Link href={kind === "buy" ? "/buy/submit" : "/consign/submit"} className="methods__tab">{processes.online.label}</Link>
    </div>
    <div className="methods__panel">
      {processes.direct.note && <p className="methods__note">{processes.direct.note}</p>}
      <ProcessSteps steps={processes.direct.steps} />
      {kind === "consign" && <>
        <p className="online-consign-note"><strong>Lưu ý:</strong><br />{consignNotes.map(note => <span key={note}>— {note}<br /></span>)}</p>
        {branches && <ConsignBranchGroups groups={branches} />}
      </>}
    </div>
  </section>;
}

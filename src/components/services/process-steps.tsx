import type { ProcessStep } from "@/types/services";

export function ProcessSteps({ steps }: { readonly steps: readonly ProcessStep[] }) {
  return <ol className="steps">{steps.map((step, index) => <li className="step" key={`${index}-${step.text}`}>
    <span className="step__num" aria-hidden="true">{index + 1}</span>
    <span className="step__text">{step.text}{step.link && <a href={step.link.href} target="_blank" rel="noopener noreferrer">{step.link.label}</a>}{step.detail && <><br />{step.detail}</>}{step.warning && <><br /><br /><strong className="step__warning">{step.warning}</strong></>}</span>
  </li>)}</ol>;
}

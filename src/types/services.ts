export type ServiceMode = "direct" | "online";

export type ProcessStep = {
  readonly text: string;
  readonly detail?: string;
  readonly link?: { readonly label: string; readonly href: string };
  readonly warning?: string;
};

export type ServiceProcess = {
  readonly label: string;
  readonly note?: string;
  readonly steps: readonly ProcessStep[];
};

export type ServiceProcesses = Readonly<Record<ServiceMode, ServiceProcess>>;

export type FeeTier = { readonly range: string; readonly description: string; readonly noFee?: boolean };
export type BuyPrice = { readonly name: string; readonly price: string };
export type CriteriaGroup = { readonly title: string; readonly items: readonly string[] };
export type ServiceBranch = { readonly address: string; readonly phone: string };
export type ServiceBranchGroup = {
  readonly name: string;
  readonly description: string;
  readonly branches: readonly ServiceBranch[];
};

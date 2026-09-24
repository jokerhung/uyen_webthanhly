export type Branch = Readonly<{
  id: string;
  address: string;
  /** The source site links these to TikTok; destinations have not been approved. */
  directionsStatus: "unverified";
}>;

export type BranchGroup = Readonly<{
  name: string;
  description: string;
  branches: readonly Branch[];
}>;

export type TimelineEntry = Readonly<{
  year: string;
  label: string;
  current?: boolean;
}>;

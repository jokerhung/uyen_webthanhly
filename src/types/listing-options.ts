export type ListingOptionChoice = { id: string; label: string };
export type ListingOptions = { genderId: ListingOptionChoice[]; seasonId: ListingOptionChoice[]; category: ListingOptionChoice[]; materialId: ListingOptionChoice[]; sizeId: ListingOptionChoice[]; brandId: ListingOptionChoice[]; priceOptionId: ListingOptionChoice[] };
export type ListingSelection = Record<keyof ListingOptions, string>;

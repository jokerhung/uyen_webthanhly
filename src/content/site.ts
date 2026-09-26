/* Only confirmed values belong here; business policy and hotline await approval. */
export type SiteConfig = { readonly minimumConsignmentItems: number | null; readonly maxImagesPerItem: number | null; readonly maxImageBytes: number | null; readonly maxConsignmentItems: number | null; readonly privacyPolicyReviewed: boolean };
function optionalPositiveInt(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
export function getSiteConfig(): SiteConfig {
  return {
    minimumConsignmentItems: optionalPositiveInt(process.env.MIN_CONSIGNMENT_ITEMS),
    maxImagesPerItem: optionalPositiveInt(process.env.MAX_IMAGES_PER_ITEM),
    maxImageBytes: optionalPositiveInt(process.env.MAX_IMAGE_BYTES),
    maxConsignmentItems: optionalPositiveInt(process.env.MAX_CONSIGNMENT_ITEMS),
    privacyPolicyReviewed: process.env.PRIVACY_POLICY_REVIEWED === "true",
  };
}

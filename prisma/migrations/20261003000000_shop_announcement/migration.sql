-- Initialize from the CURRENT ticker for each shop, without replacing customized shop fields.
ALTER TABLE "shop_settings"
  ADD COLUMN "announcement_text" VARCHAR(500),
  ADD COLUMN "announcement_enabled" BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE "shop_settings"
SET "announcement_text" = left("shop_name" || ' ✦ ' || "address" || ' ✦ ' || "phone", 500);
ALTER TABLE "shop_settings" ALTER COLUMN "announcement_text" SET NOT NULL;
ALTER TABLE "shop_settings" ADD CONSTRAINT "shop_settings_announcement_check"
  CHECK ("announcement_enabled" = FALSE OR length(btrim("announcement_text")) > 0);

-- Preserve existing shop edits while backfilling the current public slogan.
ALTER TABLE "shop_settings" ADD COLUMN "slogan" VARCHAR(200) NOT NULL DEFAULT 'From one bestie to another ♡';
ALTER TABLE "shop_settings" ADD CONSTRAINT "shop_settings_slogan_check" CHECK (length(btrim("slogan")) BETWEEN 1 AND 200);

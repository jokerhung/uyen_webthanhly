-- Shared category vocabulary for item intake. The old items.category text now stores
-- the stable category slug, backed by a FK so arbitrary categories cannot be posted.
CREATE TABLE "item_categories" (
  "slug" VARCHAR(100) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "item_categories_pkey" PRIMARY KEY ("slug")
);
CREATE UNIQUE INDEX "item_categories_name_key" ON "item_categories"("name");
CREATE INDEX "item_categories_active_sort_order_idx" ON "item_categories"("active", "sort_order");

-- Starter taxonomy for the form; these are editable catalog records, not hard-coded
-- client choices. Preserve historic categories in a disabled legacy group below.
INSERT INTO "item_categories" ("slug", "name", "sort_order") VALUES
  ('ao', 'Áo', 10),
  ('quan', 'Quần', 20),
  ('vay-dam', 'Váy / Đầm', 30),
  ('ao-khoac', 'Áo khoác', 40),
  ('giay-dep', 'Giày / Dép', 50),
  ('tui-vi', 'Túi / Ví', 60),
  ('phu-kien', 'Phụ kiện', 70),
  ('khac', 'Khác', 80);

-- Some existing deployments may have free-text categories. Keep those items intact
-- by creating inactive legacy choices instead of silently changing their meaning.
INSERT INTO "item_categories" ("slug", "name", "sort_order", "active")
SELECT 'legacy-' || md5("category"), "category", 999, false
FROM (SELECT DISTINCT "category" FROM "items" WHERE "category" NOT IN (SELECT "name" FROM "item_categories")) AS legacy
ON CONFLICT ("name") DO NOTHING;

UPDATE "items" SET "category" = categories."slug"
FROM "item_categories" AS categories
WHERE "items"."category" = categories."name";

CREATE INDEX "items_category_idx" ON "items"("category");
ALTER TABLE "items" ADD CONSTRAINT "items_category_fkey"
  FOREIGN KEY ("category") REFERENCES "item_categories"("slug") ON DELETE RESTRICT ON UPDATE RESTRICT;

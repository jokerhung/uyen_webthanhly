-- Singleton shop configuration. Historical admin configuration events never contain passwords/secrets.
CREATE TABLE "shop_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "shop_name" VARCHAR(120) NOT NULL,
  "primary_color" VARCHAR(7) NOT NULL,
  "background_color" VARCHAR(7) NOT NULL,
  "surface_color" VARCHAR(7) NOT NULL,
  "address" VARCHAR(500) NOT NULL,
  "facebook_url" VARCHAR(2048) NOT NULL,
  "phone" VARCHAR(15) NOT NULL,
  "opens_at" VARCHAR(5) NOT NULL,
  "closes_at" VARCHAR(5) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_id" UUID,
  CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shop_settings_singleton_check" CHECK ("id" = 1),
  CONSTRAINT "shop_settings_version_check" CHECK ("version" > 0),
  CONSTRAINT "shop_settings_colors_check" CHECK ("primary_color" ~ '^#[0-9A-Fa-f]{6}$' AND "background_color" ~ '^#[0-9A-Fa-f]{6}$' AND "surface_color" ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT "shop_settings_hours_check" CHECK ("opens_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "closes_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "opens_at" <> "closes_at")
);
ALTER TABLE "shop_settings" ADD CONSTRAINT "shop_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "admin_config_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "admin_id" UUID NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" VARCHAR(100) NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_config_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_config_events_entity_type_entity_id_created_at_idx" ON "admin_config_events"("entity_type", "entity_id", "created_at" DESC);
CREATE INDEX "admin_config_events_admin_id_idx" ON "admin_config_events"("admin_id");
ALTER TABLE "admin_config_events" ADD CONSTRAINT "admin_config_events_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Only first deploy inserts initial Besties Club values; subsequent deploys never overwrite edits.
INSERT INTO "shop_settings" ("id", "shop_name", "primary_color", "background_color", "surface_color", "address", "facebook_url", "phone", "opens_at", "closes_at", "version")
VALUES (1, 'Besties Club', '#764D32', '#FFF9F1', '#FFFFFF', '12 Phan Văn Trị, Ô Chợ Dừa, Hà Nội', 'https://www.facebook.com/people/Besties-Club-Thanh-l%C3%BD-k%C3%BD-g%E1%BB%ADi/61594613092950/', '0986489942', '09:00', '22:00', 1)
ON CONFLICT ("id") DO NOTHING;
-- Rollback plan: back up both tables before removing them; dropping them discards the audit history.

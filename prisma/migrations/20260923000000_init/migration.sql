-- Initial PostgreSQL schema; all identifiers follow Prisma's mapped table/column names.
CREATE TYPE "item_status" AS ENUM ('pending', 'approved', 'rejected', 'sold', 'hidden');
CREATE TYPE "admin_role" AS ENUM ('admin', 'super_admin');

CREATE TABLE "consignors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "phone_normalized" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consignors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_code" VARCHAR(64) NOT NULL,
    "consignor_id" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "consignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT,
    "provider_subject" VARCHAR(255),
    "role" "admin_role" NOT NULL DEFAULT 'admin',
    "active" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_users_auth_check" CHECK ("password_hash" IS NOT NULL OR "provider_subject" IS NOT NULL)
);

CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "consignment_id" UUID NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "condition" VARCHAR(200) NOT NULL,
    "desired_price" DECIMAL(14,0),
    "sale_price" DECIMAL(14,0),
    "status" "item_status" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "items_desired_price_check" CHECK ("desired_price" IS NULL OR "desired_price" >= 0),
    CONSTRAINT "items_approved_price_check" CHECK ("status" <> 'approved' OR ("sale_price" IS NOT NULL AND "sale_price" > 0)),
    CONSTRAINT "items_sale_price_check" CHECK ("sale_price" IS NULL OR "sale_price" > 0)
);

CREATE TABLE "item_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "alt_text" VARCHAR(250) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "item_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "item_images_sort_order_check" CHECK ("sort_order" >= 0)
);

CREATE TABLE "item_status_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "from_status" "item_status" NOT NULL,
    "to_status" "item_status" NOT NULL,
    "actor_admin_id" UUID NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "item_status_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consignors_phone_normalized_idx" ON "consignors"("phone_normalized");
CREATE UNIQUE INDEX "consignments_public_code_key" ON "consignments"("public_code");
CREATE INDEX "consignments_consignor_id_idx" ON "consignments"("consignor_id");
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX "admin_users_provider_subject_key" ON "admin_users"("provider_subject");
CREATE UNIQUE INDEX "items_slug_key" ON "items"("slug");
CREATE INDEX "items_consignment_id_idx" ON "items"("consignment_id");
CREATE INDEX "items_status_published_at_idx" ON "items"("status", "published_at" DESC);
CREATE INDEX "items_reviewed_by_idx" ON "items"("reviewed_by");
CREATE UNIQUE INDEX "item_images_storage_key_key" ON "item_images"("storage_key");
CREATE UNIQUE INDEX "item_images_item_id_sort_order_key" ON "item_images"("item_id", "sort_order");
CREATE INDEX "item_status_events_item_id_created_at_idx" ON "item_status_events"("item_id", "created_at" DESC);
CREATE INDEX "item_status_events_actor_admin_id_idx" ON "item_status_events"("actor_admin_id");

ALTER TABLE "consignments" ADD CONSTRAINT "consignments_consignor_id_fkey" FOREIGN KEY ("consignor_id") REFERENCES "consignors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_consignment_id_fkey" FOREIGN KEY ("consignment_id") REFERENCES "consignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "item_images" ADD CONSTRAINT "item_images_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_status_events" ADD CONSTRAINT "item_status_events_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "item_status_events" ADD CONSTRAINT "item_status_events_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

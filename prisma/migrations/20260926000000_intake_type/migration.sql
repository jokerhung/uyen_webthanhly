-- Existing receipts were created by the consignment-only flow, so default them to consign.
CREATE TYPE "intake_type" AS ENUM ('consign', 'buy');
ALTER TABLE "consignments" ADD COLUMN "intake_type" "intake_type" NOT NULL DEFAULT 'consign';
CREATE INDEX "consignments_intake_type_created_at_idx" ON "consignments"("intake_type", "created_at" DESC);

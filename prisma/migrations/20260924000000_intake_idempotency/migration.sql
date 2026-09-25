CREATE TABLE "intake_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(128) NOT NULL,
  "payload_hash" VARCHAR(64) NOT NULL,
  "consignment_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intake_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "intake_requests_key_key" ON "intake_requests"("key");
CREATE INDEX "intake_requests_created_at_idx" ON "intake_requests"("created_at");
ALTER TABLE "intake_requests" ADD CONSTRAINT "intake_requests_consignment_id_fkey" FOREIGN KEY ("consignment_id") REFERENCES "consignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

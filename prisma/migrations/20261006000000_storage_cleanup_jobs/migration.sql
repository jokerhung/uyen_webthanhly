CREATE TABLE "storage_cleanup_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storage_key" VARCHAR(512) NOT NULL,
    "driver" VARCHAR(10) NOT NULL,
    "status" VARCHAR(12) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "storage_cleanup_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "storage_cleanup_jobs_driver_check" CHECK ("driver" IN ('local', 'minio')),
    CONSTRAINT "storage_cleanup_jobs_status_check" CHECK ("status" IN ('pending', 'processing', 'done', 'protected')),
    CONSTRAINT "storage_cleanup_jobs_key_check" CHECK ("storage_key" ~ '^[a-f0-9]{64}\.(jpg|png|webp)$'),
    CONSTRAINT "storage_cleanup_jobs_attempts_check" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX "storage_cleanup_jobs_storage_key_key" ON "storage_cleanup_jobs"("storage_key");
CREATE INDEX "storage_cleanup_jobs_status_next_attempt_at_idx" ON "storage_cleanup_jobs"("status", "next_attempt_at");

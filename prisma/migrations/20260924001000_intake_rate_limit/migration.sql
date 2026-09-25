CREATE TABLE "intake_rate_limits" (
  "client_hash" VARCHAR(64) NOT NULL,
  "window_start" TIMESTAMPTZ(6) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "intake_rate_limits_pkey" PRIMARY KEY ("client_hash", "window_start"),
  CONSTRAINT "intake_rate_limits_attempts_check" CHECK ("attempts" > 0)
);
CREATE INDEX "intake_rate_limits_window_start_idx" ON "intake_rate_limits"("window_start");

ALTER TABLE "notifications"
ADD COLUMN "cleared_at" TIMESTAMP(3);

DROP INDEX IF EXISTS "notifications_user_id_created_at_idx";
DROP INDEX IF EXISTS "notifications_user_id_read_created_at_idx";

CREATE INDEX "notifications_user_id_cleared_at_created_at_idx"
ON "notifications"("user_id", "cleared_at", "created_at" DESC);

CREATE INDEX "notifications_user_id_read_cleared_at_created_at_idx"
ON "notifications"("user_id", "read", "cleared_at", "created_at" DESC);

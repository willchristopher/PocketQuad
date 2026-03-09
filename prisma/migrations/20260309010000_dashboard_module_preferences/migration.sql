-- AlterTable
ALTER TABLE "notification_preferences"
ADD COLUMN "dashboard_modules" TEXT[] NOT NULL DEFAULT ARRAY['favorites', 'deadlines', 'events', 'faculty', 'news', 'services', 'links', 'clubs']::TEXT[];

-- Backfill
UPDATE "notification_preferences"
SET "dashboard_modules" = ARRAY['favorites', 'deadlines', 'events', 'faculty', 'news', 'services', 'links', 'clubs']::TEXT[]
WHERE "dashboard_modules" IS NULL OR cardinality("dashboard_modules") = 0;

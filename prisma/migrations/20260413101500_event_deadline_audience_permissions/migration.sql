ALTER TYPE "PortalPermission" ADD VALUE IF NOT EXISTS 'CAN_CREATE_DEADLINE_EVENTS';

CREATE TYPE "EventAudience" AS ENUM ('ORGANIZATION', 'ALL_CAMPUS', 'DEADLINE');

ALTER TABLE "events"
ADD COLUMN "audience" "EventAudience" NOT NULL DEFAULT 'ALL_CAMPUS';

CREATE INDEX "events_university_id_audience_is_published_is_cancelled_date_idx"
ON "events"("university_id", "audience", "is_published", "is_cancelled", "date");

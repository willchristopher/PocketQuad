ALTER TABLE "notification_preferences"
ADD COLUMN "resource_link_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "announcements"
ADD COLUMN "expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "campus_buildings"
ADD COLUMN "accessibility_notes" TEXT;

-- AlterTable
ALTER TABLE "events"
ADD COLUMN "building_id" TEXT;

-- CreateIndex
CREATE INDEX "announcements_expires_at_idx" ON "announcements"("expires_at");

-- CreateIndex
CREATE INDEX "events_building_id_date_idx" ON "events"("building_id", "date");

-- AddForeignKey
ALTER TABLE "events"
ADD CONSTRAINT "events_building_id_fkey"
FOREIGN KEY ("building_id") REFERENCES "campus_buildings"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

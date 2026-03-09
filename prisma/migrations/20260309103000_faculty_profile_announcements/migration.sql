-- Create enums for explicit faculty availability and announcement targeting.
CREATE TYPE "FacultyAvailabilityStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'AWAY');

CREATE TYPE "AnnouncementAudienceScope" AS ENUM ('CAMPUS', 'BUILDING', 'SERVICE');

-- Add faculty availability fields so away state is separate from office-hour text.
ALTER TABLE "faculty"
ADD COLUMN "availability_status" "FacultyAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN "availability_note" TEXT;

-- Add announcement ownership and targeting so faculty can publish scoped updates.
ALTER TABLE "announcements"
ADD COLUMN "university_id" TEXT,
ADD COLUMN "created_by_id" TEXT,
ADD COLUMN "scope" "AnnouncementAudienceScope" NOT NULL DEFAULT 'CAMPUS',
ADD COLUMN "building_id" TEXT,
ADD COLUMN "service_id" TEXT;

CREATE INDEX "announcements_university_id_is_active_created_at_idx"
ON "announcements"("university_id", "is_active", "created_at" DESC);

CREATE INDEX "announcements_scope_is_active_created_at_idx"
ON "announcements"("scope", "is_active", "created_at" DESC);

ALTER TABLE "announcements"
ADD CONSTRAINT "announcements_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "announcements"
ADD CONSTRAINT "announcements_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "announcements"
ADD CONSTRAINT "announcements_building_id_fkey"
FOREIGN KEY ("building_id") REFERENCES "campus_buildings"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "announcements"
ADD CONSTRAINT "announcements_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "campus_services"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

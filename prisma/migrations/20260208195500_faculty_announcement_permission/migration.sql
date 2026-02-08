-- AlterTable
ALTER TABLE "users"
ADD COLUMN "can_publish_campus_announcements" BOOLEAN NOT NULL DEFAULT false;

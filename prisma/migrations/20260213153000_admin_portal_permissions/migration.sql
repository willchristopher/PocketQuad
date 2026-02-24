-- CreateEnum
CREATE TYPE "AdminAccessLevel" AS ENUM ('OWNER', 'IT_ADMIN', 'CLUB_PRESIDENT', 'CONTENT_MANAGER');

-- CreateEnum
CREATE TYPE "PortalPermission" AS ENUM (
  'ADMIN_PORTAL_ACCESS',
  'ADMIN_TAB_OVERVIEW',
  'ADMIN_TAB_UNIVERSITIES',
  'ADMIN_TAB_FACULTY',
  'ADMIN_TAB_BUILDINGS',
  'ADMIN_TAB_BUILDING_IMPORT',
  'ADMIN_TAB_LINKS',
  'ADMIN_TAB_SERVICES',
  'ADMIN_TAB_CLUBS',
  'ADMIN_TAB_EVENTS',
  'ADMIN_TAB_IT_ACCOUNTS',
  'CAN_PUBLISH_ANNOUNCEMENTS',
  'CAN_MANAGE_CLUB_PROFILE',
  'CAN_MANAGE_CLUB_CONTACT'
);

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "admin_access_level" "AdminAccessLevel",
ADD COLUMN "portal_permissions" "PortalPermission"[] NOT NULL DEFAULT ARRAY[]::"PortalPermission"[];

-- CreateTable
CREATE TABLE "club_manager_assignments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "club_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "club_manager_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_manager_assignments_user_id_club_id_key"
ON "club_manager_assignments"("user_id", "club_id");

-- CreateIndex
CREATE INDEX "club_manager_assignments_club_id_idx" ON "club_manager_assignments"("club_id");

-- CreateIndex
CREATE INDEX "club_manager_assignments_user_id_idx" ON "club_manager_assignments"("user_id");

-- CreateIndex
CREATE INDEX "users_admin_access_level_idx" ON "users"("admin_access_level");

-- CreateIndex
CREATE INDEX "users_portal_permissions_gin_idx" ON "users" USING GIN ("portal_permissions");

-- AddForeignKey
ALTER TABLE "club_manager_assignments"
ADD CONSTRAINT "club_manager_assignments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_manager_assignments"
ADD CONSTRAINT "club_manager_assignments_club_id_fkey"
FOREIGN KEY ("club_id") REFERENCES "club_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing admins as owners with full portal permissions.
UPDATE "users"
SET
  "admin_access_level" = 'OWNER',
  "portal_permissions" = ARRAY[
    'ADMIN_PORTAL_ACCESS',
    'ADMIN_TAB_OVERVIEW',
    'ADMIN_TAB_UNIVERSITIES',
    'ADMIN_TAB_FACULTY',
    'ADMIN_TAB_BUILDINGS',
    'ADMIN_TAB_BUILDING_IMPORT',
    'ADMIN_TAB_LINKS',
    'ADMIN_TAB_SERVICES',
    'ADMIN_TAB_CLUBS',
    'ADMIN_TAB_EVENTS',
    'ADMIN_TAB_IT_ACCOUNTS',
    'CAN_PUBLISH_ANNOUNCEMENTS',
    'CAN_MANAGE_CLUB_PROFILE',
    'CAN_MANAGE_CLUB_CONTACT'
  ]::"PortalPermission"[]
WHERE "role" = 'ADMIN';

-- Preserve legacy faculty announcement grants in new permission model.
UPDATE "users"
SET "portal_permissions" = array_append("portal_permissions", 'CAN_PUBLISH_ANNOUNCEMENTS'::"PortalPermission")
WHERE
  "can_publish_campus_announcements" = true
  AND NOT ('CAN_PUBLISH_ANNOUNCEMENTS'::"PortalPermission" = ANY("portal_permissions"));

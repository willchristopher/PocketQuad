-- DropIndex
DROP INDEX "users_admin_access_level_idx";

-- DropIndex
DROP INDEX "users_portal_permissions_gin_idx";

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "building_alerts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "building_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "club_interest_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboarding_complete" BOOLEAN NOT NULL DEFAULT false;

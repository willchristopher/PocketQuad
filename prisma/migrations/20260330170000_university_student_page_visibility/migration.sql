ALTER TYPE "PortalPermission" ADD VALUE 'ADMIN_TAB_STUDENT_PAGES';

ALTER TABLE "universities"
ADD COLUMN "disabled_student_pages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

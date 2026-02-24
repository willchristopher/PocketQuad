-- AlterTable
ALTER TABLE "users"
ADD COLUMN "manages_all_clubs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "faculty_role_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "campus_buildings"
ADD COLUMN "purpose" TEXT,
ADD COLUMN "operating_hours" TEXT,
ADD COLUMN "operational_status" "CampusServiceStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "operational_note" TEXT,
ADD COLUMN "operational_updated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "building_manager_assignments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "building_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "building_manager_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "building_manager_assignments_user_id_building_id_key"
ON "building_manager_assignments"("user_id", "building_id");

-- CreateIndex
CREATE INDEX "building_manager_assignments_building_id_idx"
ON "building_manager_assignments"("building_id");

-- CreateIndex
CREATE INDEX "building_manager_assignments_user_id_idx"
ON "building_manager_assignments"("user_id");

-- CreateIndex
CREATE INDEX "campus_buildings_university_id_operational_status_idx"
ON "campus_buildings"("university_id", "operational_status");

-- AddForeignKey
ALTER TABLE "building_manager_assignments"
ADD CONSTRAINT "building_manager_assignments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_manager_assignments"
ADD CONSTRAINT "building_manager_assignments_building_id_fkey"
FOREIGN KEY ("building_id") REFERENCES "campus_buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

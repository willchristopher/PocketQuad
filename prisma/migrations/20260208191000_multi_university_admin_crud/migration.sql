-- CreateEnum
CREATE TYPE "CampusServiceStatus" AS ENUM ('OPEN', 'CLOSED', 'LIMITED');

-- CreateEnum
CREATE TYPE "ResourceLinkCategory" AS ENUM ('LEARNING', 'COMMUNICATION', 'STUDENT_SERVICES', 'FINANCE', 'CAMPUS_LIFE', 'OTHER');

-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_buildings" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "map_query" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_resource_links" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "ResourceLinkCategory" NOT NULL,
    "href" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_resource_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_services" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampusServiceStatus" NOT NULL,
    "hours" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "directions_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_organizations" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contact_email" TEXT,
    "website_url" TEXT,
    "meeting_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_organizations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "university_id" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN "university_id" TEXT;

-- AlterTable
ALTER TABLE "faculty" ADD COLUMN "university_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "universities_name_key" ON "universities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "universities_slug_key" ON "universities"("slug");

-- CreateIndex
CREATE INDEX "users_university_id_idx" ON "users"("university_id");

-- CreateIndex
CREATE INDEX "events_university_id_date_idx" ON "events"("university_id", "date");

-- CreateIndex
CREATE INDEX "faculty_university_id_department_idx" ON "faculty"("university_id", "department");

-- CreateIndex
CREATE INDEX "campus_buildings_university_id_name_idx" ON "campus_buildings"("university_id", "name");

-- CreateIndex
CREATE INDEX "campus_resource_links_university_id_category_idx" ON "campus_resource_links"("university_id", "category");

-- CreateIndex
CREATE INDEX "campus_services_university_id_name_idx" ON "campus_services"("university_id", "name");

-- CreateIndex
CREATE INDEX "club_organizations_university_id_name_idx" ON "club_organizations"("university_id", "name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_buildings" ADD CONSTRAINT "campus_buildings_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_resource_links" ADD CONSTRAINT "campus_resource_links_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_services" ADD CONSTRAINT "campus_services_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_organizations" ADD CONSTRAINT "club_organizations_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

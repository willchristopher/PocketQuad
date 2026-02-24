-- AlterTable
ALTER TABLE "campus_buildings"
ADD COLUMN "description" TEXT,
ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "departments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

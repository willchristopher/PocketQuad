ALTER TABLE "events"
ADD COLUMN "external_source" TEXT,
ADD COLUMN "external_id" TEXT,
ADD COLUMN "external_url" TEXT,
ADD COLUMN "import_hash" TEXT,
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "calendar_events"
ADD COLUMN "campus_event_id" TEXT;

CREATE TABLE "event_calendar_exports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_calendar_exports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_feed_syncs" (
    "key" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "last_attempted_at" TIMESTAMP(3),
    "last_succeeded_at" TIMESTAMP(3),
    "last_error" TEXT,
    "last_checksum" TEXT,

    CONSTRAINT "event_feed_syncs_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "events_external_source_external_id_key"
ON "events"("external_source", "external_id");

CREATE INDEX "events_external_source_external_id_idx"
ON "events"("external_source", "external_id");

CREATE INDEX "calendar_events_user_id_campus_event_id_idx"
ON "calendar_events"("user_id", "campus_event_id");

CREATE UNIQUE INDEX "event_calendar_exports_user_id_event_id_provider_key"
ON "event_calendar_exports"("user_id", "event_id", "provider");

CREATE INDEX "event_calendar_exports_event_id_provider_idx"
ON "event_calendar_exports"("event_id", "provider");

ALTER TABLE "calendar_events"
ADD CONSTRAINT "calendar_events_campus_event_id_fkey"
FOREIGN KEY ("campus_event_id") REFERENCES "events"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "event_calendar_exports"
ADD CONSTRAINT "event_calendar_exports_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_calendar_exports"
ADD CONSTRAINT "event_calendar_exports_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

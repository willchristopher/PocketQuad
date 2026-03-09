-- CreateTable
CREATE TABLE "chat_message_reports" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_message_reports_message_id_created_at_idx" ON "chat_message_reports"("message_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chat_message_reports_reporter_id_created_at_idx" ON "chat_message_reports"("reporter_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_reports_message_id_reporter_id_key" ON "chat_message_reports"("message_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "chat_message_reports" ADD CONSTRAINT "chat_message_reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_reports" ADD CONSTRAINT "chat_message_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

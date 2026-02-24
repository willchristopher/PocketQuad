-- CreateIndex
CREATE INDEX "notifications_user_id_read_created_at_idx" ON "notifications"("user_id", "read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "channel_members_user_id_joined_at_idx" ON "channel_members"("user_id", "joined_at" DESC);

-- CreateIndex
CREATE INDEX "events_university_id_is_published_is_cancelled_date_idx" ON "events"("university_id", "is_published", "is_cancelled", "date");

-- CreateIndex
CREATE INDEX "office_hour_queue_office_hour_id_status_position_idx" ON "office_hour_queue"("office_hour_id", "status", "position");

-- CreateIndex
CREATE INDEX "office_hour_queue_office_hour_id_student_id_status_idx" ON "office_hour_queue"("office_hour_id", "student_id", "status");

-- CreateIndex
CREATE INDEX "deadlines_user_id_completed_due_date_idx" ON "deadlines"("user_id", "completed", "due_date");

-- CreateIndex
CREATE INDEX "announcements_is_active_created_at_idx" ON "announcements"("is_active", "created_at" DESC);

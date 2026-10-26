-- CreateTable
CREATE TABLE "event_reminders" (
    "event_id" UUID NOT NULL,
    "minutes" INTEGER NOT NULL,

    CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("event_id","minutes"),
    CONSTRAINT "event_reminders_minutes_check" CHECK ("minutes" >= 0 AND "minutes" <= 525600)
);

-- CreateTable
CREATE TABLE "reminder_seen" (
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "minutes" INTEGER NOT NULL,
    "occ_start" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reminder_seen_pkey" PRIMARY KEY ("user_id","event_id","minutes","occ_start")
);

-- AddForeignKey
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_seen" ADD CONSTRAINT "reminder_seen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

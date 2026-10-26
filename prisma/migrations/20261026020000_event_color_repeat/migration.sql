ALTER TABLE "events" ADD COLUMN "color" TEXT;
ALTER TABLE "events" ADD COLUMN "repeat" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "events" ADD CONSTRAINT "events_repeat_check" CHECK ("repeat" IN ('none', 'daily', 'weekly', 'monthly', 'yearly'));
ALTER TABLE "events" ADD CONSTRAINT "events_color_check" CHECK ("color" IS NULL OR "color" ~ '^#[0-9a-fA-F]{6}$');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill existing accounts from the email local part, de-duplicated.
WITH base AS (
  SELECT "id",
         COALESCE(NULLIF(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9_.-]', '', 'g'), ''), 'user') AS u
    FROM "users"
), numbered AS (
  SELECT "id", u, row_number() OVER (PARTITION BY u ORDER BY "id") AS n FROM base
)
UPDATE "users" SET "username" = CASE WHEN numbered.n = 1 THEN numbered.u ELSE numbered.u || numbered.n END
  FROM numbered WHERE "users"."id" = numbered."id";

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

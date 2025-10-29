-- DropIndex
DROP INDEX "public"."User_email_key";

-- Create partial unique indexes that only apply when deleted = false
CREATE UNIQUE INDEX "User_email_active_key" ON "User"("email") WHERE "deleted" = false;

-- Add the credential column without resetting or dropping existing data.
-- Existing users receive an unusable empty value until the seed or an admin migration supplies a hash.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;

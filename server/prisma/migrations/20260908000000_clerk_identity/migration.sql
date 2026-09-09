-- Add a fresh identity mapping: legacy identifiers are not Clerk accounts.
-- Preserve every User.userId and all existing foreign keys.
ALTER TABLE "User" ADD COLUMN "clerkUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");
-- Preserve legacy values without requiring or exposing them in application code.
ALTER TABLE "User" RENAME COLUMN "cognitoId" TO "legacyAuthId";
ALTER TABLE "User" ALTER COLUMN "legacyAuthId" DROP NOT NULL;
ALTER INDEX "User_cognitoId_key" RENAME TO "User_legacyAuthId_key";

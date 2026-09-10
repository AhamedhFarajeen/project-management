-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PROJECT_MANAGER', 'MEMBER');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "projectManagerUserId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "ProjectMember" (
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("userId","projectId")
);

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_projectManagerUserId_fkey" FOREIGN KEY ("projectManagerUserId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

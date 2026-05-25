-- CreateEnum
CREATE TYPE "SpecialPrivilege" AS ENUM ('DEAN', 'DIRECTOR', 'UNIVERSITY_PRESIDENT', 'VICE_PRESIDENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('ACADEMIC', 'REGULAR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClearanceStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "ClearanceStatus" ADD VALUE 'BODY_APPROVAL_PENDING';
ALTER TYPE "ClearanceStatus" ADD VALUE 'BODY_APPROVED';
ALTER TYPE "ClearanceStatus" ADD VALUE 'HR_APPROVAL_PENDING';
ALTER TYPE "ClearanceStatus" ADD VALUE 'HR_APPROVED';
ALTER TYPE "ClearanceStatus" ADD VALUE 'FINAL_APPROVED';
ALTER TYPE "ClearanceStatus" ADD VALUE 'COMPLETED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CLEARANCE_BODY';

-- AlterTable
ALTER TABLE "Campus" ADD COLUMN     "isClearanceSequential" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ClearanceRequest" ADD COLUMN     "finalApprovedAt" TIMESTAMP(3),
ADD COLUMN     "finalApprovedById" INTEGER,
ADD COLUMN     "initiatedById" INTEGER,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "ClearanceUnit" ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "priorityOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'MALE',
ADD COLUMN     "staffType" "StaffType" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clearanceUnitId" INTEGER,
ADD COLUMN     "isHeadHR" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialPrivileges" "SpecialPrivilege"[] DEFAULT ARRAY[]::"SpecialPrivilege"[];

-- CreateTable
CREATE TABLE "ClearanceApproval" (
    "id" SERIAL NOT NULL,
    "clearanceId" INTEGER NOT NULL,
    "campusId" INTEGER NOT NULL,
    "approvedById" INTEGER NOT NULL,
    "status" "ClearanceStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClearanceApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClearanceApproval_clearanceId_idx" ON "ClearanceApproval"("clearanceId");

-- CreateIndex
CREATE INDEX "ClearanceApproval_campusId_idx" ON "ClearanceApproval"("campusId");

-- CreateIndex
CREATE UNIQUE INDEX "ClearanceApproval_clearanceId_campusId_key" ON "ClearanceApproval"("clearanceId", "campusId");

-- CreateIndex
CREATE INDEX "User_clearanceUnitId_idx" ON "User"("clearanceUnitId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clearanceUnitId_fkey" FOREIGN KEY ("clearanceUnitId") REFERENCES "ClearanceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceApproval" ADD CONSTRAINT "ClearanceApproval_clearanceId_fkey" FOREIGN KEY ("clearanceId") REFERENCES "ClearanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceApproval" ADD CONSTRAINT "ClearanceApproval_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceApproval" ADD CONSTRAINT "ClearanceApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CAMPUS_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPUS_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'CAMPUS_SUSPENDED';
ALTER TYPE "AuditAction" ADD VALUE 'DEPARTMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'DEPARTMENT_HEAD_CHANGED';

-- AlterTable
ALTER TABLE "ClearanceUnit" ADD COLUMN     "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "departmentId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "campusId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "headEmployeeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_headEmployeeId_key" ON "Department"("headEmployeeId");

-- CreateIndex
CREATE INDEX "Department_campusId_idx" ON "Department"("campusId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_campusId_name_key" ON "Department"("campusId", "name");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_headEmployeeId_fkey" FOREIGN KEY ("headEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

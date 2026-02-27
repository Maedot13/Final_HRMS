-- Multi-Campus Phase 1: Add Campus entity and nullable campusId to all tenant-scoped tables.
-- Run seed after this to create default campus and backfill; then run phase1_constraints migration.

-- CreateEnum
CREATE TYPE "UserScope" AS ENUM ('CAMPUS', 'UNIVERSITY');

-- CreateTable
CREATE TABLE "Campus" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT DEFAULT 'Africa/Addis_Ababa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campus_code_key" ON "Campus"("code");

-- AlterTable User: add scope and campusId
ALTER TABLE "User" ADD COLUMN "scope" "UserScope" NOT NULL DEFAULT 'CAMPUS';
ALTER TABLE "User" ADD COLUMN "campusId" INTEGER;
CREATE INDEX "User_campusId_idx" ON "User"("campusId");
ALTER TABLE "User" ADD CONSTRAINT "User_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Employee: add campusId
ALTER TABLE "Employee" ADD COLUMN "campusId" INTEGER;
CREATE INDEX "Employee_campusId_idx" ON "Employee"("campusId");
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable LeaveRequest: add campusId
ALTER TABLE "LeaveRequest" ADD COLUMN "campusId" INTEGER;
CREATE INDEX "LeaveRequest_campusId_idx" ON "LeaveRequest"("campusId");
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable LeaveBalance: add campusId
ALTER TABLE "LeaveBalance" ADD COLUMN "campusId" INTEGER;
CREATE INDEX "LeaveBalance_campusId_idx" ON "LeaveBalance"("campusId");
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable SabbaticalRequest: add campusId
ALTER TABLE "SabbaticalRequest" ADD COLUMN "campusId" INTEGER;
CREATE INDEX "SabbaticalRequest_campusId_idx" ON "SabbaticalRequest"("campusId");
ALTER TABLE "SabbaticalRequest" ADD CONSTRAINT "SabbaticalRequest_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable ClearanceRequest: add campusId
ALTER TABLE "ClearanceRequest" ADD COLUMN "campusId" INTEGER;
CREATE INDEX "ClearanceRequest_campusId_idx" ON "ClearanceRequest"("campusId");
ALTER TABLE "ClearanceRequest" ADD CONSTRAINT "ClearanceRequest_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable ClearanceUnit: add campusId, replace unique on name with (campusId, name)
ALTER TABLE "ClearanceUnit" ADD COLUMN "campusId" INTEGER;
DROP INDEX IF EXISTS "ClearanceUnit_name_key";
CREATE UNIQUE INDEX "ClearanceUnit_campusId_name_key" ON "ClearanceUnit"("campusId", "name");
CREATE INDEX "ClearanceUnit_campusId_idx" ON "ClearanceUnit"("campusId");
ALTER TABLE "ClearanceUnit" ADD CONSTRAINT "ClearanceUnit_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable JobPosting: add campusId
ALTER TABLE "JobPosting" ADD COLUMN "campusId" INTEGER;
CREATE INDEX "JobPosting_campusId_idx" ON "JobPosting"("campusId");
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Notification: add campusId
ALTER TABLE "Notification" ADD COLUMN "campusId" INTEGER;
CREATE INDEX "Notification_campusId_idx" ON "Notification"("campusId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable AuditLog: add campusId and index
ALTER TABLE "AuditLog" ADD COLUMN "campusId" INTEGER;
CREATE INDEX "AuditLog_campusId_timestamp_idx" ON "AuditLog"("campusId", "timestamp");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

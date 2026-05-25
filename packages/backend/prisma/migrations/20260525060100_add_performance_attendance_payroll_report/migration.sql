-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING_HR', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_CLOCK_IN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_CLOCK_OUT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PERFORMANCE_EVALUATION_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PERFORMANCE_EVALUATION_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PERFORMANCE_EVALUATION_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PERFORMANCE_EVALUATION_REJECT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCESS_DENIED';

-- CreateTable
CREATE TABLE "PerformanceEvaluation" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "deptHeadId" INTEGER NOT NULL,
    "hrApprovedById" INTEGER,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING_HR',
    "period" TEXT NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "punctualityScore" DOUBLE PRECISION NOT NULL,
    "knowledgeScore" DOUBLE PRECISION NOT NULL,
    "teamworkScore" DOUBLE PRECISION NOT NULL,
    "efficiencyScore" DOUBLE PRECISION NOT NULL,
    "workOutputScore" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "rejectionReason" TEXT,
    "hrApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOut" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "campusId" INTEGER,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollReport" (
    "id" SERIAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "reportUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "campusId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceEvaluation_employeeId_idx" ON "PerformanceEvaluation"("employeeId");

-- CreateIndex
CREATE INDEX "PerformanceEvaluation_deptHeadId_idx" ON "PerformanceEvaluation"("deptHeadId");

-- CreateIndex
CREATE INDEX "PerformanceEvaluation_status_idx" ON "PerformanceEvaluation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Attendance_campusId_date_idx" ON "Attendance"("campusId", "date");

-- CreateIndex
CREATE INDEX "PayrollReport_campusId_idx" ON "PayrollReport"("campusId");

-- CreateIndex
CREATE INDEX "PayrollReport_month_year_idx" ON "PayrollReport"("month", "year");

-- AddForeignKey
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollReport" ADD CONSTRAINT "PayrollReport_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollReport" ADD CONSTRAINT "PayrollReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

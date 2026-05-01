-- CreateEnum
CREATE TYPE "LeaveStage" AS ENUM ('DEPT_HEAD', 'HR_OFFICER', 'DEAN', 'VICE_PRESIDENT');

-- AlterEnum (add new LeaveType values)
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'PERSONAL';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'STUDY';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'RESEARCH';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'SABBATICAL';

-- AlterTable LeaveBalance (add personalBalance)
ALTER TABLE "LeaveBalance" ADD COLUMN IF NOT EXISTS "personalBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable LeaveRequest (add two-stage workflow fields)
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "currentStage" "LeaveStage" NOT NULL DEFAULT 'DEPT_HEAD';
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "deptHeadId" INTEGER;
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "deptHeadComment" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "deptHeadDecisionAt" TIMESTAMP(3);

-- CreateTable LeaveApproval
CREATE TABLE IF NOT EXISTS "LeaveApproval" (
    "id" SERIAL NOT NULL,
    "leaveId" INTEGER NOT NULL,
    "stage" "LeaveStage" NOT NULL,
    "actorId" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveApproval_leaveId_idx" ON "LeaveApproval"("leaveId");
CREATE INDEX IF NOT EXISTS "LeaveApproval_actorId_idx" ON "LeaveApproval"("actorId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_status_currentStage_idx" ON "LeaveRequest"("status", "currentStage");

-- AddForeignKey
ALTER TABLE "LeaveApproval" ADD CONSTRAINT "LeaveApproval_leaveId_fkey"
    FOREIGN KEY ("leaveId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

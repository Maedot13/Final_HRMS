-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "lastDecisionAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SabbaticalRequest" ADD COLUMN     "lastDecisionAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

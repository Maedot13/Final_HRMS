-- AddColumn isMarried, academicRank, and leave eligibility flags to Employee
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "isMarried" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "academicRank" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "sabbaticalEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "researchLeaveEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "studyLeaveEligible" BOOLEAN NOT NULL DEFAULT false;

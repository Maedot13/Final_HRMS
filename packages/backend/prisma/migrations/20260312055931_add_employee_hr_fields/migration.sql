-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'CONTRACT');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "contractStartDate" TIMESTAMP(3),
ADD COLUMN     "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "employmentType" "EmploymentType" NOT NULL DEFAULT 'PERMANENT',
ADD COLUMN     "officeLocation" TEXT,
ADD COLUMN     "payGrade" TEXT,
ADD COLUMN     "supervisorId" INTEGER,
ADD COLUMN     "taxInformation" JSONB;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

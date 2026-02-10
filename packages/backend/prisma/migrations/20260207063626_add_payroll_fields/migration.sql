/*
  Warnings:

  - You are about to drop the `ClearanceDepartment` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('MONTHLY', 'DAILY');

-- DropForeignKey
ALTER TABLE "ClearanceDepartment" DROP CONSTRAINT "ClearanceDepartment_clearanceId_fkey";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "grossSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "salaryType" "SalaryType" NOT NULL DEFAULT 'MONTHLY';

-- DropTable
DROP TABLE "ClearanceDepartment";

-- DropEnum
DROP TYPE "DepartmentType";

-- CreateTable
CREATE TABLE "ClearanceUnit" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClearanceUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearanceCheck" (
    "id" SERIAL NOT NULL,
    "clearanceId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "status" "ClearanceStatus" NOT NULL DEFAULT 'PENDING',
    "approverId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "ClearanceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClearanceUnit_name_key" ON "ClearanceUnit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ClearanceCheck_clearanceId_unitId_key" ON "ClearanceCheck"("clearanceId", "unitId");

-- AddForeignKey
ALTER TABLE "ClearanceCheck" ADD CONSTRAINT "ClearanceCheck_clearanceId_fkey" FOREIGN KEY ("clearanceId") REFERENCES "ClearanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceCheck" ADD CONSTRAINT "ClearanceCheck_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ClearanceUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Campus" ADD COLUMN     "employeeIdPrefix" TEXT NOT NULL DEFAULT 'EMP',
ADD COLUMN     "employeeNumericLength" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "employeeSequenceCurrent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPatternLocked" BOOLEAN NOT NULL DEFAULT false;

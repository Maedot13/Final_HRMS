-- CreateTable College
CREATE TABLE IF NOT EXISTS "College" (
    "id" SERIAL NOT NULL,
    "campusId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deanEmployeeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "College_deanEmployeeId_key" ON "College"("deanEmployeeId");
CREATE INDEX IF NOT EXISTS "College_campusId_idx" ON "College"("campusId");
CREATE UNIQUE INDEX IF NOT EXISTS "College_campusId_name_key" ON "College"("campusId", "name");
ALTER TABLE "College" ADD CONSTRAINT "College_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "College" ADD CONSTRAINT "College_deanEmployeeId_fkey" FOREIGN KEY ("deanEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable Faculty
CREATE TABLE IF NOT EXISTS "Faculty" (
    "id" SERIAL NOT NULL,
    "collegeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deanEmployeeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Faculty_deanEmployeeId_key" ON "Faculty"("deanEmployeeId");
CREATE INDEX IF NOT EXISTS "Faculty_collegeId_idx" ON "Faculty"("collegeId");
CREATE UNIQUE INDEX IF NOT EXISTS "Faculty_collegeId_name_key" ON "Faculty"("collegeId", "name");
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_deanEmployeeId_fkey" FOREIGN KEY ("deanEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Department
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "facultyId" INTEGER;
CREATE INDEX IF NOT EXISTS "Department_facultyId_idx" ON "Department"("facultyId");
ALTER TABLE "Department" ADD CONSTRAINT "Department_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

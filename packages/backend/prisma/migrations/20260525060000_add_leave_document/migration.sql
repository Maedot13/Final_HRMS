-- CreateTable
CREATE TABLE "LeaveDocument" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "leaveRequestId" INTEGER NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "publicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveDocument_leaveRequestId_key" ON "LeaveDocument"("leaveRequestId");

-- CreateIndex
CREATE INDEX "LeaveDocument_userId_idx" ON "LeaveDocument"("userId");

-- AddForeignKey
ALTER TABLE "LeaveDocument" ADD CONSTRAINT "LeaveDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveDocument" ADD CONSTRAINT "LeaveDocument_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ClearanceCheck_unitId_status_idx" ON "ClearanceCheck"("unitId", "status");

-- CreateIndex
CREATE INDEX "ClearanceCheck_clearanceId_status_idx" ON "ClearanceCheck"("clearanceId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_status_idx" ON "LeaveRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_createdAt_idx" ON "LeaveRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_revoked_idx" ON "RefreshToken"("userId", "revoked");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

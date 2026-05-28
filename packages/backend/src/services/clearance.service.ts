
import { ClearanceStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notifyDepartmentHead, notifyRole, notifyUsers } from './notification.service';
import { canApproveForUnit } from './authorization.service';
import { logger } from '../utils/logger';
import { dispatchEvent, SystemEventTypes } from './eventBus.service';


// 1. Initiate Clearance
export const initiateClearance = async (employeeId: number, reason: string, lastWorkingDay: Date) => {
    const existing = await prisma.clearanceRequest.findFirst({
        where: {
            employeeId,
            status: { notIn: [ClearanceStatus.REJECTED, ClearanceStatus.COMPLETED] }
        }
    });

    if (existing) {
        throw new Error('Active clearance request already exists');
    }

    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { campusId: true, deptLegacy: true, name: true }
    });
    const campusId = employee?.campusId ?? null;

    // Fetch all active clearance units across all active campuses
    const units = await prisma.clearanceUnit.findMany({
        where: { 
            isActive: true,
            campus: { isActive: true }
        }
    });

    const activeCampuses = await prisma.campus.findMany({
        where: { isActive: true }
    });

    if (units.length === 0) {
        throw new Error('No active clearance units defined in system');
    }

    if (!Array.isArray(units)) {
        console.log('UNITS IS NOT AN ARRAY:', units);
    }
    // Create Request + Checks Transactional
    const clearance = await prisma.clearanceRequest.create({
        data: {
            campusId,
            employeeId,
            reason,
            lastWorkingDay,
            status: ClearanceStatus.BODY_APPROVAL_PENDING,
            checks: {
                create: units.map((unit: { id: number }) => ({
                    unitId: unit.id,
                    status: ClearanceStatus.PENDING
                }))
            }
        },
        include: {
            checks: {
                include: { unit: true }
            }
        }
    });

    // 2. Notification Logic (Post-Creation)
    const createdRequest = await prisma.clearanceRequest.findUnique({
        where: { id: clearance.id },
        include: {
            employee: true
        }
    });

    if (createdRequest) {
        // Iterate through units to notify correct people
        for (const unit of units) {
            const message = `Clearance request from ${createdRequest.employee.name} requires your review.`;
            
            // Find all CLEARANCE_BODY users for this unit
            const bodyUsers = await prisma.user.findMany({
                where: {
                    role: 'CLEARANCE_BODY',
                    isActive: true,
                    clearanceUnitId: unit.id
                }
            });

            if (bodyUsers.length > 0) {
                const userIds = bodyUsers.map(u => u.id);
                await notifyUsers(userIds, {
                    type: 'CLEARANCE_REVIEW_REQUIRED',
                    title: `Clearance Request: ${unit.name}`,
                    message,
                    relatedId: clearance.id,
                    relatedType: 'CLEARANCE_REQUEST',
                    campusId
                });
            }
        }
    }

    return clearance;
};

// Self-healing: reconcile request status if checks are out of sync
const reconcileRequestStatus = async (request: any) => {
    if (request.status === 'BODY_APPROVAL_PENDING' && request.checks?.length > 0) {
        const allChecksApproved = request.checks.every((c: any) => c.status === 'APPROVED');
        if (allChecksApproved) {
            logger.warn(`Reconciling stuck request #${request.id}: all checks approved but status was BODY_APPROVAL_PENDING`);
            await prisma.clearanceRequest.update({
                where: { id: request.id },
                data: { status: ClearanceStatus.HR_APPROVAL_PENDING }
            });
            request.status = 'HR_APPROVAL_PENDING';
        }
    }
    return request;
};

// 1b. List Clearance Requests (with optional status filter and campus isolation)
export const listClearanceRequests = async (params: { status?: string; campusId?: number; limit?: number; offset?: number }) => {
    const where: any = {};
    if (params.status && params.status !== 'ALL') {
        if (params.status === 'PENDING') {
            where.status = { in: ['IN_PROGRESS', 'BODY_APPROVAL_PENDING', 'HR_APPROVAL_PENDING'] };
        } else if (params.status === 'APPROVED') {
            where.status = { in: ['APPROVED', 'HR_APPROVED', 'COMPLETED'] };
        } else {
            where.status = params.status;
        }
    }
    if (params.campusId != null) {
        where.campusId = params.campusId;
    }

    where.campus = { isActive: true };

    const [data, total] = await Promise.all([
        prisma.clearanceRequest.findMany({
            where,
            include: {
                employee: { select: { employeeId: true, name: true, deptLegacy: true } },
                checks: { include: { unit: true } },
                hrApprovals: true,
            },
            orderBy: { createdAt: 'desc' },
            take: params.limit || 50,
            skip: params.offset || 0,
        }),
        prisma.clearanceRequest.count({ where }),
    ]);

    // Self-heal any stuck requests
    for (const req of data) {
        await reconcileRequestStatus(req);
    }

    return { data, total };
};

// 2. Get Clearance Details
export const getClearance = async (id: number) => {
    const request = await prisma.clearanceRequest.findUnique({
        where: { id },
        include: {
            employee: { select: { employeeId: true, name: true, deptLegacy: true } },
            campus: { select: { name: true } },
            hrApprovals: { include: { campus: { select: { name: true } } } },
            checks: {
                include: {
                    unit: {
                        include: { campus: { select: { name: true } } }
                    }
                },
                orderBy: { unit: { priorityOrder: 'asc' } }
            }
        }
    });
    if (request) await reconcileRequestStatus(request);
    return request;
};

// 3. Approve Specific Check
// unitId is the 'ClearanceUnit.id', checking against 'ClearanceCheck.unitId'
export const approveCheck = async (clearanceId: number, unitId: number, approverId: number | null, userId: number, approverCampusId: number | null, comment?: string) => {
    // AUTHORIZATION CHECK
    const canApprove = await canApproveForUnit(userId, unitId);
    if (!canApprove) {
        throw new Error('You do not have permission to approve for this unit');
    }



    return prisma.$transaction(async (tx) => {
        // Enforce sequential clearance logic globally
        const currentUnit = await tx.clearanceUnit.findUnique({ where: { id: unitId } });
        if (currentUnit) {
            // Only block if units with STRICTLY LOWER priority have non-approved non-rejected checks
            // Units with same priority (parallel) are never a blocker
            // Units already REJECTED don't block same-priority peers but do block higher-priority ones
            const earlierPending = await tx.clearanceCheck.count({
                where: {
                    clearanceId,
                    status: { not: ClearanceStatus.APPROVED },
                    unit: { priorityOrder: { lt: currentUnit.priorityOrder } }
                }
            });
            if (earlierPending > 0) {
                throw new Error('Sequential clearance enforcement: You cannot evaluate this check until all prior units have approved.');
            }
        }
        // Find the specific check
        const check = await tx.clearanceCheck.findUnique({
            where: {
                clearanceId_unitId: {
                    clearanceId,
                    unitId
                }
            }
        });

        if (!check) throw new Error('Clearance check record not found for this unit');
        // Allow re-approval of a previously REJECTED check (resolution flow)
        if (check.status !== ClearanceStatus.PENDING && check.status !== ClearanceStatus.REJECTED) {
            throw new Error(`Decision already made for this unit (${check.status})`);
        }

        // Update Check
        await tx.clearanceCheck.update({
            where: { id: check.id },
            data: {
                status: ClearanceStatus.APPROVED,
                approverId,
                approvedAt: new Date(),
                comment
            }
        });

        // Verify if ALL checks are approved (none pending or rejected)
        const nonApprovedChecks = await tx.clearanceCheck.count({
            where: {
                clearanceId,
                status: { not: ClearanceStatus.APPROVED }
            }
        });

        if (nonApprovedChecks === 0) {
            // All bodies approved! Move to HR Approval
            await tx.clearanceRequest.update({
                where: { id: clearanceId },
                data: { status: ClearanceStatus.HR_APPROVAL_PENDING }
            });

            // Fetch employee for notification
            const clearanceWithEmployee = await tx.clearanceRequest.findUnique({
                where: { id: clearanceId },
                include: { employee: true }
            });

            if (clearanceWithEmployee) {
                await notifyRole('HR_OFFICER', {
                    type: 'CLEARANCE_FINAL_SIGN_OFF',
                    title: 'Campus HR Clearance Sign-off Required',
                    message: `All units have approved ${clearanceWithEmployee.employee.name}'s clearance. Campus HR action is now required.`,
                    relatedId: clearanceId,
                    relatedType: 'CLEARANCE_REQUEST',
                    campusId: null
                });
            }

            return { status: 'HR_APPROVAL_PENDING', message: 'All clearance bodies approved. Waiting for Campus HR approval.' };
        }

        // Ensure main request status is BODY_APPROVAL_PENDING (not REJECTED) when continuing
        await tx.clearanceRequest.update({
            where: { id: clearanceId },
            data: { status: ClearanceStatus.BODY_APPROVAL_PENDING, rejectedAt: null, rejectionReason: null }
        });

        // Fetch employee userId for notification dispatch
        const clearanceWithEmployee = await tx.clearanceRequest.findUnique({
            where: { id: clearanceId },
            include: { employee: true }
        });
        const unit = await tx.clearanceUnit.findUnique({ where: { id: unitId } });

        // Dispatch async notification to BullMQ worker
        if (clearanceWithEmployee) {
            await dispatchEvent(SystemEventTypes.CLEARANCE_UNIT_APPROVED, {
                clearanceId,
                employeeUserId: clearanceWithEmployee.employee.userId,
                unitName: unit?.name || 'Unknown'
            });
        }

        return { status: 'PROGRESS', message: 'Unit approved, others pending' };
    }, { timeout: 15000 });
};

// 4. Reject Specific Check
export const rejectCheck = async (clearanceId: number, unitId: number, approverId: number | null, userId: number, approverCampusId: number | null, comment: string) => {
    // AUTHORIZATION CHECK
    const canApprove = await canApproveForUnit(userId, unitId);
    if (!canApprove) {
        throw new Error('You do not have permission to reject for this unit');
    }



    return prisma.$transaction(async (tx) => {
        // Enforce sequential clearance logic globally
        const currentUnit = await tx.clearanceUnit.findUnique({ where: { id: unitId } });
        if (currentUnit) {
            const earlierPending = await tx.clearanceCheck.count({
                where: {
                    clearanceId,
                    status: { not: ClearanceStatus.APPROVED },
                    unit: { priorityOrder: { lt: currentUnit.priorityOrder } }
                }
            });
            if (earlierPending > 0) {
                throw new Error('Sequential clearance enforcement: You cannot evaluate this check until all prior units have approved.');
            }
        }
        
        // Find the specific check
        const check = await tx.clearanceCheck.findUnique({
            where: {
                clearanceId_unitId: {
                    clearanceId,
                    unitId
                }
            }
        });

        if (!check) throw new Error('Clearance check record not found for this unit');
        if (check.status === ClearanceStatus.APPROVED) {
            throw new Error('This check has already been approved and cannot be rejected');
        }

        // Update the individual check to REJECTED (request stays alive — BODY_APPROVAL_PENDING)
        await tx.clearanceCheck.update({
            where: { id: check.id },
            data: {
                status: ClearanceStatus.REJECTED,
                approverId,
                approvedAt: new Date(),
                comment
            }
        });

        // Keep the clearance request as BODY_APPROVAL_PENDING — not globally rejected.
        // Other units with equal or lower priority can still approve concurrently.
        // Record which unit caused the latest issue for HR visibility.
        await tx.clearanceRequest.update({
            where: { id: clearanceId },
            data: {
                status: ClearanceStatus.BODY_APPROVAL_PENDING,
                rejectionReason: `Issue raised by unit ${unitId}${comment ? ': ' + comment : ''}`
            }
        });

        // Fetch employee + unit data for the async event payload
        const clearanceWithEmployee = await tx.clearanceRequest.findUnique({
            where: { id: clearanceId },
            include: { employee: true }
        });
        const unit = await tx.clearanceUnit.findUnique({ where: { id: unitId } });

        // Dispatch async notification to BullMQ worker
        if (clearanceWithEmployee) {
            await dispatchEvent(SystemEventTypes.CLEARANCE_UNIT_REJECTED, {
                clearanceId,
                employeeUserId: clearanceWithEmployee.employee.userId,
                unitName: unit?.name || 'Unknown',
                comment
            });
        }

        return { status: 'REJECTED', message: 'Clearance check rejected. Employee must resolve issues.' };
    }, { timeout: 15000 });
};

// Get pending checks for a specific unit (for the approver dashboard)
export const getPendingChecksForUnit = async (unitId: number, _campusId?: number) => {
    return prisma.clearanceCheck.findMany({
        where: {
            unitId,
            status: { in: [ClearanceStatus.PENDING, ClearanceStatus.REJECTED] }
        },
        include: {
            clearance: {
                include: { employee: true }
            },
            unit: true
        }
    });
};

export const listClearanceUnits = async (campusId?: number) => {
    return prisma.clearanceUnit.findMany({
        where: {
            ...(campusId ? { campusId } : {}),
            campus: { isActive: true }
        },
        orderBy: { name: 'asc' },
        include: {
            users: {
                select: { employeeId: true }
            }
        }
    });
};

export const createClearanceUnit = async (data: { name: string; fullName?: string; description?: string; campusId: number; priorityOrder?: number; loginId?: string; loginPassword?: string }) => {
    let passwordHash: string | undefined;
    if (data.loginPassword) {
        const bcrypt = require('bcrypt');
        passwordHash = await bcrypt.hash(data.loginPassword, 10);
    }

    return prisma.$transaction(async (tx) => {
        const unit = await tx.clearanceUnit.create({
            data: {
                name: data.name,
                fullName: data.fullName,
                description: data.description,
                campusId: data.campusId,
                isSystemGenerated: false,
                isActive: true,
                priorityOrder: data.priorityOrder || 0
            }
        });

        if (data.loginId) {
            const existingUser = await tx.user.findUnique({ where: { employeeId: data.loginId } });
            
            if (existingUser) {
                const updateData: any = { clearanceUnitId: unit.id, role: 'CLEARANCE_BODY' };
                if (passwordHash) updateData.passwordHash = passwordHash;
                
                await tx.user.update({
                    where: { id: existingUser.id },
                    data: updateData
                });
            } else {
                if (!passwordHash) throw new Error('Password is required for new clearance body account');
                await tx.user.create({
                    data: {
                        email: `${data.loginId}@body.local`,
                        passwordHash,
                        role: 'CLEARANCE_BODY',
                        employeeId: data.loginId,
                        isActive: true,
                        campusId: data.campusId,
                        clearanceUnitId: unit.id
                    }
                });
            }
        }
        return unit;
    }, { timeout: 15000 });
};

export const updateClearanceUnit = async (unitId: number, data: { name?: string; fullName?: string; description?: string; isActive?: boolean; priorityOrder?: number; loginId?: string; loginPassword?: string }) => {
    let passwordHash: string | undefined;
    if (data.loginPassword) {
        const bcrypt = require('bcrypt');
        passwordHash = await bcrypt.hash(data.loginPassword, 10);
    }

    return prisma.$transaction(async (tx) => {
        const unit = await tx.clearanceUnit.findUnique({ where: { id: unitId } });
        if (!unit) throw new Error('Clearance unit not found');

        if (unit.isSystemGenerated && data.name) {
            throw new Error('Cannot rename system-generated clearance units');
        }

        const updatedUnit = await tx.clearanceUnit.update({
            where: { id: unitId },
            data: {
                name: data.name,
                fullName: data.fullName,
                description: data.description,
                isActive: data.isActive,
                priorityOrder: data.priorityOrder
            }
        });

        if (data.loginId) {
            const existingUserInUnit = await tx.user.findFirst({
                where: { clearanceUnitId: unit.id }
            });

            const existingUserByLoginId = await tx.user.findUnique({ where: { employeeId: data.loginId } });

            if (existingUserByLoginId) {
                if (existingUserInUnit && existingUserInUnit.id !== existingUserByLoginId.id) {
                    await tx.user.update({
                        where: { id: existingUserInUnit.id },
                        data: { clearanceUnitId: null }
                    });
                }
                
                const updateData: any = { clearanceUnitId: unit.id, role: 'CLEARANCE_BODY' };
                if (passwordHash) updateData.passwordHash = passwordHash;
                
                await tx.user.update({
                    where: { id: existingUserByLoginId.id },
                    data: updateData
                });
            } else if (existingUserInUnit) {
                const updateData: any = {
                    employeeId: data.loginId,
                    email: `${data.loginId}@body.local`
                };
                if (passwordHash) updateData.passwordHash = passwordHash;
                
                await tx.user.update({
                    where: { id: existingUserInUnit.id },
                    data: updateData
                });
            } else {
                if (!passwordHash) throw new Error('Password is required for new clearance body account');
                await tx.user.create({
                    data: {
                        email: `${data.loginId}@body.local`,
                        passwordHash,
                        role: 'CLEARANCE_BODY',
                        employeeId: data.loginId,
                        isActive: true,
                        campusId: unit.campusId,
                        clearanceUnitId: unit.id
                    }
                });
            }
        }

        return updatedUnit;
    }, { timeout: 15000 });
};
export const deleteClearanceUnit = async (unitId: number) => {
    return prisma.$transaction(async (tx) => {
        const unit = await tx.clearanceUnit.findUnique({
            where: { id: unitId },
            include: { checks: true }
        });

        if (!unit) throw new Error('Clearance unit not found');

        if (unit.isSystemGenerated) {
            throw new Error('System-generated clearance units cannot be deleted');
        }
        
        await tx.clearanceCheck.deleteMany({
            where: { unitId: unitId }
        });

        const users = await tx.user.findMany({
            where: { clearanceUnitId: unitId },
            select: { id: true }
        });

        if (users.length > 0) {
            const userIds = users.map(u => u.id);
            await tx.notification.deleteMany({
                where: { userId: { in: userIds } }
            });
            await tx.refreshToken.deleteMany({
                where: { userId: { in: userIds } }
            });
            await tx.user.deleteMany({
                where: { clearanceUnitId: unitId }
            });
        }

        return tx.clearanceUnit.delete({
            where: { id: unitId }
        });
    }, { timeout: 15000 });
};

// 5. approveCampusHR - HR Officer approval step
export const approveCampusHR = async (clearanceId: number, campusId: number, approverId: number, isApprove: boolean, notes?: string) => {
    return prisma.$transaction(async (tx) => {
        const clearance = await tx.clearanceRequest.findUnique({
            where: { id: clearanceId },
            include: { checks: { include: { unit: true } } }
        });

        if (!clearance) throw new Error('Clearance request not found');
        if (clearance.status !== ClearanceStatus.HR_APPROVAL_PENDING) {
            throw new Error(`Clearance is not in HR approval phase (${clearance.status})`);
        }

        const taskStatus = isApprove ? ClearanceStatus.APPROVED : ClearanceStatus.REJECTED;

        await tx.clearanceApproval.upsert({
            where: { clearanceId_campusId: { clearanceId, campusId } },
            create: { clearanceId, campusId, approvedById: approverId, status: taskStatus, approvedAt: new Date(), notes },
            update: { approvedById: approverId, status: taskStatus, approvedAt: new Date(), notes }
        });

        if (!isApprove) {
            return tx.clearanceRequest.update({
                where: { id: clearanceId },
                data: { status: ClearanceStatus.REJECTED, rejectedAt: new Date(), rejectionReason: notes }
            });
        }

        const activeCampusesCount = await tx.campus.count({ where: { isActive: true } });
        const approvedCount = await tx.clearanceApproval.count({
            where: { clearanceId, status: ClearanceStatus.APPROVED }
        });

        if (approvedCount >= activeCampusesCount) {
            return tx.clearanceRequest.update({
                where: { id: clearanceId },
                data: { status: ClearanceStatus.HR_APPROVED }
            });
        }

        return tx.clearanceRequest.findUnique({ where: { id: clearanceId }});
    }, { timeout: 15000 });
};

// 6. finalApproveClearance - Head HR
export const finalApproveClearance = async (clearanceId: number, approverId: number, isApprove: boolean, reason?: string) => {
    return prisma.$transaction(async (tx) => {
        const clearance = await tx.clearanceRequest.findUnique({
            where: { id: clearanceId },
            include: { employee: true }
        });

        if (!clearance) throw new Error('Clearance request not found');
        if (clearance.status !== ClearanceStatus.HR_APPROVED) {
            throw new Error(`Clearance is not in Final approval phase (${clearance.status})`);
        }

        if (!isApprove) {
            const rejectedReq = await tx.clearanceRequest.update({
                where: { id: clearanceId },
                data: { status: ClearanceStatus.REJECTED, rejectedAt: new Date(), rejectionReason: reason, finalApprovedById: approverId }
            });
            await notifyRole('HR_OFFICER', {
                type: 'CLEARANCE_FINAL_REJECTED',
                title: 'Clearance Finally Rejected',
                message: `Head HR rejected the clearance for ${clearance.employee.name}. Reason: ${reason}`,
                relatedId: clearanceId,
                relatedType: 'CLEARANCE_REQUEST',
                campusId: clearance.campusId
            });
            return rejectedReq;
        }

        const completed = await tx.clearanceRequest.update({
            where: { id: clearanceId },
            data: { status: ClearanceStatus.COMPLETED, finalApprovedById: approverId, finalApprovedAt: new Date() },
            include: { employee: true }
        });

        // 1. Deactivate Employee
        await tx.employee.update({
            where: { id: clearance.employeeId },
            data: { employmentStatus: 'SUSPENDED' }
        });

        // 2. Disable User
        await tx.user.update({
            where: { id: clearance.employee.userId },
            data: { isActive: false }
        });

        // 3. Revoke sessions
        await tx.refreshToken.updateMany({
            where: { userId: clearance.employee.userId, revoked: false },
            data: { revoked: true }
        });


        // Event
        await dispatchEvent(SystemEventTypes.CLEARANCE_COMPLETED, {
            clearanceId,
            employeeId: clearance.employeeId,
            employeeUserId: clearance.employee.userId,
            employeeName: clearance.employee.name,
            approverId
        });

        await notifyRole('HR_OFFICER', {
            type: 'CLEARANCE_FULLY_APPROVED',
            title: 'Clearance Fully Approved',
            message: `Head HR has given final approval for ${clearance.employee.name}'s clearance. Employee is now deactivated.`,
            relatedId: clearanceId,
            relatedType: 'CLEARANCE_REQUEST',
            campusId: clearance.campusId
        });

        return completed;
    }, { timeout: 15000 });
};

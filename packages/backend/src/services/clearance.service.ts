
import { ClearanceStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notifyDepartmentHead, notifyRole } from './notification.service';
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

    // Fetch active units for this campus
    const units = await prisma.clearanceUnit.findMany({
        where: { isActive: true, ...(campusId != null ? { campusId } : {}) }
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
            const unitName = unit.name.toUpperCase();
            const message = `Clearance request from ${createdRequest.employee.name} requires your review.`;

            if (unitName === 'HR' || unitName === 'HUMAN RESOURCES') {
                await notifyRole('HR_OFFICER', {
                    type: 'CLEARANCE_REVIEW_REQUIRED',
                    title: 'Clearance Request: HR',
                    message,
                    relatedId: clearance.id,
                    relatedType: 'CLEARANCE_REQUEST',
                    campusId
                });
            } else if (unitName === 'FINANCE') {
                await notifyRole('FINANCE_OFFICER', {
                    type: 'CLEARANCE_REVIEW_REQUIRED',
                    title: 'Clearance Request: Finance',
                    message,
                    relatedId: clearance.id,
                    relatedType: 'CLEARANCE_REQUEST',
                    campusId
                });
            } else if (unitName === 'DEPARTMENT HEAD' || unitName === createdRequest.employee.deptLegacy.toUpperCase()) {
                // If the unit is specifically "Department Head" or matches the employee's department name
                await notifyDepartmentHead(createdRequest.employee.deptLegacy, {
                    type: 'CLEARANCE_REVIEW_REQUIRED',
                    title: 'Clearance Request: Department',
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

// 1b. List Clearance Requests (with optional status filter and campus isolation)
export const listClearanceRequests = async (params: { status?: string; campusId?: number; limit?: number; offset?: number }) => {
    const where: any = {};
    if (params.status && params.status !== 'ALL') {
        where.status = params.status;
    }
    if (params.campusId != null) {
        where.campusId = params.campusId;
    }

    const [data, total] = await Promise.all([
        prisma.clearanceRequest.findMany({
            where,
            include: {
                employee: { select: { employeeId: true, name: true, deptLegacy: true } },
                checks: { include: { unit: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: params.limit || 50,
            skip: params.offset || 0,
        }),
        prisma.clearanceRequest.count({ where }),
    ]);

    return { data, total };
};

// 2. Get Clearance Details
export const getClearance = async (id: number) => {
    return prisma.clearanceRequest.findUnique({
        where: { id },
        include: {
            employee: { select: { employeeId: true, name: true } },
            checks: {
                include: { unit: true }
            }
        }
    });
};

// 3. Approve Specific Check
// unitId is the 'ClearanceUnit.id', checking against 'ClearanceCheck.unitId'
export const approveCheck = async (clearanceId: number, unitId: number, approverId: number | null, userId: number, approverCampusId: number | null, comment?: string) => {
    // AUTHORIZATION CHECK
    const canApprove = await canApproveForUnit(userId, unitId);
    if (!canApprove) {
        throw new Error('You do not have permission to approve for this unit');
    }

    // Campus isolation: campus users can only approve clearances in their campus
    if (approverCampusId != null) {
        const clearance = await prisma.clearanceRequest.findUnique({
            where: { id: clearanceId },
            select: { campusId: true, campus: { select: { isClearanceSequential: true } } }
        });
        if (!clearance || clearance.campusId !== approverCampusId) {
            logger.warn('Campus isolation: Cross-campus clearance approval denied', {
                clearanceId,
                approverCampusId,
                clearanceCampusId: clearance?.campusId ?? null,
            });
            throw new Error('Cross-campus access denied');
        }
    }

    return prisma.$transaction(async (tx) => {
        // Enforce sequential clearance logic if active
        const reqData = await tx.clearanceRequest.findUnique({
            where: { id: clearanceId },
            include: { campus: { select: { isClearanceSequential: true } } }
        });
        if (reqData?.campus?.isClearanceSequential) {
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
        if (check.status !== ClearanceStatus.PENDING) {
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

        // Verify if ALL checks are approved now
        const pendingChecks = await tx.clearanceCheck.count({
            where: {
                clearanceId,
                status: { not: ClearanceStatus.APPROVED }
            }
        });

        if (pendingChecks === 0) {
            // All bodies approved! Move to HR Approval
            await tx.clearanceRequest.update({
                where: { id: clearanceId },
                data: { status: ClearanceStatus.HR_APPROVAL_PENDING }
            });

            return { status: 'HR_APPROVAL_PENDING', message: 'All clearance bodies approved. Waiting for Campus HR approval.' };
        }

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

            // PROACTIVE: If only HR is left, notify HR specifically for "Final Sign-off"
            if (pendingChecks === 1) {
                const finalCheck = await tx.clearanceCheck.findFirst({
                    where: { clearanceId, status: ClearanceStatus.PENDING },
                    include: { unit: true }
                });

                if (finalCheck?.unit?.name.toUpperCase() === 'HR') {
                    await notifyRole('HR_OFFICER', {
                        type: 'CLEARANCE_FINAL_SIGN_OFF',
                        title: 'Final Clearance Sign-off Required',
                        message: `All units except HR have approved ${clearanceWithEmployee.employee.name}'s clearance. Final HR action is now required to complete the process.`,
                        relatedId: clearanceId,
                        relatedType: 'CLEARANCE_REQUEST',
                        campusId: approverCampusId
                    });
                }
            }
        }

        return { status: 'PROGRESS', message: 'Unit approved, others pending' };
    });
};

// 4. Reject Specific Check
export const rejectCheck = async (clearanceId: number, unitId: number, approverId: number | null, userId: number, approverCampusId: number | null, comment: string) => {
    // AUTHORIZATION CHECK
    const canApprove = await canApproveForUnit(userId, unitId);
    if (!canApprove) {
        throw new Error('You do not have permission to reject for this unit');
    }

    // Campus isolation: campus users can only reject clearances in their campus
    if (approverCampusId != null) {
        const clearance = await prisma.clearanceRequest.findUnique({
            where: { id: clearanceId },
            select: { campusId: true, campus: { select: { isClearanceSequential: true } } }
        });
        if (!clearance || clearance.campusId !== approverCampusId) {
            logger.warn('Campus isolation: Cross-campus clearance rejection denied', {
                clearanceId,
                approverCampusId,
                clearanceCampusId: clearance?.campusId ?? null,
            });
            throw new Error('Cross-campus access denied');
        }
    }

    return prisma.$transaction(async (tx) => {
        // Enforce sequential clearance logic if active
        const reqData = await tx.clearanceRequest.findUnique({
            where: { id: clearanceId },
            include: { campus: { select: { isClearanceSequential: true } } }
        });
        if (reqData?.campus?.isClearanceSequential) {
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
        if (check.status !== ClearanceStatus.PENDING) {
            throw new Error(`Decision already made for this unit (${check.status})`);
        }

        // Update Check to REJECTED
        await tx.clearanceCheck.update({
            where: { id: check.id },
            data: {
                status: ClearanceStatus.REJECTED,
                approverId,
                approvedAt: new Date(), // It's a "decision at" timestamp effectively
                comment
            }
        });

        // REJECT the entire clearance request
        await tx.clearanceRequest.update({
            where: { id: clearanceId },
            data: {
                status: ClearanceStatus.REJECTED,
                rejectedAt: new Date(),
                rejectionReason: `Rejected by unit ${unitId}${comment ? ': ' + comment : ''}`
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
    });
};

// Get pending checks for a specific unit (for the approver dashboard)
export const getPendingChecksForUnit = async (unitId: number, campusId?: number) => {
    return prisma.clearanceCheck.findMany({
        where: {
            unitId,
            status: ClearanceStatus.PENDING,
            ...(campusId != null ? { clearance: { campusId } } : {})
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
        where: campusId ? { campusId } : {},
        orderBy: { name: 'asc' }
    });
};

export const createClearanceUnit = async (data: { name: string; fullName?: string; description?: string; campusId: number; priorityOrder?: number; loginId?: string; loginPassword?: string }) => {
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

        if (data.loginId && data.loginPassword) {
            // Use bcrypt directly to hash the default clearance body password
            const bcrypt = require('bcrypt');
            const passwordHash = await bcrypt.hash(data.loginPassword, 10);
            
            await tx.user.create({
                data: {
                    email: `${data.loginId}@body.local`, // Mock email as Prisma forces unique email schema
                    passwordHash,
                    role: 'CLEARANCE_BODY',
                    employeeId: data.loginId, // Explicit mapping to employeeId for login schema
                    isActive: true,
                    campusId: data.campusId,
                    clearanceUnitId: unit.id
                }
            });
        }
        return unit;
    });
};

export const updateClearanceUnit = async (unitId: number, data: { name?: string; fullName?: string; description?: string; isActive?: boolean }) => {
    const unit = await prisma.clearanceUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new Error('Clearance unit not found');

    if (unit.isSystemGenerated && data.name) {
        throw new Error('Cannot rename system-generated clearance units');
    }

    return prisma.clearanceUnit.update({
        where: { id: unitId },
        data
    });
};
export const deleteClearanceUnit = async (unitId: number) => {
    const unit = await prisma.clearanceUnit.findUnique({
        where: { id: unitId }
    });

    if (!unit) throw new Error('Clearance unit not found');

    if (unit.isSystemGenerated) {
        throw new Error('System-generated clearance units cannot be deleted');
    }

    return prisma.clearanceUnit.delete({
        where: { id: unitId }
    });
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

        const allCampusIds = [...new Set(clearance.checks.map(c => c.unit.campusId).filter(id => id !== null))];

        const approvedCount = await tx.clearanceApproval.count({
            where: { clearanceId, status: ClearanceStatus.APPROVED }
        });

        if (approvedCount >= allCampusIds.length) {
            return tx.clearanceRequest.update({
                where: { id: clearanceId },
                data: { status: ClearanceStatus.HR_APPROVED }
            });
        }

        return tx.clearanceRequest.findUnique({ where: { id: clearanceId }});
    });
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
    });
};

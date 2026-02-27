
import { ClearanceStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notifyDepartmentHead, notifyRole } from './notification.service';
import { canApproveForUnit } from './authorization.service';
import { logger } from '../utils/logger';


// 1. Initiate Clearance
export const initiateClearance = async (employeeId: number, reason: string, lastWorkingDay: Date) => {
    // Check if active clearance already exists
    const existing = await prisma.clearanceRequest.findFirst({
        where: {
            employeeId,
            status: ClearanceStatus.PENDING
        }
    });

    if (existing) {
        throw new Error('Active clearance request already exists');
    }

    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { campusId: true, department: true, name: true }
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
            status: ClearanceStatus.PENDING,
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
            } else if (unitName === 'DEPARTMENT HEAD' || unitName === createdRequest.employee.department.toUpperCase()) {
                // If the unit is specifically "Department Head" or matches the employee's department name
                await notifyDepartmentHead(createdRequest.employee.department, {
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
export const approveCheck = async (clearanceId: number, unitId: number, approverId: number, userId: number, approverCampusId: number | null, comment?: string) => {
    // AUTHORIZATION CHECK
    const canApprove = await canApproveForUnit(userId, unitId);
    if (!canApprove) {
        throw new Error('You do not have permission to approve for this unit');
    }

    // Campus isolation: campus users can only approve clearances in their campus
    if (approverCampusId != null) {
        const clearance = await prisma.clearanceRequest.findUnique({
            where: { id: clearanceId },
            select: { campusId: true }
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
            // All approved! Complete the clearance
            await tx.clearanceRequest.update({
                where: { id: clearanceId },
                data: { status: ClearanceStatus.APPROVED } // APPROVED = COMPLETE
            });

            // AUTOMATICALLY CREATE PAYROLL TRANSFER
            const clearance = await tx.clearanceRequest.findUnique({
                where: { id: clearanceId },
                include: { employee: true }
            });
            if (clearance) {
                await tx.payrollTransfer.create({
                    data: {
                        employeeId: clearance.employeeId,
                        clearanceId: clearance.id,
                        reason: 'Clearance Completed',
                        effectiveDate: new Date(),
                        status: 'PENDING',
                        createdBy: approverId
                    }
                });

                // Trigger Notification: Clearance Completed
                await tx.notification.create({
                    data: {
                        userId: clearance.employee.userId,
                        type: 'CLEARANCE_COMPLETED',
                        title: 'Clearance Process Completed',
                        message: 'All departments have approved your clearance. Payroll transfer has been initiated.',
                        relatedId: clearance.id,
                        relatedType: 'CLEARANCE_REQUEST'
                    }
                });

                // Send Email
                const user = await tx.user.findUnique({ where: { id: clearance.employee.userId } });
                if (user && user.email) {
                    const { sendEmail } = await import('./email.service');
                    const { templates } = await import('../utils/emailTemplates');
                    await sendEmail({
                        to: user.email,
                        subject: 'Clearance Process Completed',
                        html: templates.clearanceCompleted(clearance.employee.name)
                    });
                }
            }

            return { status: 'COMPLETED', message: 'Clearance fully approved and Payroll Transfer initiated' };
        }

        // Notify employee about unit approval
        const clearanceWithEmployee = await tx.clearanceRequest.findUnique({
            where: { id: clearanceId },
            include: { employee: true }
        });
        const unit = await tx.clearanceUnit.findUnique({ where: { id: unitId } });

        if (clearanceWithEmployee) {
            await tx.notification.create({
                data: {
                    userId: clearanceWithEmployee.employee.userId,
                    type: 'CLEARANCE_UNIT_APPROVED',
                    title: 'Clearance Unit Approved',
                    message: `Department "${unit?.name || 'Unknown'}" has approved your clearance.`,
                    relatedId: clearanceId,
                    relatedType: 'CLEARANCE_REQUEST'
                }
            });
        }

        return { status: 'PROGRESS', message: 'Unit approved, others pending' };
    });
};

// 4. Reject Specific Check
export const rejectCheck = async (clearanceId: number, unitId: number, approverId: number, userId: number, approverCampusId: number | null, comment: string) => {
    // AUTHORIZATION CHECK
    const canApprove = await canApproveForUnit(userId, unitId);
    if (!canApprove) {
        throw new Error('You do not have permission to reject for this unit');
    }

    // Campus isolation: campus users can only reject clearances in their campus
    if (approverCampusId != null) {
        const clearance = await prisma.clearanceRequest.findUnique({
            where: { id: clearanceId },
            select: { campusId: true }
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

        // Notify employee about rejection
        const clearanceWithEmployee = await tx.clearanceRequest.findUnique({
            where: { id: clearanceId },
            include: { employee: true }
        });
        const unit = await tx.clearanceUnit.findUnique({ where: { id: unitId } });

        if (clearanceWithEmployee) {
            await tx.notification.create({
                data: {
                    userId: clearanceWithEmployee.employee.userId,
                    type: 'CLEARANCE_UNIT_REJECTED',
                    title: 'Clearance Unit Rejected',
                    message: `Department "${unit?.name || 'Unknown'}" has rejected your clearance. Comment: ${comment}`,
                    relatedId: clearanceId,
                    relatedType: 'CLEARANCE_REQUEST'
                }
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


import { PrismaClient, ClearanceStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';


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

    // Fetch all active units
    const units = await prisma.clearanceUnit.findMany({
        where: { isActive: true }
    });

    if (units.length === 0) {
        throw new Error('No active clearance units defined in system');
    }

    // Create Request + Checks Transactional
    return prisma.clearanceRequest.create({
        data: {
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
export const approveCheck = async (clearanceId: number, unitId: number, approverId: number, comment?: string) => {
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
            const clearance = await tx.clearanceRequest.findUnique({ where: { id: clearanceId } });
            if (clearance) {
                await tx.payrollTransfer.create({
                    data: {
                        employeeId: clearance.employeeId,
                        clearanceId: clearance.id,
                        reason: 'Clearance Completed',
                        effectiveDate: new Date(), // Defaults to completion date
                        status: 'PENDING', // Payroll officer will process it
                        createdBy: approverId // The person who approved the last check triggers this
                    }
                });
            }

            return { status: 'COMPLETED', message: 'Clearance fully approved and Payroll Transfer initiated' };
        }

        return { status: 'PROGRESS', message: 'Unit approved, others pending' };
    });
};

// 4. Reject Specific Check
export const rejectCheck = async (clearanceId: number, unitId: number, approverId: number, comment: string) => {
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

        // We DO NOT fail the whole clearance request. It stays PENDING until this unit approves.
        // Optionally, we could set a flag or notification, but for now simple state change is enough.

        return { status: 'REJECTED', message: 'Clearance check rejected. Employee must resolve issues.' };
    });
};

// Get pending checks for a specific unit (for the approver dashboard)
export const getPendingChecksForUnit = async (unitId: number) => {
    return prisma.clearanceCheck.findMany({
        where: {
            unitId,
            status: ClearanceStatus.PENDING
        },
        include: {
            clearance: {
                include: { employee: true }
            },
            unit: true
        }
    });
};

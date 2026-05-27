import { LeaveStatus, LeaveType, LeaveStage, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { LEAVE_BALANCES } from '../config/constants';
import { sendLeaveToFinance } from './finance.service';

// ─── Prisma Error Helpers ─────────────────────────────────────────────────────

/** Re-throw Prisma-specific errors with user-friendly messages while logging full details. */
function handlePrismaError(error: unknown, context: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error(`Prisma error in ${context}`, {
            code: error.code,
            meta: error.meta,
            message: error.message,
        });

        switch (error.code) {
            case 'P2021': // Table does not exist
                throw new Error(
                    `A required database table is missing. Please contact the system administrator to run pending migrations.`
                );
            case 'P2003': // Foreign key constraint failed
                throw new Error(
                    `A referenced record does not exist. Please verify the linked data and try again.`
                );
            case 'P2002': // Unique constraint violation
                throw new Error(
                    `A duplicate record already exists. Please check your request and try again.`
                );
            default:
                throw new Error(
                    `A database error occurred while processing your request. Please try again later.`
                );
        }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        logger.error(`Prisma validation error in ${context}`, { message: error.message });
        throw new Error(`Invalid data provided. Please verify all required fields and try again.`);
    }

    // Re-throw non-Prisma errors (business logic) unchanged
    throw error;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateLeaveInput {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl?: string;
    attachmentMetadata?: {
        userId: number;
        fileName: string;
        fileType: string;
        publicId?: string;
    };
}

interface ReviewInput {
    decision: 'APPROVED' | 'REJECTED';
    comment?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Count calendar days inclusive */
const calculateDays = (start: Date, end: Date): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/** Determine which stage comes after dept-head approval based on leave type */
const getNextStage = (leaveType: LeaveType): LeaveStage => {
    switch (leaveType) {
        case LeaveType.SABBATICAL:
        case LeaveType.RESEARCH:
        case LeaveType.UNPAID:
            return LeaveStage.DEAN;
        default:
            return LeaveStage.HR_OFFICER;
    }
};

/** Which leave types require balance deduction on final approval */
const BALANCE_DEDUCTING_TYPES = new Set<LeaveType>([
    LeaveType.ANNUAL,
    LeaveType.SICK,
    LeaveType.PERSONAL,
]);

/** Which leave types require an attached document */
const DOCUMENT_REQUIRED_TYPES = new Set<LeaveType>([
    LeaveType.MATERNITY,
    LeaveType.PATERNITY,
    LeaveType.SICK,
    LeaveType.STUDY,
    LeaveType.RESEARCH,
]);

// ─── Create Leave Request ─────────────────────────────────────────────────────

export const createLeaveRequest = async (
    employeeId: number,
    data: CreateLeaveInput
) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end < start) {
        throw new Error('End date must be after start date');
    }

    const days = calculateDays(start, end);
    const year = start.getFullYear();

    // Fetch employee for eligibility checks
    const emp = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
            campusId: true,
            departmentId: true,
            department: { select: { headEmployeeId: true } },
        },
    });
    if (!emp) throw new Error('Employee record not found');

    const campusId = emp.campusId ?? null;

    // ── Document requirement check
    if (DOCUMENT_REQUIRED_TYPES.has(data.leaveType) && !data.attachmentUrl) {
        throw new Error(
            `A supporting document (medical certificate / proof) is required for ${data.leaveType} leave`
        );
    }

    // ── Duration / max-days guard
    const maxDays: Partial<Record<LeaveType, number>> = {
        [LeaveType.ANNUAL]: 30,
        [LeaveType.PATERNITY]: 10,
        [LeaveType.PERSONAL]: 3,
        [LeaveType.RESEARCH]: 180,   // ~6 months
        [LeaveType.SABBATICAL]: 365, // 1 year
        [LeaveType.STUDY]: 730,      // 2 years
        [LeaveType.MATERNITY]: 120,  // 30 prenatal + 90 postnatal
        [LeaveType.SICK]: 240,       // 6+2 months
    };
    const max = maxDays[data.leaveType];
    if (max !== undefined && days > max) {
        throw new Error(`${data.leaveType} leave cannot exceed ${max} days`);
    }

    // ── Balance check (only for balance-deducting types)
    if (BALANCE_DEDUCTING_TYPES.has(data.leaveType)) {
        // getLeaveBalances auto-creates the record with defaults if it doesn't exist
        const balance = await getLeaveBalances(employeeId, year);

        const fieldMap: Record<string, string> = {
            [LeaveType.ANNUAL]: 'annualBalance',
            [LeaveType.SICK]: 'sickBalance',
            [LeaveType.PERSONAL]: 'personalBalance',
        };
        const field = fieldMap[data.leaveType];
        if (field && balance) {
            const available = (balance as any)[field] as number;
            if (available < days) {
                throw new Error(
                    `Insufficient ${data.leaveType.toLowerCase()} leave balance. Available: ${available} days, Requested: ${days} days`
                );
            }
        }
    }

    // ── Check for overlapping approved/pending requests
    const overlap = await prisma.leaveRequest.findFirst({
        where: {
            employeeId,
            status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
            AND: [
                { startDate: { lte: end } },
                { endDate: { gte: start } },
            ],
        },
    });
    if (overlap) {
        throw new Error('You already have a leave request overlapping these dates');
    }

    // Create the request — always starts at DEPT_HEAD stage.
    // Uses a transaction so LeaveRequest + LeaveDocument creation is atomic.
    try {
        const request = await prisma.$transaction(async (tx) => {
            const leaveRequest = await tx.leaveRequest.create({
                data: {
                    campusId,
                    employeeId,
                    leaveType: data.leaveType,
                    startDate: start,
                    endDate: end,
                    days,
                    reason: data.reason,
                    attachmentUrl: data.attachmentUrl,
                    status: LeaveStatus.PENDING,
                    currentStage: LeaveStage.DEPT_HEAD,
                },
            });

            // Create the document record separately (not nested) for better error isolation.
            if (data.attachmentMetadata) {
                await tx.leaveDocument.create({
                    data: {
                        userId: data.attachmentMetadata.userId,
                        leaveRequestId: leaveRequest.id,
                        leaveType: data.leaveType,
                        fileUrl: data.attachmentUrl || '',
                        fileName: data.attachmentMetadata.fileName,
                        fileType: data.attachmentMetadata.fileType,
                        publicId: data.attachmentMetadata.publicId || null,
                    },
                });
            }

            // Re-fetch with includes for the response
            return tx.leaveRequest.findUniqueOrThrow({
                where: { id: leaveRequest.id },
                include: {
                    employee: { select: { name: true, deptLegacy: true, departmentId: true } },
                    leaveDocument: true,
                },
            });
        });

        logger.info('Leave request created', { requestId: request.id, leaveType: data.leaveType, employeeId });
        return request;
    } catch (error) {
        handlePrismaError(error, 'createLeaveRequest');
    }
};

// ─── Read helpers ─────────────────────────────────────────────────────────────

export const getEmployeeRequests = async (employeeId: number) => {
    return prisma.leaveRequest.findMany({
        where: { employeeId },
        include: {
            employee: { select: { name: true, deptLegacy: true } },
            approvals: { orderBy: { timestamp: 'asc' } },
            leaveDocument: true,
        },
        orderBy: { createdAt: 'desc' },
    });
};

/** Department Head: pending requests in their own department */
export const getDeptHeadPending = async (headDepartmentId: number | null) => {
    if (!headDepartmentId) return [];
    return prisma.leaveRequest.findMany({
        where: {
            employee: { departmentId: headDepartmentId },
        },
        include: {
            employee: { select: { name: true, deptLegacy: true, position: true } },
            leaveDocument: true,
            approvals: { orderBy: { timestamp: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
    });
};

/** HR Officer: requests forwarded to HR stage on their campus */
export const getHROfficerPending = async (campusId: number | null) => {
    return prisma.leaveRequest.findMany({
        where: {
            status: LeaveStatus.PENDING,
            currentStage: LeaveStage.HR_OFFICER,
            ...(campusId ? { campusId } : {}),
        },
        include: {
            employee: { select: { name: true, deptLegacy: true, position: true } },
            leaveDocument: true,
        },
        orderBy: { createdAt: 'asc' },
    });
};

/** Dean (DEAN privilege): pending SABBATICAL, RESEARCH, and UNPAID leaves on their campus */
export const getDeanPending = async (campusId: number | null) => {
    return prisma.leaveRequest.findMany({
        where: {
            status: LeaveStatus.PENDING,
            currentStage: LeaveStage.DEAN,
            leaveType: { in: [LeaveType.SABBATICAL, LeaveType.RESEARCH, LeaveType.UNPAID] },
            ...(campusId ? { campusId } : {}),
        },
        include: {
            employee: { select: { name: true, deptLegacy: true, position: true } },
            leaveDocument: true,
        },
        orderBy: { createdAt: 'asc' },
    });
};

/** Academic Vice President (VICE_PRESIDENT privilege): pending SABBATICAL/RESEARCH/UNPAID leaves university-wide */
export const getVPPending = async () => {
    return prisma.leaveRequest.findMany({
        where: {
            status: LeaveStatus.PENDING,
            currentStage: LeaveStage.VICE_PRESIDENT,
            leaveType: { in: [LeaveType.SABBATICAL, LeaveType.RESEARCH, LeaveType.UNPAID] },
        },
        include: {
            employee: { select: { name: true, deptLegacy: true, position: true } },
            leaveDocument: true,
        },
        orderBy: { createdAt: 'asc' },
    });
};

/** HR Officer: ALL requests on their campus (for record-keeping view) */
export const getAllCampusRequests = async (campusId: number | null, status?: LeaveStatus) => {
    return prisma.leaveRequest.findMany({
        where: {
            ...(campusId ? { campusId } : {}),
            ...(status ? { status } : {}),
        },
        include: {
            employee: { select: { name: true, deptLegacy: true, position: true } },
            approvals: { orderBy: { timestamp: 'asc' } },
            leaveDocument: true,
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getLeaveRequestById = async (id: number) => {
    return prisma.leaveRequest.findUnique({
        where: { id },
        include: {
            employee: { select: { name: true, deptLegacy: true, position: true, departmentId: true } },
            approvals: { orderBy: { timestamp: 'asc' } },
            leaveDocument: true,
        },
    });
};

export const getLeaveBalances = async (employeeId: number, year: number) => {
    // Fetch the employee to determine gender and campus for gender-specific allocations
    const emp = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { campusId: true, gender: true, serviceYears: true },
    });

    // Annual balance scales with service: base 20, +1 per year, capped at 30
    const annualDefault = Math.min(
        LEAVE_BALANCES.ANNUAL + (emp?.serviceYears ?? 0),
        30
    );

    return prisma.leaveBalance.upsert({
        where: { employeeId_year: { employeeId, year } },
        update: {},  // No-op if record already exists — preserve current balances
        create: {
            employeeId,
            year,
            campusId: emp?.campusId ?? null,
            annualBalance: annualDefault,
            sickBalance: LEAVE_BALANCES.SICK,
            maternityBalance: emp?.gender === 'FEMALE' ? LEAVE_BALANCES.MATERNITY : 0,
            paternityBalance: emp?.gender === 'MALE' ? LEAVE_BALANCES.PATERNITY : 0,
            personalBalance: LEAVE_BALANCES.PERSONAL,
        },
    });
};

// ─── Stage 1: Department Head Review ─────────────────────────────────────────

export const deptHeadReview = async (
    requestId: number,
    actorUserId: number,          // user.id (not employee.id)
    actorDepartmentId: number | null,
    input: ReviewInput
) => {
    return prisma.$transaction(async (tx) => {
        const request = await tx.leaveRequest.findUnique({
            where: { id: requestId },
            include: { employee: { select: { name: true, departmentId: true } } },
        });

        if (!request) throw new Error('Leave request not found');
        if (request.status !== LeaveStatus.PENDING) {
            throw new Error(`Cannot review: request is already ${request.status}`);
        }
        if (request.currentStage !== LeaveStage.DEPT_HEAD) {
            throw new Error('This request is not pending department head review');
        }

        // Department scope check
        if (actorDepartmentId && request.employee.departmentId !== actorDepartmentId) {
            logger.warn('Dept head tried to review request from another department', {
                requestId, actorDepartmentId, employeeDeptId: request.employee.departmentId,
            });
            throw new Error('You can only review leave requests from your own department');
        }

        const now = new Date();

        if (input.decision === 'REJECTED') {
            const updated = await tx.leaveRequest.update({
                where: { id: requestId },
                data: {
                    status: LeaveStatus.REJECTED,
                    deptHeadId: actorUserId,
                    deptHeadComment: input.comment,
                    deptHeadDecisionAt: now,
                    lastDecisionAt: now,
                    resolvedAt: now,
                },
            });

            await tx.leaveApproval.create({
                data: {
                    leaveId: requestId,
                    stage: LeaveStage.DEPT_HEAD,
                    actorId: actorUserId,
                    decision: 'REJECTED',
                    comment: input.comment,
                },
            });

            return { request: updated, action: 'REJECTED' };
        }

        // APPROVED → advance to next stage
        const nextStage = getNextStage(request.leaveType);
        const updated = await tx.leaveRequest.update({
            where: { id: requestId },
            data: {
                currentStage: nextStage,
                deptHeadId: actorUserId,
                deptHeadComment: input.comment,
                deptHeadDecisionAt: now,
                lastDecisionAt: now,
            },
        });

        await tx.leaveApproval.create({
            data: {
                leaveId: requestId,
                stage: LeaveStage.DEPT_HEAD,
                actorId: actorUserId,
                decision: 'FORWARDED',
                comment: input.comment,
            },
        });

        logger.info('Dept head forwarded leave request', { requestId, nextStage });
        return { request: updated, action: 'FORWARDED', nextStage };
    });
};

// ─── Stage 2: Final Approver (HR / Dean / VP) ─────────────────────────────────

export const finalDecision = async (
    requestId: number,
    actorUserId: number,
    actorCampusId: number | null,
    actorPrivileges: string[],
    actorRole: string,
    decision: 'APPROVED' | 'REJECTED',
    comment?: string
) => {
    return prisma.$transaction(
        async (tx) => {
            const request = await tx.leaveRequest.findUnique({
                where: { id: requestId },
                include: { employee: true },
            });

            if (!request) throw new Error('Leave request not found');
            if (request.status !== LeaveStatus.PENDING) {
                throw new Error(`Cannot act: request is already ${request.status}`);
            }
            if (request.currentStage === LeaveStage.DEPT_HEAD) {
                throw new Error('This request is still awaiting department head review');
            }

            // ── Authority check: verify correct actor for the current stage
            const stage = request.currentStage;
            if (stage === LeaveStage.HR_OFFICER && actorRole !== 'HR_OFFICER') {
                throw new Error('Only HR Officers can give final approval for this leave type');
            }
            if (stage === LeaveStage.DEAN && !actorPrivileges.includes('DEAN')) {
                throw new Error('Only users with Dean privilege can review this leave');
            }
            if (stage === LeaveStage.VICE_PRESIDENT && !actorPrivileges.includes('VICE_PRESIDENT')) {
                throw new Error('Only the Academic Vice President can review this leave');
            }

            // ── Campus scope check (HR Officer and Dean are campus-scoped)
            if (
                (stage === LeaveStage.HR_OFFICER || stage === LeaveStage.DEAN) &&
                actorCampusId !== null &&
                request.campusId !== null &&
                request.campusId !== actorCampusId
            ) {
                throw new Error('Cross-campus access denied');
            }

            const now = new Date();

            if (decision === 'REJECTED') {
                const updated = await tx.leaveRequest.update({
                    where: { id: requestId },
                    data: {
                        status: LeaveStatus.REJECTED,
                        approverId: actorUserId,
                        approverComment: comment,
                        lastDecisionAt: now,
                        resolvedAt: now,
                    },
                });

                await tx.leaveApproval.create({
                    data: {
                        leaveId: requestId,
                        stage,
                        actorId: actorUserId,
                        decision: 'REJECTED',
                        comment,
                    },
                });

                return updated;
            }

            // ── MULTI-STAGE FORWARDING (Dean → Academic VP → HR Officer)
            let nextStage: LeaveStage | null = null;
            const complexTypes: LeaveType[] = [LeaveType.SABBATICAL, LeaveType.RESEARCH, LeaveType.UNPAID];

            if (stage === LeaveStage.DEAN && complexTypes.includes(request.leaveType)) {
                nextStage = LeaveStage.VICE_PRESIDENT;
            } else if (stage === LeaveStage.VICE_PRESIDENT && complexTypes.includes(request.leaveType)) {
                nextStage = LeaveStage.HR_OFFICER;
            }

            // ── FORWARD TO NEXT STAGE (if applicable)
            if (nextStage) {
                const updated = await tx.leaveRequest.update({
                    where: { id: requestId },
                    data: {
                        currentStage: nextStage,
                        lastDecisionAt: now,
                    },
                });

                await tx.leaveApproval.create({
                    data: {
                        leaveId: requestId,
                        stage,
                        actorId: actorUserId,
                        decision: 'FORWARDED',
                        comment,
                    },
                });

                logger.info(`Leave request forwarded to ${nextStage}`, { requestId, stage, actorUserId });
                return updated;
            }

            // ── FINAL APPROVAL: deduct balance if applicable
            if (BALANCE_DEDUCTING_TYPES.has(request.leaveType)) {
                const year = request.startDate.getFullYear();
                const balanceFieldMap: Record<string, string> = {
                    [LeaveType.ANNUAL]: 'annualBalance',
                    [LeaveType.SICK]: 'sickBalance',
                    [LeaveType.PERSONAL]: 'personalBalance',
                };
                const field = balanceFieldMap[request.leaveType];
                if (field) {
                    const updateResult = await tx.leaveBalance.updateMany({
                        where: {
                            employeeId: request.employeeId,
                            year,
                            [field]: { gte: request.days },
                        },
                        data: { [field]: { decrement: request.days } },
                    });
                    if (updateResult.count === 0) {
                        throw new Error('Insufficient leave balance at time of approval');
                    }
                }
            }

            const updated = await tx.leaveRequest.update({
                where: { id: requestId },
                data: {
                    status: LeaveStatus.APPROVED,
                    approverId: actorUserId,
                    approverComment: comment,
                    lastDecisionAt: now,
                    resolvedAt: now,
                },
            });

            await tx.leaveApproval.create({
                data: {
                    leaveId: requestId,
                    stage,
                    actorId: actorUserId,
                    decision: 'APPROVED',
                    comment,
                },
            });

            logger.info('Leave request finally approved', { requestId, stage, actorUserId });

            // Automatically send Sabbatical, Research, and Without Pay leaves to Finance
            if (['SABBATICAL', 'RESEARCH', 'UNPAID'].includes(request.leaveType)) {
                let paymentInstruction: 'Full Pay' | 'Partial Pay' | 'No Pay' = 'No Pay';
                if (request.leaveType === 'SABBATICAL') paymentInstruction = 'Full Pay';
                if (request.leaveType === 'RESEARCH') paymentInstruction = 'Full Pay'; // Default to full pay for Research as per spec
                
                await sendLeaveToFinance({
                    employeeDetails: request.employee,
                    leaveType: request.leaveType,
                    durationDays: request.days,
                    paymentInstruction
                });
            }

            return updated;
        },
        { isolationLevel: 'Serializable' }
    );
};

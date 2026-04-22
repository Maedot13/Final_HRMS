
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const canApproveForUnit = async (
    userId: number,
    unitId: number
): Promise<boolean> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true }
    });

    if (!user) return false;

    // Admin can approve any unit
    if (user.role === UserRole.ADMIN) return true;

    const unit = await prisma.clearanceUnit.findUnique({
        where: { id: unitId }
    });

    if (!unit) return false;

    const unitName = unit.name.toUpperCase();

    // Role-based unit authorization
    switch (user.role) {
        case UserRole.CLEARANCE_BODY:
            // They can approve only for their designated unit
            return user.clearanceUnitId === unitId;

        case UserRole.HR_OFFICER:
            return unitName === 'HR' || unitName === 'HUMAN RESOURCES';

        case UserRole.FINANCE_OFFICER:
            return unitName === 'FINANCE';

        case UserRole.DEPARTMENT_HEAD:
            // Can approve if unit matches their department
            // We assume department names in Employee profile match Unit names
            return user.employee?.deptLegacy.toUpperCase() === unitName;

        default:
            return false;
    }
};

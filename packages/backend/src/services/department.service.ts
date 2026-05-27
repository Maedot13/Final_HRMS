import { prisma } from '../lib/prisma';
import { verifyToken, TokenPayload } from '../utils/token';
import { UserRole } from '@hrms/types';

export const createDepartment = async (
    dto: { name: string; headEmployeeId?: string },
    requestor: TokenPayload
) => {
    const campusId = requestor.campusId;
    if (!campusId) throw new Error('No campus context found for user');

    // Unique name check within campus
    const existing = await prisma.department.findFirst({
        where: { name: dto.name, campusId }
    });
    if (existing) throw new Error(`Department '${dto.name}' already exists on this campus`);

    let headEmployee = null;
    if (dto.headEmployeeId) {
        headEmployee = await prisma.employee.findUnique({
            where: { employeeId: dto.headEmployeeId },
            include: { user: true }
        });
        if (!headEmployee) throw new Error('Employee not found');
        if (headEmployee.campusId !== campusId) throw new Error('Employee is from a different campus');

        // Check if employee is already a head of another department
        const alreadyHead = await prisma.department.findFirst({
            where: { headEmployeeId: headEmployee.id }
        });
        if (alreadyHead) throw new Error(`Employee ${dto.headEmployeeId} is already head of department '${alreadyHead.name}'`);
    }

    return prisma.$transaction(async (tx) => {
        const dept = await tx.department.create({
            data: {
                name: dto.name,
                campusId
            }
        });

        if (headEmployee) {
            await tx.department.update({
                where: { id: dept.id },
                data: { headEmployeeId: headEmployee.id }
            });
            // Elevate role to DEPARTMENT_HEAD if they are currently an employee
            if (headEmployee.user.role === UserRole.EMPLOYEE) {
                await tx.user.update({
                    where: { id: headEmployee.userId },
                    data: { role: UserRole.DEPARTMENT_HEAD }
                });
            }
        }

        return dept;
    });
};

export const getDepartments = async (campusId?: number) => {
    return prisma.department.findMany({
        where: campusId ? { campusId } : undefined,
        include: {
            head: {
                select: {
                    name: true,
                    employeeId: true,
                    position: true
                }
            },
            _count: {
                select: { employees: true }
            }
        },
        orderBy: { name: 'asc' }
    });
};

export const getDepartmentById = async (id: number, campusId: number) => {
    const dept = await prisma.department.findFirst({
        where: { id, campusId },
        include: {
            head: {
                select: {
                    name: true,
                    employeeId: true
                }
            },
            _count: {
                select: { employees: true }
            }
        }
    });
    if (!dept) throw new Error('Department not found');
    return dept;
};

export const updateDepartment = async (
    id: number,
    campusId: number,
    data: { name?: string }
) => {
    const dept = await prisma.department.findFirst({
        where: { id, campusId }
    });
    if (!dept) throw new Error('Department not found');

    if (data.name && data.name !== dept.name) {
        const existing = await prisma.department.findFirst({
            where: { name: data.name, campusId, NOT: { id } }
        });
        if (existing) throw new Error(`Another department with name '${data.name}' already exists`);
    }

    return prisma.department.update({
        where: { id },
        data
    });
};

export const deleteDepartment = async (id: number, campusId: number) => {
    const dept = await prisma.department.findFirst({
        where: { id, campusId },
        include: {
            _count: {
                select: { employees: true }
            }
        }
    });

    if (!dept) throw new Error('Department not found');
    if (dept._count.employees > 0) {
        throw new Error(`Cannot delete: Department '${dept.name}' has ${dept._count.employees} active employees`);
    }

    return prisma.department.delete({
        where: { id }
    });
};

export const assignDepartmentHead = async (
    deptId: number,
    employeeId: string,
    campusId: number
) => {
    // 1. Find department and its current head
    const dept = await prisma.department.findFirst({
        where: { id: deptId, campusId },
        include: { head: { include: { user: true } } }
    });
    if (!dept) throw new Error('Department not found');

    // 2. Find new head employee
    const newHeadEmployee = await prisma.employee.findUnique({
        where: { employeeId },
        include: { user: true }
    });
    if (!newHeadEmployee) throw new Error('Employee not found');
    if (newHeadEmployee.campusId !== campusId) throw new Error('Employee is from a different campus');

    // 3. Check if they are already head of ANOTHER department
    const alreadyHeadOf = await prisma.department.findFirst({
        where: { headEmployeeId: newHeadEmployee.id, NOT: { id: deptId } }
    });
    if (alreadyHeadOf) {
        throw new Error(`Employee ${employeeId} is already head of department '${alreadyHeadOf.name}'`);
    }

    return prisma.$transaction(async (tx) => {
        // A. Demote old head if they exist and won't head any other department
        if (dept.head && dept.head.id !== newHeadEmployee.id) {
            const hasOtherDepts = await tx.department.count({
                where: { headEmployeeId: dept.head.id, NOT: { id: deptId } }
            });

            if (hasOtherDepts === 0 && dept.head.user.role === UserRole.DEPARTMENT_HEAD) {
                await tx.user.update({
                    where: { id: dept.head.userId },
                    data: { role: UserRole.EMPLOYEE }
                });
            }
        }

        // B. Promote new head if they are currently an employee
        if (newHeadEmployee.user.role === UserRole.EMPLOYEE) {
            await tx.user.update({
                where: { id: newHeadEmployee.userId },
                data: { role: UserRole.DEPARTMENT_HEAD }
            });
        }

        // C. Update Department
        return tx.department.update({
            where: { id: deptId },
            data: { headEmployeeId: newHeadEmployee.id },
            include: { head: { select: { name: true, employeeId: true } } }
        });
    });
};

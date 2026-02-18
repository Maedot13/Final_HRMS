
import { Employee } from '@prisma/client';
import { prisma } from '../lib/prisma';


export const getEmployeeById = async (id: number): Promise<Employee | null> => {
    return prisma.employee.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    role: true,
                    isActive: true,
                    createdAt: true
                }
            },
            leaveBalances: true
        }
    });
};

export const getEmployeeByUserId = async (userId: number): Promise<Employee | null> => {
    return prisma.employee.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    role: true,
                    isActive: true,
                    createdAt: true
                }
            },
            leaveBalances: true
        }
    });
};

export const updateEmployee = async (id: number, data: Partial<Employee>): Promise<Employee> => {
    // Exclude sensitive or primary key fields from update
    const updateData = { ...data };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (updateData as any).id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (updateData as any).userId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (updateData as any).employeeId;

    return prisma.employee.update({
        where: { id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: updateData as any
    });
};

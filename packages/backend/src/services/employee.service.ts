
import { PrismaClient, Employee } from '@prisma/client';
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
    const { id: _, userId: __, employeeId: ___, ...updateData } = data;
    return prisma.employee.update({
        where: { id },
        data: updateData as any
    });
};

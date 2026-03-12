
import { Employee } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';


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
    // Explicitly select allowed fields to prevent mass assignment / prototype pollution
    // We do NOT just delete from 'data' because 'data' might contain prototype properties
    const {
        name,
        deptLegacy,
        departmentId,
        position,
        hireDate,
        grossSalary,
        salaryType,
        contactInfo,
        officeLocation,
        employmentStatus,
        contractStartDate,
        contractEndDate,
        employmentType,
        payGrade,
        taxInformation,
        supervisorId
    } = data;

    // Create a clean object with only the fields we want to update
    // undefined values will be ignored by Prisma, but we should filter them out for clarity if needed
    // Prisma treats 'undefined' as 'do nothing' for nullable fields, but for required fields it might be rigorous
    const safeUpdateData: any = {};

    if (name !== undefined) safeUpdateData.name = name;
    if (deptLegacy !== undefined) safeUpdateData.deptLegacy = deptLegacy;
    if (departmentId !== undefined) safeUpdateData.departmentId = departmentId;
    if (position !== undefined) safeUpdateData.position = position;
    if (hireDate !== undefined) safeUpdateData.hireDate = hireDate;
    if (grossSalary !== undefined) safeUpdateData.grossSalary = grossSalary;
    if (salaryType !== undefined) safeUpdateData.salaryType = salaryType;
    if (contactInfo !== undefined) safeUpdateData.contactInfo = contactInfo;
    if (officeLocation !== undefined) safeUpdateData.officeLocation = officeLocation;
    if (employmentStatus !== undefined) safeUpdateData.employmentStatus = employmentStatus;
    if (contractStartDate !== undefined) safeUpdateData.contractStartDate = contractStartDate;
    if (contractEndDate !== undefined) safeUpdateData.contractEndDate = contractEndDate;
    if (employmentType !== undefined) safeUpdateData.employmentType = employmentType;
    if (payGrade !== undefined) safeUpdateData.payGrade = payGrade;
    if (taxInformation !== undefined) safeUpdateData.taxInformation = taxInformation;
    if (supervisorId !== undefined) safeUpdateData.supervisorId = supervisorId;

    const updatedEmployee = await prisma.employee.update({
        where: { id },
        data: safeUpdateData
    });

    // Invalidate cache
    if (updatedEmployee.userId) {
        await redis.del(`employee:${updatedEmployee.userId}`);
    }

    return updatedEmployee;
};

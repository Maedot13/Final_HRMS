
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
        supervisorId,
        gender,
        staffType,
        isMarried,
        academicRank,
        sabbaticalEligible,
        researchLeaveEligible,
        studyLeaveEligible,
    } = data as any;

    // Prisma DateTime fields require Date objects, not plain date strings like "2026-05-26"
    const toDate = (v: unknown): Date | undefined => {
        if (v === null || v === undefined || v === '') return undefined;
        if (v instanceof Date) return v;
        if (typeof v === 'string') {
            const d = new Date(v);
            if (!isNaN(d.getTime())) return d;
        }
        return undefined;
    };

    const safeUpdateData: any = {};

    if (name !== undefined) safeUpdateData.name = name;
    if (deptLegacy !== undefined) safeUpdateData.deptLegacy = deptLegacy;
    if (departmentId !== undefined) safeUpdateData.departmentId = departmentId;
    if (position !== undefined) safeUpdateData.position = position;
    if (hireDate !== undefined) { const d = toDate(hireDate); if (d) safeUpdateData.hireDate = d; }
    if (grossSalary !== undefined) safeUpdateData.grossSalary = grossSalary;
    if (salaryType !== undefined) safeUpdateData.salaryType = salaryType;
    if (contactInfo !== undefined) safeUpdateData.contactInfo = contactInfo;
    if (officeLocation !== undefined) safeUpdateData.officeLocation = officeLocation;
    if (employmentStatus !== undefined) safeUpdateData.employmentStatus = employmentStatus;
    if (contractStartDate !== undefined) { const d = toDate(contractStartDate); if (d) safeUpdateData.contractStartDate = d; }
    if (contractEndDate !== undefined) { const d = toDate(contractEndDate); if (d) safeUpdateData.contractEndDate = d; }
    if (employmentType !== undefined) safeUpdateData.employmentType = employmentType;
    if (payGrade !== undefined) safeUpdateData.payGrade = payGrade;
    if (taxInformation !== undefined) safeUpdateData.taxInformation = taxInformation;
    if (supervisorId !== undefined) safeUpdateData.supervisorId = supervisorId;
    if (gender !== undefined) safeUpdateData.gender = gender;
    if (staffType !== undefined) safeUpdateData.staffType = staffType;
    if (isMarried !== undefined) safeUpdateData.isMarried = isMarried;
    if (academicRank !== undefined) safeUpdateData.academicRank = academicRank;
    if (sabbaticalEligible !== undefined) safeUpdateData.sabbaticalEligible = sabbaticalEligible;
    if (researchLeaveEligible !== undefined) safeUpdateData.researchLeaveEligible = researchLeaveEligible;
    if (studyLeaveEligible !== undefined) safeUpdateData.studyLeaveEligible = studyLeaveEligible;

    const existingEmployee = await prisma.employee.findUnique({ where: { id } });
    if (!existingEmployee) throw new Error('Employee not found');

    const finalStartDate = safeUpdateData.contractStartDate !== undefined ? safeUpdateData.contractStartDate : existingEmployee.contractStartDate;
    const finalEndDate = safeUpdateData.contractEndDate !== undefined ? safeUpdateData.contractEndDate : existingEmployee.contractEndDate;

    if (finalStartDate && finalEndDate) {
        if (new Date(finalEndDate) <= new Date(finalStartDate)) {
            throw new Error('Contract End Date must be greater than Contract Start Date');
        }
    }

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

import { prisma } from '../lib/prisma';
import { SpecialPrivilege } from '@prisma/client';

export const getFaculties = async (collegeId: number) => {
    return prisma.faculty.findMany({
        where: { collegeId },
        include: {
            dean: { select: { name: true, employeeId: true } },
            departments: { select: { id: true, name: true } },
        },
    });
};

/**
 * Returns all faculties belonging to any college in a given campus.
 * Used by the Admin role-assignment flow to populate the Faculty picker.
 */
export const getFacultiesByCampus = async (campusId: number) => {
    return prisma.faculty.findMany({
        where: { college: { campusId } },
        select: {
            id: true,
            name: true,
            college: { select: { id: true, name: true } },
        },
        orderBy: [{ college: { name: 'asc' } }, { name: 'asc' }],
    });
};

export const getFacultyById = async (id: number) => {
    const faculty = await prisma.faculty.findUnique({
        where: { id },
        include: {
            dean: { select: { name: true, employeeId: true } },
            departments: true,
            college: true,
        },
    });
    if (!faculty) throw new Error('Faculty not found');
    return faculty;
};

export const createFaculty = async (data: any, campusId: number) => {
    const college = await prisma.college.findFirst({
        where: { id: data.collegeId, campusId }
    });
    if (!college) throw new Error('College not found in your campus');

    const exists = await prisma.faculty.findUnique({
        where: { collegeId_name: { collegeId: data.collegeId, name: data.name } },
    });
    if (exists) throw new Error('Faculty with this name already exists in the college');

    let deanNumericId: number | null = null;
    if (data.deanEmployeeId) {
        const emp = await prisma.employee.findUnique({
            where: { employeeId: data.deanEmployeeId },
            include: { user: true },
        });
        if (!emp || !emp.user?.isActive || emp.campusId !== campusId) {
            throw new Error('Valid, active employee in the same campus not found');
        }
        deanNumericId = emp.id;
    }

    const newFaculty = await prisma.$transaction(async (tx) => {
        const f = await tx.faculty.create({
            data: {
                collegeId: data.collegeId,
                name: data.name,
                description: data.description,
                deanEmployeeId: deanNumericId,
            },
        });

        if (deanNumericId) {
            const emp = await tx.employee.findUnique({ where: { id: deanNumericId }, include: { user: true } });
            if (emp?.user) {
                const currentPrivs = emp.user.specialPrivileges || [];
                if (!currentPrivs.includes(SpecialPrivilege.DEAN)) {
                    await tx.user.update({
                        where: { id: emp.user.id },
                        data: { specialPrivileges: { set: [...currentPrivs, SpecialPrivilege.DEAN] } },
                    });
                }
            }
        }
        return f;
    });

    return newFaculty;
};

export const updateFaculty = async (id: number, campusId: number, data: any) => {
    const existing = await getFacultyById(id);
    if (existing.college.campusId !== campusId) throw new Error('Faculty not found in your campus');
    
    if (data.name && data.name !== existing.name) {
        const duplicate = await prisma.faculty.findUnique({
            where: { collegeId_name: { collegeId: existing.collegeId, name: data.name } },
        });
        if (duplicate) throw new Error('Faculty with this name already exists');
    }

    return prisma.faculty.update({
        where: { id },
        data,
    });
};

export const deleteFaculty = async (id: number, campusId: number) => {
    const existing = await getFacultyById(id);
    if (existing.college.campusId !== campusId) throw new Error('Faculty not found in your campus');
    
    if (existing.departments.length > 0) {
        throw new Error('Cannot delete Faculty with existing departments');
    }
    
    await prisma.$transaction(async (tx) => {
        if (existing.deanEmployeeId) {
            const emp = await tx.employee.findUnique({ where: { id: existing.deanEmployeeId }, include: { user: true } });
            if (emp?.user) {
                const otherColleges = await tx.college.count({ where: { deanEmployeeId: existing.deanEmployeeId } });
                const otherFaculties = await tx.faculty.count({ where: { deanEmployeeId: existing.deanEmployeeId, id: { not: id } } });
                if (otherColleges === 0 && otherFaculties === 0) {
                    const newPrivs = (emp.user.specialPrivileges || []).filter(p => p !== SpecialPrivilege.DEAN);
                    await tx.user.update({
                        where: { id: emp.user.id },
                        data: { specialPrivileges: { set: newPrivs } },
                    });
                }
            }
        }
        await tx.faculty.delete({ where: { id } });
    });
    
    return { success: true };
};

export const assignFacultyDean = async (id: number, campusId: number, employeeId: string | null) => {
    const faculty = await getFacultyById(id);
    if (faculty.college.campusId !== campusId) throw new Error('Faculty not found in your campus');

    return prisma.$transaction(async (tx) => {
        const oldDeanId = faculty.deanEmployeeId;
        
        let newDeanNumericId: number | null = null;
        let newDeanEmp: any = null;

        if (employeeId) {
            newDeanEmp = await tx.employee.findUnique({
                where: { employeeId },
                include: { user: true },
            });
            if (!newDeanEmp || !newDeanEmp.user?.isActive || newDeanEmp.campusId !== campusId) {
                throw new Error('Valid, active employee in the same campus not found');
            }
            newDeanNumericId = newDeanEmp.id;
        }

        const updated = await tx.faculty.update({
            where: { id },
            data: { deanEmployeeId: newDeanNumericId },
        });

        if (newDeanEmp?.user) {
            const currentPrivs = newDeanEmp.user.specialPrivileges || [];
            if (!currentPrivs.includes(SpecialPrivilege.DEAN)) {
                await tx.user.update({
                    where: { id: newDeanEmp.user.id },
                    data: { specialPrivileges: { set: [...currentPrivs, SpecialPrivilege.DEAN] } },
                });
            }
        }

        if (oldDeanId && oldDeanId !== newDeanNumericId) {
            const oldEmp = await tx.employee.findUnique({ where: { id: oldDeanId }, include: { user: true } });
            if (oldEmp?.user) {
                const otherColleges = await tx.college.count({ where: { deanEmployeeId: oldDeanId } });
                const otherFaculties = await tx.faculty.count({ where: { deanEmployeeId: oldDeanId } });
                if (otherColleges === 0 && otherFaculties === 0) {
                    const newPrivs = (oldEmp.user.specialPrivileges || []).filter(p => p !== SpecialPrivilege.DEAN);
                    await tx.user.update({
                        where: { id: oldEmp.user.id },
                        data: { specialPrivileges: { set: newPrivs } },
                    });
                }
            }
        }

        return updated;
    });
};

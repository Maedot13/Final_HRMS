import { prisma } from '../lib/prisma';
import { SpecialPrivilege } from '@prisma/client';

export const getColleges = async (campusId: number) => {
    return prisma.college.findMany({
        where: { campusId },
        include: {
            dean: { select: { name: true, employeeId: true } },
            faculties: { select: { id: true, name: true } },
        },
    });
};

export const getCollegeById = async (id: number, campusId: number) => {
    const college = await prisma.college.findFirst({
        where: { id, campusId },
        include: {
            dean: { select: { name: true, employeeId: true } },
            faculties: true,
        },
    });
    if (!college) throw new Error('College not found');
    return college;
};

export const createCollege = async (data: any, campusId: number) => {
    const exists = await prisma.college.findUnique({
        where: { campusId_name: { campusId, name: data.name } },
    });
    if (exists) throw new Error('College with this name already exists');

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

    const newCollege = await prisma.$transaction(async (tx) => {
        const c = await tx.college.create({
            data: {
                campusId,
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
        return c;
    });

    return newCollege;
};

export const updateCollege = async (id: number, campusId: number, data: any) => {
    const existing = await getCollegeById(id, campusId);
    
    if (data.name && data.name !== existing.name) {
        const duplicate = await prisma.college.findUnique({
            where: { campusId_name: { campusId, name: data.name } },
        });
        if (duplicate) throw new Error('College with this name already exists');
    }

    return prisma.college.update({
        where: { id },
        data,
    });
};

export const deleteCollege = async (id: number, campusId: number) => {
    const existing = await getCollegeById(id, campusId);
    if (existing.faculties.length > 0) {
        throw new Error('Cannot delete College with existing faculties');
    }
    
    // Check if any departments belong to this college indirectly if we wanted to restrict, 
    // but faculties are empty so it should be fine.
    
    await prisma.$transaction(async (tx) => {
        if (existing.deanEmployeeId) {
            // Remove dean privilege if they don't dean anything else
            const emp = await tx.employee.findUnique({ where: { id: existing.deanEmployeeId }, include: { user: true } });
            if (emp?.user) {
                const otherColleges = await tx.college.count({ where: { deanEmployeeId: existing.deanEmployeeId, id: { not: id } } });
                const otherFaculties = await tx.faculty.count({ where: { deanEmployeeId: existing.deanEmployeeId } });
                if (otherColleges === 0 && otherFaculties === 0) {
                    const newPrivs = (emp.user.specialPrivileges || []).filter(p => p !== SpecialPrivilege.DEAN);
                    await tx.user.update({
                        where: { id: emp.user.id },
                        data: { specialPrivileges: { set: newPrivs } },
                    });
                }
            }
        }
        await tx.college.delete({ where: { id } });
    });
    
    return { success: true };
};

export const assignCollegeDean = async (id: number, campusId: number, employeeId: string | null) => {
    const college = await getCollegeById(id, campusId);

    return prisma.$transaction(async (tx) => {
        const oldDeanId = college.deanEmployeeId;
        
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

        const updated = await tx.college.update({
            where: { id },
            data: { deanEmployeeId: newDeanNumericId },
        });

        // Add privilege to new dean
        if (newDeanEmp?.user) {
            const currentPrivs = newDeanEmp.user.specialPrivileges || [];
            if (!currentPrivs.includes(SpecialPrivilege.DEAN)) {
                await tx.user.update({
                    where: { id: newDeanEmp.user.id },
                    data: { specialPrivileges: { set: [...currentPrivs, SpecialPrivilege.DEAN] } },
                });
            }
        }

        // Revoke privilege from old dean if necessary
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

import { prisma } from '../lib/prisma';

export interface CreateCampusInput {
  code: string;
  name: string;
  description?: string;
  timezone?: string;
}

export interface UpdateCampusInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  timezone?: string;
}

export const getAllCampuses = async (activeOnly = false) => {
  return prisma.campus.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { code: 'asc' },
  });
};

export const getCampusById = async (id: number) => {
  return prisma.campus.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
          employees: true,
        },
      },
    },
  });
};

export const createCampus = async (data: CreateCampusInput) => {
  return prisma.campus.create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description?.trim() ?? null,
      timezone: data.timezone ?? 'Africa/Addis_Ababa',
    },
  });
};

export const updateCampus = async (id: number, data: UpdateCampusInput) => {
  return prisma.campus.update({
    where: { id },
    data: {
      ...(data.name != null && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() ?? null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
    },
  });
};

export const getCampusUsers = async (campusId: number) => {
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { id: true, code: true, name: true },
  });
  if (!campus) return null;

  const users = await prisma.user.findMany({
    where: { campusId },
    select: {
      id: true,
      employeeId: true,
      email: true,
      role: true,
      scope: true,
      isActive: true,
      createdAt: true,
      employee: {
        select: { name: true, department: true },
      },
    },
  });

  return { campus, users };
};

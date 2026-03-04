import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/password';
import { UserRole, UserScope } from '@hrms/types';
import * as emailService from './email.service';
import { logAction } from './auditLog.service';
import { AuditAction } from '@prisma/client';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Default clearance units auto-seeded for every new campus
const DEFAULT_CLEARANCE_UNITS = ['HR', 'Finance', 'Library', 'Registrar', 'IT'];

// Roles required before a campus can be activated
const REQUIRED_CAMPUS_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.HR_OFFICER,
  UserRole.FINANCE_OFFICER,
];

export interface CreateCampusInput {
  code: string;
  name: string;
  description?: string;
  timezone?: string;
  employeeIdPrefix: string;
  employeeNumericLength: number;
  initialAdmin: {
    employeeId: string;
    email: string;
    name: string;
    password?: string; // auto-generated if not provided
  };
}

export interface UpdateCampusInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  timezone?: string;
  employeeIdPrefix?: string;
  employeeNumericLength?: number;
}

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------
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
        select: { users: true, employees: true },
      },
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
      employee: { select: { name: true, deptLegacy: true } },
    },
  });

  return { campus, users };
};

// ---------------------------------------------------------------------------
// CAMPUS READINESS CHECK
// ---------------------------------------------------------------------------
export const getCampusReadiness = async (campusId: number) => {
  const [users, depts] = await Promise.all([
    prisma.user.findMany({
      where: { campusId, isActive: true },
      select: { role: true },
    }),
    prisma.department.findMany({
      where: { campusId },
      include: { _count: { select: { employees: true } }, head: true },
    }),
  ]);

  const roleSet = new Set(users.map((u) => u.role as UserRole));
  const missingCampusRoles = REQUIRED_CAMPUS_ROLES.filter((r) => !roleSet.has(r));

  const deptsWithoutHead = depts
    .filter((d) => d._count.employees > 0 && !d.headEmployeeId)
    .map((d) => d.name);

  const isReady = missingCampusRoles.length === 0 && deptsWithoutHead.length === 0;

  return { isReady, missingCampusRoles, deptsWithoutHead };
};

// ---------------------------------------------------------------------------
// CREATE — fully transactional
// ---------------------------------------------------------------------------
export const createCampus = async (
  dto: CreateCampusInput,
  creatorId: number
) => {
  // Pre-validate uniqueness outside the transaction (cheap reads, fast fail)
  const [codeExists, emailExists, empIdExists] = await Promise.all([
    prisma.campus.findUnique({ where: { code: dto.code.toUpperCase() } }),
    prisma.user.findUnique({ where: { email: dto.initialAdmin.email } }),
    prisma.user.findUnique({ where: { employeeId: dto.initialAdmin.employeeId } }),
  ]);

  if (codeExists) throw new Error('Campus code already exists');
  if (emailExists) throw new Error('Admin email already in use');
  if (empIdExists) throw new Error('Admin employee ID already in use');

  const tempPassword =
    dto.initialAdmin.password ?? crypto.randomBytes(12).toString('base64url');
  const passwordHash = await hashPassword(tempPassword);

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Create campus — inactive by default
      const campus = await tx.campus.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description?.trim() ?? null,
          timezone: dto.timezone ?? 'Africa/Addis_Ababa',
          isActive: false, // must be explicitly activated after staffing
          employeeIdPrefix: dto.employeeIdPrefix.trim().toUpperCase(),
          employeeNumericLength: dto.employeeNumericLength,
        },
      });

      // 2. Auto-seed system clearance units
      await tx.clearanceUnit.createMany({
        data: DEFAULT_CLEARANCE_UNITS.map((name) => ({
          name,
          campusId: campus.id,
          isSystemGenerated: true,
          isActive: true,
        })),
      });

      // 3. Create initial Campus Admin user
      const adminUser = await tx.user.create({
        data: {
          email: dto.initialAdmin.email.toLowerCase(),
          passwordHash,
          role: UserRole.ADMIN,
          scope: UserScope.CAMPUS,
          campusId: campus.id,
          employeeId: dto.initialAdmin.employeeId,
          mustChangePassword: true, // force password change on first login
          isActive: true,
        },
      });

      // 4. Create Campus Admin employee record
      await tx.employee.create({
        data: {
          userId: adminUser.id,
          employeeId: dto.initialAdmin.employeeId,
          name: dto.initialAdmin.name,
          deptLegacy: 'Administration',
          position: 'Campus Administrator',
          campusId: campus.id,
          hireDate: new Date(),
          contactInfo: {},
        },
      });

      return { campus, adminUser };
    },
    { isolationLevel: 'Serializable' }
  );

  // Async side-effects — fire and forget (never block the response on these)
  emailService
    .sendWelcomeEmail({
      to: result.adminUser.email,
      name: dto.initialAdmin.name,
      employeeId: dto.initialAdmin.employeeId,
      tempPassword
    })
    .catch((err: Error) =>
      logger.error('Campus admin welcome email failed', { error: err.message })
    );

  logAction({
    userId: creatorId,
    action: AuditAction.CAMPUS_CREATED,
    entityType: 'Campus',
    entityId: result.campus.id,
  }).catch((err: Error) => logger.error('Audit log failed on campus create', { error: err.message }));

  return {
    campus: result.campus,
    adminEmployeeId: dto.initialAdmin.employeeId,
    tempPassword, // returned ONCE only — never stored in plain text again
    warning:
      'Campus is inactive. Add HR Officer and Finance Officer, then activate via PATCH /campus/:id { isActive: true }.',
  };
};

// ---------------------------------------------------------------------------
// UPDATE — with activation readiness gate
// ---------------------------------------------------------------------------
export const updateCampus = async (id: number, data: UpdateCampusInput, updatedById?: number) => {
  const campus = await prisma.campus.findUnique({ where: { id } });
  if (!campus) throw new Error('Campus not found');

  if (data.employeeIdPrefix !== undefined || data.employeeNumericLength !== undefined) {
    if (campus.isPatternLocked) {
      throw new Error('Employee ID pattern is locked and cannot be changed.');
    }
  }

  // If activating a currently-inactive campus, enforce readiness
  if (data.isActive === true && !campus.isActive) {
    const readiness = await getCampusReadiness(id);
    if (!readiness.isReady) {
      const msgs: string[] = [];
      if (readiness.missingCampusRoles.length > 0) {
        msgs.push(`Missing roles: ${readiness.missingCampusRoles.join(', ')}`);
      }
      if (readiness.deptsWithoutHead.length > 0) {
        msgs.push(`Departments without head: ${readiness.deptsWithoutHead.join(', ')}`);
      }
      throw new Error(
        `Campus cannot be activated. ${msgs.join('. ')}`
      );
    }

    // Log activation
    if (updatedById) {
      logAction({
        userId: updatedById,
        action: AuditAction.CAMPUS_ACTIVATED,
        entityType: 'Campus',
        entityId: id,
      }).catch((err: Error) => logger.error('Audit log failed on campus activate', { error: err.message }));
    }
  }

  // If suspending (deactivating), log it
  if (data.isActive === false && updatedById) {
    logAction({
      userId: updatedById,
      action: AuditAction.CAMPUS_SUSPENDED,
      entityType: 'Campus',
      entityId: id,
    }).catch((err: Error) => logger.error('Audit log failed on campus suspend', { error: err.message }));
  }

  return prisma.campus.update({
    where: { id },
    data: {
      ...(data.name != null && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() ?? null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.employeeIdPrefix !== undefined && { employeeIdPrefix: data.employeeIdPrefix.trim().toUpperCase() }),
      ...(data.employeeNumericLength !== undefined && { employeeNumericLength: data.employeeNumericLength }),
    },
  });
};

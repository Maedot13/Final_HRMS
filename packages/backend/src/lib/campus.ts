/**
 * Multi-campus: resolve default campus (e.g. for new user/employee registration).
 * Phase 1: single default campus; Phase 2+ can use request context.
 */

import { prisma } from './prisma';

let defaultCampusIdCache: number | null = null;

/**
 * Get the default campus ID (first active campus by code).
 * Used when creating new users/employees when no campus is specified.
 */
export async function getDefaultCampusId(): Promise<number> {
  if (defaultCampusIdCache != null) {
    return defaultCampusIdCache;
  }
  const campus = await prisma.campus.findFirst({
    where: { isActive: true },
    orderBy: { code: 'asc' },
    select: { id: true },
  });
  if (!campus) {
    throw new Error('No active campus found. Run seed to create the default campus.');
  }
  defaultCampusIdCache = campus.id;
  return campus.id;
}

/**
 * Clear cached default campus (e.g. after seeding new campuses in tests).
 */
export function clearDefaultCampusCache(): void {
  defaultCampusIdCache = null;
}

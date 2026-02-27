import { Request } from 'express';
import { UserScope } from '@hrms/types';
import { logger } from '../utils/logger';

export type CampusScopeContext =
  | { scope: UserScope.UNIVERSITY; campusId: null; viewCampusId: number | null }
  | { scope: UserScope.CAMPUS; campusId: number };

/**
 * Get campus scope from JWT. For UNIVERSITY scope, optionally accepts X-Campus-Id header
 * or ?campusId= query to filter by a specific campus ("act as campus").
 */
export function getCampusScope(req: Request): CampusScopeContext {
  const scope = req.user?.scope ?? UserScope.CAMPUS;
  const campusId = req.user?.campusId ?? null;

  if (scope === UserScope.UNIVERSITY) {
    const raw = req.headers['x-campus-id'] ?? req.query.campusId;
    const parsed = raw != null ? parseInt(String(raw), 10) : NaN;
    const viewCampusId = !isNaN(parsed) && parsed > 0 ? parsed : null;
    return { scope: UserScope.UNIVERSITY, campusId: null, viewCampusId };
  }

  if (campusId == null) {
    logger.warn('Campus isolation: Missing campus context', {
      userId: req.user?.userId,
      role: req.user?.role,
      path: req.path,
      method: req.method,
    });
    throw new Error('Missing campus context for this user');
  }

  return { scope: UserScope.CAMPUS, campusId };
}

/**
 * Returns the campusId to filter by, or undefined for no filter.
 * For CAMPUS: always the user's campusId.
 * For UNIVERSITY: viewCampusId when X-Campus-Id/?campusId= is set, else undefined.
 */
export function getCampusIdFilter(ctx: CampusScopeContext): number | undefined {
  if (ctx.scope === UserScope.CAMPUS) return ctx.campusId;
  if (ctx.scope === UserScope.UNIVERSITY && 'viewCampusId' in ctx && ctx.viewCampusId != null) {
    return ctx.viewCampusId;
  }
  return undefined;
}

export function campusWhere(req: Request): { campusId?: number } {
  const ctx = getCampusScope(req);
  const filter = getCampusIdFilter(ctx);
  return filter != null ? { campusId: filter } : {};
}

export function assertSameCampus(req: Request, resourceCampusId: number | null | undefined): void {
  const ctx = getCampusScope(req);
  if (ctx.scope === UserScope.UNIVERSITY) return;
  if (resourceCampusId == null || resourceCampusId !== ctx.campusId) {
    logger.warn('Campus isolation: Cross-campus access denied', {
      userId: req.user?.userId,
      userCampusId: ctx.campusId,
      resourceCampusId: resourceCampusId ?? null,
      path: req.path,
      method: req.method,
    });
    throw new Error('Cross-campus access denied');
  }
}


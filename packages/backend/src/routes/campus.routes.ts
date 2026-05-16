import { Router } from 'express';
import * as campusController from '../controllers/campus.controller';
import { authenticate, requireUniversityAdmin, authorize } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes accessible by Campus Admin and HR (with campus isolation enforced in controller)
router.get('/:id/users',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    campusController.getCampusUsers
);

// Returns the authenticated user's own campus — accessible to all campus-scoped users
router.get('/mine', campusController.getMineCampus);

// All other campus management routes require university admin (ADMIN + scope: UNIVERSITY)
router.use(requireUniversityAdmin);

router.get('/', cacheMiddleware(60), campusController.getCampuses);
router.post('/', campusController.createCampus);
router.get('/:id', campusController.getCampusById);
router.get('/:id/readiness', campusController.getCampusReadiness);
router.patch('/:id', campusController.updateCampus);

export default router;

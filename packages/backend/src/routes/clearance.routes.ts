
import { Router } from 'express';
import * as clearanceController from '../controllers/clearance.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);

// Employees can initiate their own clearance
router.post('/requests', clearanceController.initiateClearance);

// Only authorized roles can view clearance details
router.get('/requests/:id',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD]),
    clearanceController.getClearance
);

// Only authorized roles can approve/reject checks
router.patch('/requests/:id/approve-check',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD]),
    clearanceController.approveCheck
);

router.patch('/requests/:id/reject-check',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD]),
    clearanceController.rejectCheck
);

// Only authorized roles can view pending checks
router.get('/units/:unitId/pending',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD]),
    clearanceController.getPendingChecksForUnit
);

export default router;

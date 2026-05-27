
import { Router } from 'express';
import * as appraisalController from '../controllers/appraisal.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Performance
 *   description: Performance Appraisal and Efficiency Monitoring
 */

// Employee view own appraisals
router.get(
    '/my',
    authorize([UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.CLEARANCE_BODY]),
    appraisalController.getMyAppraisals
);

router.get(
    '/automated-metrics',
    authorize([UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.CLEARANCE_BODY]),
    appraisalController.getAutomatedMetrics
);

// HR view specific employee appraisals
router.get(
    '/employee/:employeeId',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD]),
    appraisalController.getEmployeeAppraisals
);

// Create appraisal (Head fills form)
router.post(
    '/',
    authorize([UserRole.DEPARTMENT_HEAD]),
    appraisalController.createAppraisal
);

// Get pending appraisals for HR review
router.get(
    '/pending',
    authorize([UserRole.HR_OFFICER]),
    appraisalController.getPendingEvaluations
);

// Approve appraisal
router.post(
    '/:id/approve',
    authorize([UserRole.HR_OFFICER]),
    appraisalController.approveEvaluation
);

// Reject appraisal
router.post(
    '/:id/reject',
    authorize([UserRole.HR_OFFICER]),
    appraisalController.rejectEvaluation
);

// HR update appraisal
router.patch(
    '/:id',
    authorize([UserRole.HR_OFFICER]),
    appraisalController.updateAppraisal
);

export default router;


import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN, UserRole.HR_OFFICER]));

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Analytics and reporting
 */

/**
 * @swagger
 * /api/v1/reports/summary:
 *   get:
 *     summary: Get dashboard summary
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary data
 *       403:
 *         description: Forbidden
 */
router.get('/summary', reportController.getDashboardSummary);

/**
 * @swagger
 * /api/v1/reports/leave:
 *   get:
 *     summary: Get leave statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leave statistics
 *       403:
 *         description: Forbidden
 */
router.get('/leave', reportController.getLeaveStats);

/**
 * @swagger
 * /api/v1/reports/departments:
 *   get:
 *     summary: Get department statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Department statistics
 *       403:
 *         description: Forbidden
 */
router.get('/departments', reportController.getDepartmentStats);

/**
 * @swagger
 * /api/v1/reports/recruitment:
 *   get:
 *     summary: Get recruitment statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recruitment statistics
 *       403:
 *         description: Forbidden
 */
router.get('/recruitment', reportController.getRecruitmentStats);

export default router;

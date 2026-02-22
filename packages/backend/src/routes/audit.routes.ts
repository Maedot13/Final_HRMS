
import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);
router.use(authenticate);
// Removed global admin check to allow users to see their own logs

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Security audit logs
 */

/**
 * @swagger
 * /api/v1/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get('/', authorize([UserRole.ADMIN, UserRole.HR_OFFICER]), auditController.getAuditLogs);

/**
 * @swagger
 * /api/v1/audit-logs/my-logs:
 *   get:
 *     summary: Get current user's audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of own audit logs
 */
router.get('/my-logs', auditController.getMyLogs);

/**
 * @swagger
 * /api/v1/audit-logs/export:
 *   get:
 *     summary: Export audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs export
 */
router.get('/export', authorize([UserRole.ADMIN, UserRole.HR_OFFICER]), auditController.exportAuditLogs);

/**
 * @swagger
 * /api/v1/audit-logs/{id}:
 *   get:
 *     summary: Get specific audit log
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit log details
 *       404:
 *         description: Log not found
 */
router.get('/:id', authorize([UserRole.ADMIN, UserRole.HR_OFFICER]), auditController.getAuditLogById);

export default router;

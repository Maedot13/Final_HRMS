
import { Router } from 'express';
import * as clearanceController from '../controllers/clearance.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Clearance
 *   description: Clearance process management
 */

import { validateBody } from '../middleware/validate.middleware';
import { initiateClearanceSchema, approveCheckSchema, rejectCheckSchema } from '../schemas/clearance.schema';

/**
 * @swagger
 * /api/v1/clearance/requests:
 *   post:
 *     summary: Initiate clearance process
 *     tags: [Clearance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *               - lastWorkingDay
 *             properties:
 *               reason:
 *                 type: string
 *               lastWorkingDay:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Clearance initiated successfully
 *       400:
 *         description: Validation error or active clearance exists
 */
/**
 * @swagger
 * /api/v1/clearance/requests:
 *   get:
 *     summary: List clearance requests
 *     tags: [Clearance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, ALL]
 *     responses:
 *       200:
 *         description: List of clearance requests
 */
router.get('/requests',
    authorize([UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.FINANCE_OFFICER], ['DEAN', 'UNIVERSITY_PRESIDENT']),
    clearanceController.listClearanceRequests
);

router.post('/requests', authorize([UserRole.HR_OFFICER]), validateBody(initiateClearanceSchema), clearanceController.initiateClearance);

/**
 * @swagger
 * /api/v1/clearance/requests/{id}:
 *   get:
 *     summary: Get clearance request details
 *     tags: [Clearance]
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
 *         description: Clearance details with checks status
 *       404:
 *         description: Request not found
 */
router.get('/requests/:id',
    authorize([UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.FINANCE_OFFICER, UserRole.CLEARANCE_BODY, UserRole.ADMIN], ['DEAN', 'UNIVERSITY_PRESIDENT']),
    clearanceController.getClearance
);

/**
 * @swagger
 * /api/v1/clearance/requests/{id}/approve-check:
 *   patch:
 *     summary: Approve a clearance check for a specific unit
 *     tags: [Clearance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *             properties:
 *               unitId:
 *                 type: integer
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Check approved successfully
 *       403:
 *         description: Forbidden (Not authorized for this unit)
 */
router.patch('/requests/:id/approve-check',
    authorize([UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.FINANCE_OFFICER, UserRole.CLEARANCE_BODY]),
    validateBody(approveCheckSchema),
    clearanceController.approveCheck
);

/**
 * @swagger
 * /api/v1/clearance/requests/{id}/reject-check:
 *   patch:
 *     summary: Reject a clearance check for a specific unit
 *     tags: [Clearance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - comment
 *             properties:
 *               unitId:
 *                 type: integer
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Check rejected successfully
 */
router.patch('/requests/:id/reject-check',
    authorize([UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.FINANCE_OFFICER, UserRole.CLEARANCE_BODY]),
    validateBody(rejectCheckSchema),
    clearanceController.rejectCheck
);

router.patch('/requests/:id/hr-approve',
    authorize([UserRole.HR_OFFICER]),
    clearanceController.approveCampusHR
);

router.patch('/requests/:id/final-approve',
    clearanceController.finalApproveClearance
);

router.get('/requests/:id/certificate',
    authorize([UserRole.HR_OFFICER, UserRole.ADMIN]),
    clearanceController.generateCertificate
);

/**
 * @swagger
 * /api/v1/clearance/units/{unitId}/pending:
 *   get:
 *     summary: Get pending checks for a unit
 *     tags: [Clearance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of pending checks
 */
router.get('/units/:unitId/pending',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.FINANCE_OFFICER, UserRole.CLEARANCE_BODY]),
    clearanceController.getPendingChecksForUnit
);

router.get('/units',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    clearanceController.listClearanceUnits
);

router.post('/units',
    authorize([UserRole.ADMIN]),
    clearanceController.createClearanceUnit
);

router.patch('/units/:unitId',
    authorize([UserRole.ADMIN]),
    clearanceController.updateClearanceUnit
);

router.delete('/units/:unitId',
    authorize([UserRole.ADMIN]),
    clearanceController.deleteClearanceUnit
);

export default router;

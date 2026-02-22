
import { Router } from 'express';
import * as leaveController from '../controllers/leave.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { attachEmployee } from '../middleware/employee.middleware';
import { UserRole } from '@hrms/types';
import { validateBody } from '../middleware/validate.middleware';
import { createLeaveRequestSchema, approveRejectSchema } from '../schemas/leave.schema';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Leave
 *   description: Leave request management
 */

/**
 * @swagger
 * /api/v1/leave:
 *   post:
 *     summary: Create a new leave request
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leaveType
 *               - startDate
 *               - endDate
 *               - reason
 *             properties:
 *               leaveType:
 *                 type: string
 *                 enum: [ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *               attachmentUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Leave request created successfully
 *       400:
 *         description: Validation error or insufficient balance
 *   get:
 *     summary: Get current employee's leave requests
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of leave requests
 */
import { upload } from '../middleware/upload.middleware';

/**
 * @swagger
 * /api/v1/leave:
 *   post:
 *     summary: Create a new leave request
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - leaveType
 *               - startDate
 *               - endDate
 *               - reason
 *             properties:
 *               leaveType:
 *                 type: string
 *                 enum: [ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID]
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: YYYY-MM-DD or ISO datetime. Must not be in the past.
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: YYYY-MM-DD or ISO datetime. Must be after startDate.
 *               reason:
 *                 type: string
 *                 minLength: 5
 *               attachment:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Leave request created successfully
 *       400:
 *         description: Validation error or insufficient balance
 */
router.post('/', attachEmployee, upload.single('attachment'), validateBody(createLeaveRequestSchema), leaveController.createLeaveRequest);
router.get('/', attachEmployee, leaveController.getMyRequests);

/**
 * @swagger
 * /api/v1/leave/my:
 *   get:
 *     summary: Get current employee's leave requests (Alias)
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of leave requests
 */
router.get('/my', attachEmployee, leaveController.getMyRequests);

/**
 * @swagger
 * /api/v1/leave/pending:
 *   get:
 *     summary: Get all pending leave requests (Admin/HR/Dept Head)
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending leave requests
 *       403:
 *         description: Forbidden
 */
router.get('/pending',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD]),
    leaveController.getPendingRequests
);

/**
 * @swagger
 * /api/v1/leave/{id}/approve:
 *   patch:
 *     summary: Approve a leave request (Dept Head)
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave request approved
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Leave request not found
 */
router.patch('/:id/approve',
    authorize([UserRole.DEPARTMENT_HEAD]),
    attachEmployee,
    validateBody(approveRejectSchema),
    leaveController.approveRequest
);

/**
 * @swagger
 * /api/v1/leave/{id}/reject:
 *   patch:
 *     summary: Reject a leave request (Dept Head)
 *     tags: [Leave]
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
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave request rejected
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Leave request not found
 */
router.patch('/:id/reject',
    authorize([UserRole.DEPARTMENT_HEAD]),
    attachEmployee,
    validateBody(approveRejectSchema),
    leaveController.rejectRequest
);

export default router;


import { Router } from 'express';
import * as userController from '../controllers/userManagement.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);

// HR Officer can read user list; management actions require ADMIN or SUPER_ADMIN
router.get('/', authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HR_OFFICER]), userController.getAllUsers);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [User Management]
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
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HR_OFFICER]), userController.getUserById);

/**
 * @swagger
 * /api/v1/users/{id}/role:
 *   patch:
 *     summary: Update user role
 *     tags: [User Management]
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, HR_OFFICER, DEPARTMENT_HEAD, FINANCE_OFFICER, RECRUITMENT_COMMITTEE, EMPLOYEE]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch('/:id/role', authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]), userController.updateUserRole);

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Toggle user active status
 *     tags: [User Management]
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
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]), userController.toggleUserStatus);

/**
 * @swagger
 * /api/v1/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [User Management]
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
 *         description: Password reset successfully
 */
router.post('/:id/reset-password', authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]), userController.resetPassword);

export default router;

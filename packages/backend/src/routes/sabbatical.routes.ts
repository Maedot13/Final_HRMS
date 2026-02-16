
import { Router } from 'express';
import * as sabbaticalController from '../controllers/sabbatical.controller';
import { authenticate } from '../middleware/auth.middleware';
import { attachEmployee } from '../middleware/employee.middleware';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Sabbatical
 *   description: Sabbatical request management
 */

/**
 * @swagger
 * /api/v1/sabbatical:
 *   post:
 *     summary: Create a new sabbatical request
 *     tags: [Sabbatical]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purpose
 *               - startDate
 *               - endDate
 *               - plan
 *             properties:
 *               purpose:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               plan:
 *                 type: string
 *               planDocumentUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sabbatical request created successfully
 *       400:
 *         description: Validation error or eligibility failure
 *   get:
 *     summary: Get sabbatical requests (Own for employee, All for Admin/HR)
 *     tags: [Sabbatical]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sabbatical requests
 */
import { upload } from '../middleware/upload.middleware';

/**
 * @swagger
 * /api/v1/sabbatical:
 *   post:
 *     summary: Create a new sabbatical request
 *     tags: [Sabbatical]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - purpose
 *               - startDate
 *               - endDate
 *               - plan
 *             properties:
 *               purpose:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               plan:
 *                 type: string
 *               planDocument:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Sabbatical request created successfully
 *       400:
 *         description: Validation error or eligibility failure
 */
router.post('/', attachEmployee, upload.single('planDocument'), sabbaticalController.createSabbatical);
router.get('/', attachEmployee, sabbaticalController.getRequests);

/**
 * @swagger
 * /api/v1/sabbatical/{id}/approve:
 *   patch:
 *     summary: Approve a sabbatical request (Dept Head)
 *     tags: [Sabbatical]
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
 *         description: Sabbatical request approved
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Request not found
 */
router.patch('/:id/approve', attachEmployee, sabbaticalController.approveRequest);

/**
 * @swagger
 * /api/v1/sabbatical/{id}/reject:
 *   patch:
 *     summary: Reject a sabbatical request (Dept Head)
 *     tags: [Sabbatical]
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
 *         description: Sabbatical request rejected
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Request not found
 */
router.patch('/:id/reject', attachEmployee, sabbaticalController.rejectRequest);

export default router;

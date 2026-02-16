
import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes here require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Employee
 *   description: Employee profile management
 */

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   get:
 *     summary: Get employee profile
 *     tags: [Employee]
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
 *         description: Employee details
 *       404:
 *         description: Employee not found
 */
import { validateBody } from '../middleware/validate.middleware';
import { updateEmployeeSchema } from '../schemas/employee.schema';

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   get:
 *     summary: Get employee profile
 *     tags: [Employee]
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
 *         description: Employee details
 *       404:
 *         description: Employee not found
 */
router.get('/:id', employeeController.getEmployee);

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   patch:
 *     summary: Update employee profile
 *     tags: [Employee]
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
 *             properties:
 *               name:
 *                 type: string
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               contactInfo:
 *                 type: object
 *     responses:
 *       200:
 *         description: Employee updated
 *       403:
 *         description: Forbidden
 */
router.patch('/:id', validateBody(updateEmployeeSchema), employeeController.updateEmployee);

export default router;

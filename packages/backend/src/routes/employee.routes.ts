
import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { UserRole } from '@hrms/types';

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
// List employees in the campus
router.get(
    '/',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD], ['DEAN', 'UNIVERSITY_PRESIDENT']),
    employeeController.listEmployees
);

// Create a new employee (delegates to auth.register internally)
router.post(
    '/',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    employeeController.createEmployee
);

router.get('/:id', authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD, UserRole.FINANCE_OFFICER, UserRole.EMPLOYEE], ['DEAN', 'UNIVERSITY_PRESIDENT']), employeeController.getEmployee);

// Activate / deactivate an employee account
router.post(
    '/:id/activate',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    employeeController.activateEmployee
);

// Upload documents for an employee
router.post(
    '/:id/documents',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    upload.single('document'),
    employeeController.uploadDocument
);

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
 *                 description: JSON object with contact details
 *               hireDate:
 *                  type: string
 *                  format: date-time
 *               grossSalary:
 *                  type: number
 *               salaryType:
 *                  type: string
 *                  enum: [MONTHLY, DAILY]
 *     responses:
 *       200:
 *         description: Employee updated
 *       403:
 *         description: Forbidden
 */
router.patch('/:id', authorize([UserRole.ADMIN, UserRole.HR_OFFICER]), employeeController.updateEmployee);

export default router;

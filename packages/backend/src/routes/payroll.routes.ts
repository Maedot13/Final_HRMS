
import { Router } from 'express';
import * as payrollController from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Payroll
 *   description: Payroll data management
 */

import { validate } from '../middleware/validate.middleware';
import { payrollDataTransferSchema } from '../schemas/payroll.schema';

/**
 * @swagger
 * /api/v1/payroll/data-transfer:
 *   get:
 *     summary: Get payroll data transfer
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Month (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *         description: Year (e.g., 2024)
 *     responses:
 *       200:
 *         description: Payroll data
 *       400:
 *         description: Missing month or year
 */
router.get('/data-transfer', validate(payrollDataTransferSchema), payrollController.getPayrollData);

export default router;

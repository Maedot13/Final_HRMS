
import { Router } from 'express';
import * as payrollController from '../controllers/payroll.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

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

router.get('/data-transfer',
    authorize([UserRole.FINANCE_OFFICER, UserRole.HR_OFFICER]),
    payrollController.getPayrollData
);

/**
 * @swagger
 * /api/v1/payroll/generate:
 *   get:
 *     summary: Generate and download payroll Excel
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 */
router.get('/generate',
    authorize([UserRole.HR_OFFICER]),
    payrollController.generatePayrollExcel
);

/**
 * @swagger
 * /api/v1/payroll/send-to-finance:
 *   post:
 *     summary: Send payroll report to Finance
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [month, year]
 *             properties:
 *               month: { type: integer }
 *               year: { type: integer }
 */
router.post('/send-to-finance',
    authorize([UserRole.HR_OFFICER]),
    payrollController.sendToFinance
);

/**
 * @swagger
 * /api/v1/payroll/reports:
 *   get:
 *     summary: List sent payroll reports
 *     tags: [Payroll]
 */
router.get('/reports',
    authorize([UserRole.FINANCE_OFFICER, UserRole.HR_OFFICER]),
    payrollController.listReports
);

/**
 * @swagger
 * /api/v1/payroll/reports/{id}/download:
 *   get:
 *     summary: Download a specific payroll report
 *     tags: [Payroll]
 */
router.get('/reports/:id/download',
    authorize([UserRole.FINANCE_OFFICER]),
    payrollController.downloadReport
);

export default router;


import { Router } from 'express';
import * as payrollController from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/data-transfer', payrollController.getPayrollData);

export default router;

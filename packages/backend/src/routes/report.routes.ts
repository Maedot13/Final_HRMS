
import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN, UserRole.HR_OFFICER]));

router.get('/summary', reportController.getDashboardSummary);
router.get('/leave', reportController.getLeaveStats);
router.get('/departments', reportController.getDepartmentStats);
router.get('/recruitment', reportController.getRecruitmentStats);

export default router;

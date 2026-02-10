
import { Router } from 'express';
import * as clearanceController from '../controllers/clearance.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/requests', clearanceController.initiateClearance);
router.get('/requests/:id', clearanceController.getClearance);
router.patch('/requests/:id/approve-check', clearanceController.approveCheck);
router.patch('/requests/:id/reject-check', clearanceController.rejectCheck);
router.get('/units/:unitId/pending', clearanceController.getPendingChecksForUnit);

export default router;

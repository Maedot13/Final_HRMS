
import { Router } from 'express';
import * as sabbaticalController from '../controllers/sabbatical.controller';
import { authenticate } from '../middleware/auth.middleware';
import { attachEmployee } from '../middleware/employee.middleware';

const router = Router();

router.use(authenticate);

router.post('/', attachEmployee, sabbaticalController.createSabbatical);
router.get('/', attachEmployee, sabbaticalController.getRequests);
router.patch('/:id/approve', attachEmployee, sabbaticalController.approveRequest);
router.patch('/:id/reject', attachEmployee, sabbaticalController.rejectRequest);

export default router;

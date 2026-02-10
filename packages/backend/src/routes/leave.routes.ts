
import { Router } from 'express';
import * as leaveController from '../controllers/leave.controller';
import { authenticate } from '../middleware/auth.middleware';
import { attachEmployee } from '../middleware/employee.middleware';

const router = Router();

router.use(authenticate);

router.post('/', attachEmployee, leaveController.createLeaveRequest);
router.get('/', attachEmployee, leaveController.getMyRequests);
router.get('/my', attachEmployee, leaveController.getMyRequests);
router.get('/pending', leaveController.getPendingRequests);
router.patch('/:id/approve', attachEmployee, leaveController.approveRequest);
router.patch('/:id/reject', attachEmployee, leaveController.rejectRequest);

export default router;

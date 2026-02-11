
import { Router } from 'express';
import * as leaveController from '../controllers/leave.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { attachEmployee } from '../middleware/employee.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);

// Employees can create and view their own leave requests
router.post('/', attachEmployee, leaveController.createLeaveRequest);
router.get('/', attachEmployee, leaveController.getMyRequests);
router.get('/my', attachEmployee, leaveController.getMyRequests);

// Only authorized roles can view pending requests
router.get('/pending',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD]),
    leaveController.getPendingRequests
);

// Only department heads can approve/reject leave requests
router.patch('/:id/approve',
    authorize([UserRole.DEPARTMENT_HEAD]),
    attachEmployee,
    leaveController.approveRequest
);

router.patch('/:id/reject',
    authorize([UserRole.DEPARTMENT_HEAD]),
    attachEmployee,
    leaveController.rejectRequest
);

export default router;

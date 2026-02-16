
import { Router } from 'express';
import * as userController from '../controllers/userManagement.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.patch('/:id/role', userController.updateUserRole);
router.patch('/:id/status', userController.toggleUserStatus);
router.post('/:id/reset-password', userController.resetPassword);

export default router;

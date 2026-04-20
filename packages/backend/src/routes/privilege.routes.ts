import { Router } from 'express';
import * as privilegeController from '../controllers/privilege.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

// Only main admins or super admins can assign privileges
router.use(authenticate);
router.use(authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]));

/**
 * @swagger
 * tags:
 *   name: Privileges
 *   description: Manage elevated privileges (SUPER_ADMIN, HEAD_HR)
 */

router.get('/users', privilegeController.listPrivilegedUsers);
router.post('/assign', privilegeController.assignPrivilege);
router.delete('/:userId', privilegeController.revokePrivilege);

export default router;

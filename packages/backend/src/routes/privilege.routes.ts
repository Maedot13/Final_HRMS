import { Router } from 'express';
import * as privilegeController from '../controllers/privilege.controller';
import { authenticate, authorize, authorizeHeadHR } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Privileges
 *   description: Manage elevated privileges (SUPER_ADMIN, HEAD_HR, VICE_PRESIDENT)
 */

// AVP Management (Head HR or SUPER_ADMIN only)
router.post('/avp/assign', authorizeHeadHR, privilegeController.assignAVP);
router.delete('/avp/:employeeId', authorizeHeadHR, privilegeController.revokeAVP);

// General privilege assignment (Main admins or super admins)
router.get('/users', (req, res, next) => {
    if (req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.SUPER_ADMIN || req.user?.isHeadHR) {
        next();
    } else {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
}, privilegeController.listPrivilegedUsers);
router.post('/assign', authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]), privilegeController.assignPrivilege);
router.delete('/:userId', authorize([UserRole.ADMIN, UserRole.SUPER_ADMIN]), privilegeController.revokePrivilege);

export default router;

import { Router } from 'express';
import * as departmentController from '../controllers/department.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management
 */

router.get('/',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD]),
    departmentController.getDepartments
);

router.get('/:id',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.DEPARTMENT_HEAD]),
    departmentController.getDepartmentById
);

router.post('/',
    authorize([UserRole.ADMIN]),
    departmentController.createDepartment
);

router.patch('/:id',
    authorize([UserRole.ADMIN]),
    departmentController.updateDepartment
);

router.patch('/:id/head',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    departmentController.assignHead
);

router.delete('/:id',
    authorize([UserRole.ADMIN]),
    departmentController.deleteDepartment
);

export default router;

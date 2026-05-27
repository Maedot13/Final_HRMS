import { Router } from 'express';
import * as facultyController from '../controllers/faculty.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);

router.get('/',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    facultyController.getFaculties
);

/** List all faculties within the admin's campus – no collegeId required. */
router.get('/campus',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    facultyController.getCampusFaculties
);

router.get('/:id',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    facultyController.getFacultyById
);

router.post('/',
    authorize([UserRole.ADMIN]),
    facultyController.createFaculty
);

router.patch('/:id',
    authorize([UserRole.ADMIN]),
    facultyController.updateFaculty
);

router.patch('/:id/dean',
    authorize([UserRole.ADMIN]),
    facultyController.assignDean
);

router.delete('/:id',
    authorize([UserRole.ADMIN]),
    facultyController.deleteFaculty
);

export default router;

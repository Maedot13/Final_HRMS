import { Router } from 'express';
import * as collegeController from '../controllers/college.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

router.use(authenticate);

router.get('/',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    collegeController.getColleges
);

router.get('/:id',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER]),
    collegeController.getCollegeById
);

router.post('/',
    authorize([UserRole.ADMIN]),
    collegeController.createCollege
);

router.patch('/:id',
    authorize([UserRole.ADMIN]),
    collegeController.updateCollege
);

router.patch('/:id/dean',
    authorize([UserRole.ADMIN]),
    collegeController.assignDean
);

router.delete('/:id',
    authorize([UserRole.ADMIN]),
    collegeController.deleteCollege
);

export default router;

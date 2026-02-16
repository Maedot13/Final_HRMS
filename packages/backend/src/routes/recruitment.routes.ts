
import { Router } from 'express';
import * as recruitmentController from '../controllers/recruitment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { attachEmployee } from '../middleware/employee.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

// Publicly accessible (authenticated)
router.use(authenticate);

// Job Postings
router.get('/postings', recruitmentController.getJobPostings);
router.get('/postings/:id', recruitmentController.getJobPostingById);

// Employee Applications
router.post('/apply', attachEmployee, recruitmentController.applyForJob);
router.get('/my-applications', attachEmployee, recruitmentController.getMyApplications);

// Recruitment Committee / HR / Admin
router.post('/postings',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.RECRUITMENT_COMMITTEE]),
    recruitmentController.createJobPosting
);

router.patch('/postings/:id/status',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.RECRUITMENT_COMMITTEE]),
    recruitmentController.updateJobStatus
);

router.get('/postings/:id/applications',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.RECRUITMENT_COMMITTEE]),
    recruitmentController.getApplicationsForJob
);

router.patch('/applications/:id/status',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.RECRUITMENT_COMMITTEE]),
    recruitmentController.updateApplicationStatus
);

export default router;

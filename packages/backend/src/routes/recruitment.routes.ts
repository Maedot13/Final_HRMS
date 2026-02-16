
import { Router } from 'express';
import * as recruitmentController from '../controllers/recruitment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { attachEmployee } from '../middleware/employee.middleware';
import { UserRole } from '@hrms/types';

const router = Router();

// Publicly accessible (authenticated)
router.use(authenticate);

// Job Postings
/**
 * @swagger
 * tags:
 *   name: Recruitment
 *   description: Job postings and applications
 */

/**
 * @swagger
 * /api/v1/recruitment/postings:
 *   get:
 *     summary: Get all open job postings
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of job postings
 *   post:
 *     summary: Create a new job posting
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - deadline
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               requirements:
 *                 type: string
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Job posting created
 *       403:
 *         description: Forbidden
 */
router.get('/postings', recruitmentController.getJobPostings);

/**
 * @swagger
 * /api/v1/recruitment/postings/{id}:
 *   get:
 *     summary: Get job posting details
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Job posting details
 *       404:
 *         description: Posting not found
 */
router.get('/postings/:id', recruitmentController.getJobPostingById);

/**
 * @swagger
 * /api/v1/recruitment/apply:
 *   post:
 *     summary: Apply for a job
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobPostingId
 *             properties:
 *               jobPostingId:
 *                 type: integer
 *               coverLetter:
 *                 type: string
 *               cvUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application submitted
 *       400:
 *         description: already applied or deadline passed
 */
import { upload } from '../middleware/upload.middleware';

/**
 * @swagger
 * /api/v1/recruitment/apply:
 *   post:
 *     summary: Apply for a job
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - jobPostingId
 *             properties:
 *               jobPostingId:
 *                 type: integer
 *               coverLetter:
 *                 type: string
 *               cv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Application submitted
 *       400:
 *         description: already applied or deadline passed
 */
router.post('/apply', attachEmployee, upload.single('cv'), recruitmentController.applyForJob);

/**
 * @swagger
 * /api/v1/recruitment/my-applications:
 *   get:
 *     summary: Get current employee's applications
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 */
router.get('/my-applications', attachEmployee, recruitmentController.getMyApplications);

router.post('/postings',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.RECRUITMENT_COMMITTEE]),
    recruitmentController.createJobPosting
);

/**
 * @swagger
 * /api/v1/recruitment/postings/{id}/status:
 *   patch:
 *     summary: Update job posting status
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [OPEN, CLOSED]
 *     responses:
 *       200:
 *         description: Status updated
 *       403:
 *         description: Forbidden
 */
router.patch('/postings/:id/status',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.RECRUITMENT_COMMITTEE]),
    recruitmentController.updateJobStatus
);

/**
 * @swagger
 * /api/v1/recruitment/postings/{id}/applications:
 *   get:
 *     summary: Get applications for a job posting
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of applications
 *       403:
 *         description: Forbidden
 */
router.get('/postings/:id/applications',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.RECRUITMENT_COMMITTEE]),
    recruitmentController.getApplicationsForJob
);

/**
 * @swagger
 * /api/v1/recruitment/applications/{id}/status:
 *   patch:
 *     summary: Update job application status
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SUBMITTED, UNDER_REVIEW, SHORTLISTED, REJECTED]
 *               reviewComment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 *       403:
 *         description: Forbidden
 */
router.patch('/applications/:id/status',
    authorize([UserRole.ADMIN, UserRole.HR_OFFICER, UserRole.RECRUITMENT_COMMITTEE]),
    recruitmentController.updateApplicationStatus
);

export default router;

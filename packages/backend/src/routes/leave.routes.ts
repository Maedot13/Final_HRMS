import { Router } from 'express';
import * as leaveController from '../controllers/leave.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { attachEmployee } from '../middleware/employee.middleware';
import { UserRole } from '@hrms/types';
import { validateBody } from '../middleware/validate.middleware';
import { createLeaveRequestSchema, deptHeadReviewSchema, approveRejectSchema } from '../schemas/leave.schema';
import { upload } from '../middleware/upload.middleware';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Leave
 *   description: Leave request management (two-stage workflow)
 */

// ── Employee self-service ─────────────────────────────────────────────────────

/**
 * POST /api/v1/leave/apply — Employee submits leave request (supports file upload)
 */
router.post(
    '/apply',
    authorize([UserRole.EMPLOYEE]),
    attachEmployee,
    upload.single('attachment'),
    validateBody(createLeaveRequestSchema),
    leaveController.createLeaveRequest
);

/**
 * GET /api/v1/leave/my-requests — Employee's own leave history
 */
router.get(
    '/my-requests',
    authorize([UserRole.EMPLOYEE, UserRole.HR_OFFICER, UserRole.ADMIN, UserRole.DEPARTMENT_HEAD]),
    attachEmployee,
    leaveController.getMyRequests
);

// Alias kept for backward compatibility
router.get('/my', attachEmployee, leaveController.getMyRequests);
router.post('/', attachEmployee, upload.single('attachment'), validateBody(createLeaveRequestSchema), leaveController.createLeaveRequest);
router.get('/', attachEmployee, leaveController.getMyRequests);

// ── Leave balances ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/leave/balance — Own balance (self-service)
 */
router.get('/balance', attachEmployee, leaveController.getMyLeaveBalance);

/**
 * GET /api/v1/leave/balances/:employeeId — Balance for specific employee (HR/Admin/Manager)
 */
router.get('/balances/:employeeId', leaveController.getLeaveBalances);

// ── Approver views ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/leave/pending — Pending requests scoped to caller's role
 * DEPARTMENT_HEAD → their department (DEPT_HEAD stage)
 * HR_OFFICER/ADMIN → their campus (HR_OFFICER stage); ?view=all for all requests
 * DEAN privilege → RESEARCH leaves at DEAN stage on campus
 * VICE_PRESIDENT privilege → SABBATICAL leaves at VP stage university-wide
 */
router.get(
    '/pending',
    attachEmployee,
    leaveController.getPendingRequests
);

/**
 * GET /api/v1/leave/all — HR: all campus requests for record-keeping
 */
router.get(
    '/all',
    authorize([UserRole.HR_OFFICER, UserRole.ADMIN]),
    leaveController.getAllCampusRequests
);

// ── Individual request ────────────────────────────────────────────────────────

router.get('/:id', leaveController.getLeaveRequest);

// ── Stage 1: Department Head Review ──────────────────────────────────────────

/**
 * PATCH /api/v1/leave/:id/dept-head-review — Dept head approves (forwards) or rejects
 */
router.patch(
    '/:id/dept-head-review',
    authorize([UserRole.DEPARTMENT_HEAD]),
    attachEmployee,
    validateBody(deptHeadReviewSchema),
    leaveController.deptHeadReview
);

// ── Stage 2: Final Approval ───────────────────────────────────────────────────

/**
 * PATCH /api/v1/leave/:id/approve — HR Officer / Dean / VP gives final approval
 */
router.patch(
    '/:id/approve',
    validateBody(approveRejectSchema),
    leaveController.approveRequest
);

/**
 * PATCH /api/v1/leave/:id/reject — HR Officer / Dean / VP rejects at final stage
 */
router.patch(
    '/:id/reject',
    validateBody(approveRejectSchema),
    leaveController.rejectRequest
);

export default router;

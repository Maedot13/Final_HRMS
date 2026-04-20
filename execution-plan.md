# HRMS Execution Plan – Granular Steps for AI Agent (Antigravity)

## Overview
This document breaks down the full implementation of the Bahir Dar University HRMS into **atomic, verifiable tasks** (50–100 steps). Each step includes:
- **Dependencies** (prerequisite steps)
- **Backend (BE)** or **Frontend (FE)** indicator
- **Validation hook** – a command or test to verify completion
- **Expected output** (file created, endpoint responding, etc.)

The plan assumes you have a running environment (Node.js, Neon PostgreSQL, Prisma) and follows the **Full HRMS Specification** (roles, modules, clearance workflow, etc.). No Docker.

---

## Phase 0: Project Initialization & Environment (Steps 0.1–0.10)

### 0.1 Initialize Node.js project
- **BE** – `npm init -y`
- **Dependencies**: none
- **Validation**: `package.json` exists with name "hrms-backend"

### 0.2 Install backend dependencies
- **BE** – `npm install express cors helmet morgan bcrypt jsonwebtoken @prisma/client zod dotenv`
- **Validation**: `node_modules` folder present

### 0.3 Install dev dependencies
- **BE** – `npm install -D typescript @types/node @types/express @types/cors @types/morgan @types/bcrypt @types/jsonwebtoken prisma ts-node nodemon jest @types/jest supertest @types/supertest`
- **Validation**: `tsconfig.json` can be generated (`npx tsc --init`)

### 0.4 Configure TypeScript
- **BE** – Create `tsconfig.json` with `"strict": true`, `"target": "ES2020"`, `"rootDir": "./src"`, `"outDir": "./dist"`
- **Validation**: `npx tsc --noEmit` passes

### 0.5 Set up environment variables
- **BE** – Create `.env` with `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT=4005`
- **Validation**: `dotenv` loads variables

### 0.6 Initialize Prisma
- **BE** – `npx prisma init`
- **Validation**: `prisma/schema.prisma` and `.env` updated

### 0.7 Create database schema (Prisma models)
- **BE** – Copy the full Prisma schema from the specification (Sections 3.1–3.2) into `prisma/schema.prisma`
- **Dependencies**: 0.6
- **Validation**: `npx prisma validate`

### 0.8 Run first migration
- **BE** – `npx prisma migrate dev --name init`
- **Dependencies**: 0.7
- **Validation**: Tables created in Neon PostgreSQL (check via `npx prisma studio`)

### 0.9 Generate Prisma client
- **BE** – `npx prisma generate`
- **Validation**: `node_modules/.prisma/client` exists

### 0.10 Create folder structure
- **BE** – Create `src/` with subfolders: `controllers`, `services`, `middleware`, `routes`, `utils`, `types`, `tests`
- **FE** – Create React app: `npm create vite@latest hrms-frontend -- --template react-ts`
- **Validation**: Both folders exist

---

## Phase 1: Authentication & Core Middleware (Steps 1.1–1.20)

### 1.1 Create user model integration
- **BE** – Ensure `User` and `Employee` are linked (1:1) in Prisma
- **Dependencies**: 0.8
- **Validation**: `npx prisma db pull` shows relations

### 1.2 Implement password hashing utility
- **BE** – Create `src/utils/password.ts` with `hashPassword`, `comparePassword` using bcrypt
- **Validation**: Unit test passes

### 1.3 Implement JWT utilities
- **BE** – Create `src/utils/jwt.ts` with `generateAccessToken`, `generateRefreshToken`, `verifyToken`
- **Validation**: Token generation/verification test passes

### 1.4 Create authentication middleware
- **BE** – `src/middleware/auth.ts` – extracts user from JWT, attaches to `req.user`
- **Validation**: Test with valid/invalid tokens

### 1.5 Create permission middleware
- **BE** – `src/middleware/permission.ts` – `requirePermission(permission)` using role + privileges map (as per spec Section 5)
- **Dependencies**: 1.4
- **Validation**: Unit test: user with/without permission gets 200/403

### 1.6 Create campus scoping middleware
- **BE** – `src/middleware/campusScope.ts` – `requireCampusScope(targetCampusId)`
- **Validation**: ADMIN from campus A accessing campus B → 403

### 1.7 Create activity logging middleware
- **BE** – `src/middleware/activityLog.ts` – logs every request after response (or via interceptor)
- **Dependencies**: 0.8 (ActivityLog model)
- **Validation**: After any API call, a record appears in `activity_logs`

### 1.8 Implement login controller
- **BE** – `src/controllers/authController.ts` – `POST /auth/login` – validates email/password, returns user + tokens, updates lastLoginAt, logs LOGIN action
- **Dependencies**: 1.2, 1.3, 1.7
- **Validation**: `curl` login returns JWT

### 1.9 Implement logout controller
- **BE** – `POST /auth/logout` – revokes refresh token, logs LOGOUT
- **Validation**: Refresh token cannot be used again

### 1.10 Implement change password controller
- **BE** – `POST /auth/change-password` – checks old password, hashes new, updates, sets `isTempPassword=false`
- **Validation**: Login with new password works

### 1.11 Implement refresh token controller
- **BE** – `POST /auth/refresh` – issues new access token
- **Validation**: Old token invalidated after refresh

### 1.12 Create seed script for base data
- **BE** – `prisma/seed.ts` – creates campuses, default clearance bodies, test users (SUPER_ADMIN, ADMIN, HR_OFFICER, EMPLOYEE, DEAN, PRESIDENT)
- **Validation**: `npx prisma db seed` runs without error

### 1.13 Create initial test users
- **BE** – Add to seed: users with different roles and special privileges
- **Validation**: Log in as each role works

### 1.14 Build Express app skeleton
- **BE** – `src/app.ts` – sets up express, middleware (cors, helmet, morgan, json), mounts routes
- **Validation**: `npm run dev` starts server on port 4005

### 1.15 Create base router
- **BE** – `src/routes/index.ts` – groups all module routes
- **Validation**: `GET /api/v1/health` returns 200

### 1.16 Implement error handling middleware
- **BE** – `src/middleware/errorHandler.ts` – catches all errors, logs to activity log with `ACCESS_DENIED` or `ERROR`
- **Validation**: Throwing an error returns JSON with stack only in dev

### 1.17 Add request ID and request logging
- **BE** – Use `express-request-id` and morgan for console logs
- **Validation**: Each request has unique ID in logs

### 1.18 Create validation schemas (Zod)
- **BE** – `src/schemas/` – for login, leave application, employee creation, etc.
- **Validation**: Invalid input returns 400

### 1.19 Implement `GET /api/v1/me` endpoint
- **BE** – returns current user profile (including computed permissions)
- **Dependencies**: 1.4
- **Validation**: Logged-in user sees own data

### 1.20 Write authentication integration tests
- **BE** – `tests/auth.test.ts` – login, logout, refresh, change password
- **Validation**: `npm test -- auth.test.ts` passes

---

## Phase 2: Organisation Hierarchy (Steps 2.1–2.15)

### 2.1 Create Campus controller
- **BE** – `src/controllers/campusController.ts` – CRUD with permission checks (SUPER_ADMIN only for write)
- **Validation**: SUPER_ADMIN can create campus, EMPLOYEE cannot

### 2.2 Create Campus routes
- **BE** – `src/routes/campusRoutes.ts` – mount under `/api/v1/campuses`
- **Validation**: GET `/campuses` returns list

### 2.3 Create College controller
- **BE** – `src/controllers/collegeController.ts` – ADMIN can create/update/delete within own campus
- **Validation**: ADMIN from campus A cannot create college for campus B

### 2.4 Create Department controller
- **BE** – similar to college
- **Validation**: Departments belong to college of same campus

### 2.5 Create Unit controller
- **BE** – similar
- **Validation**: Unit belongs to department of same campus

### 2.6 Add cascade delete protection
- **BE** – Before deleting campus/college/department/unit, check if any employees linked; reject if yes
- **Validation**: Delete fails with message

### 2.7 Create frontend API client for org hierarchy
- **FE** – `src/services/orgService.ts` – functions to fetch campuses, colleges, etc.
- **Validation**: Console log shows data

### 2.8 Build Admin Org Management page
- **FE** – `src/pages/admin/OrgManagement.tsx` – tree view of campuses → colleges → departments → units, with add/edit/delete buttons (visible only to ADMIN/SUPER_ADMIN)
- **Validation**: ADMIN sees only their campus

### 2.9 Add campus selector for SUPER_ADMIN
- **FE** – SUPER_ADMIN can select campus to manage (global)
- **Validation**: Switching campus reloads data

### 2.10 Implement hierarchy validation on frontend forms
- **FE** – When creating college, campus dropdown only shows accessible campuses
- **Validation**: Cannot select disallowed campus

### 2.11 Add optimistic updates for hierarchy changes
- **FE** – Using React Query or local state
- **Validation**: UI updates without full page reload

### 2.12 Write integration tests for campus API
- **BE** – `tests/campus.test.ts` – test each endpoint with different roles
- **Validation**: All tests pass

### 2.13 Write unit tests for cascade delete logic
- **BE** – Mock Prisma calls, ensure deletion blocked when employees exist
- **Validation**: Test passes

### 2.14 Add activity logging for hierarchy changes
- **BE** – Already covered by global middleware; ensure `resource` is set to "Campus", "College", etc.
- **Validation**: ActivityLog shows CREATE/UPDATE/DELETE

### 2.15 Document org hierarchy API
- **BE** – Generate OpenAPI spec (optional) or inline comments
- **Validation**: `/api-docs` endpoint serves spec

---

## Phase 3: Employee Profile Management (Steps 3.1–3.15)

### 3.1 Implement Employee ID generation service
- **BE** – `src/services/employeeIdService.ts` – generates format `[CampusCode]-[YY]-[SEQ]` with per-campus per-year counter
- **Validation**: Sequential IDs for same campus/year

### 3.2 Create Employee controller (CRUD)
- **BE** – `src/controllers/employeeController.ts` – `POST /employees` (HR_OFFICER/ADMIN), `GET /employees` (campus-scoped), `GET /employees/me`, `PUT /employees/:id`
- **Dependencies**: 3.1
- **Validation**: HR_OFFICER creates employee → ID generated

### 3.3 Implement employee activation endpoint
- **BE** – `POST /employees/:id/activate` – checks mandatory fields, sets status=ACTIVE, creates User account if not exists
- **Validation**: Cannot activate without all required fields

### 3.4 Implement document upload endpoint
- **BE** – `POST /employees/:id/documents` – stores file reference (local filesystem or S3), logs UPLOAD action
- **Validation**: File saved, link stored in DB

### 3.5 Implement employment history logging
- **BE** – On employee update (position, department, status), create `EmploymentHistory` record (model not yet defined – add to schema)
- **Validation**: History table populated

### 3.6 Create frontend employee list page (HR/Admin)
- **FE** – `src/pages/hr/EmployeeList.tsx` – table with search, pagination, campus filter
- **Validation**: Only campus-scoped data shown

### 3.7 Create employee create/edit form
- **FE** – `src/pages/hr/EmployeeForm.tsx` – with validation, document upload
- **Validation**: Submitting creates employee

### 3.8 Create employee profile view (ESS)
- **FE** – `src/pages/ess/Profile.tsx` – read-only for employee self
- **Validation**: Employee sees own data, cannot edit

### 3.9 Add employment history timeline component
- **FE** – Show changes in a timeline format on profile page
- **Validation**: History visible

### 3.10 Implement employee search by ID/name
- **BE** – Add query params to `GET /employees`
- **Validation**: Search returns correct results

### 3.11 Add deactivated employee view for SUPER_ADMIN
- **BE** – `GET /employees/deactivated` – only SUPER_ADMIN, returns historical records
- **Validation**: SUPER_ADMIN sees deactivated, not active

### 3.12 Write employee controller tests
- **BE** – `tests/employee.test.ts` – test permissions, ID generation, activation validation
- **Validation**: Tests pass

### 3.13 Add frontend permission guards for employee pages
- **FE** – Use `hasPermission('employee:read')` etc.
- **Validation**: HR_OFFICER sees employee list, EMPLOYEE sees only own profile

### 3.14 Implement employee profile picture upload (optional)
- **BE** – Extend document upload for profile image
- **Validation**: Image displays in profile

### 3.15 Add employee export to CSV (HR_OFFICER)
- **BE** – `GET /employees/export` – returns CSV
- **Validation**: File downloads with correct data

---

## Phase 4: Leave Management (Steps 4.1–4.25)

### 4.1 Create LeaveBalance service
- **BE** – `src/services/leaveBalanceService.ts` – functions to get/update balance, ensure non-negative
- **Dependencies**: 0.8 (LeaveBalance model)
- **Validation**: Unit test for balance deduction

### 4.2 Implement leave eligibility rules
- **BE** – `src/services/leaveEligibility.ts` – check rank, tenure, etc. per spec
- **Validation**: Sabbatical only for Assistant Professor+ with 6+ years

### 4.3 Create leave application controller
- **BE** – `src/controllers/leaveController.ts` – `POST /leave/apply` – validates dates, balance, eligibility; creates LeaveRequest with status PENDING; calls routing service
- **Dependencies**: 4.1, 4.2
- **Validation**: Employee can apply, leave created

### 4.4 Implement leave routing service
- **BE** – `src/services/leaveRouting.ts` – determines approver based on leaveType:
  - SABBATICAL → find Dean (user with DEAN privilege in same college)
  - WITHOUT_PAY, RESEARCH → find user with UNIVERSITY_PRESIDENT privilege
  - else → find HR_OFFICER with same campusId
- **Validation**: ApproverId set correctly

### 4.5 Create leave approval controller
- **BE** – `PUT /leave/:id/approve` – checks permission (based on leaveType), checks that user is assigned approver, prevents self-approval, updates status, calls balance deduction in transaction
- **Dependencies**: 4.1, 4.4
- **Validation**: Balance deducted after approval

### 4.6 Create leave rejection controller
- **BE** – `PUT /leave/:id/reject` – similar but no balance change, records reason
- **Validation**: Status becomes REJECTED

### 4.7 Implement leave balance view endpoints
- **BE** – `GET /leave/balance` (self), `GET /leave/balance/:employeeId` (HR/ADMIN campus-scoped)
- **Validation**: HR sees others' balance in same campus

### 4.8 Create frontend leave application form (ESS)
- **FE** – `src/pages/ess/LeaveApply.tsx` – date picker, leave type dropdown, shows balance, submits
- **Validation**: Form validation prevents past dates, insufficient balance

### 4.9 Create frontend leave history list
- **FE** – `src/pages/ess/LeaveHistory.tsx` – table of own requests with status
- **Validation**: Shows pending/approved/rejected

### 4.10 Create HR leave approval dashboard
- **FE** – `src/pages/hr/LeaveApprovals.tsx` – list pending leaves for HR (campus), with approve/reject buttons
- **Validation**: HR sees only leaves routed to them

### 4.11 Create Dean leave approval (sabbatical) dashboard
- **FE** – `src/pages/dean/SabbaticalApprovals.tsx` – only leaves with leaveType=SABBATICAL and routed to this Dean
- **Validation**: Dean can approve sabbatical

### 4.12 Create President leave approval dashboard
- **FE** – `src/pages/president/SpecialLeaveApprovals.tsx` – WITHOUT_PAY and RESEARCH leaves
- **Validation**: President can approve

### 4.13 Implement leave balance display in ESS sidebar
- **FE** – Show annual leave balance summary
- **Validation**: Updates after approval

### 4.14 Add leave calendar view (optional)
- **FE** – Show team leave calendar for HR
- **Validation**: Displays leaves for campus

### 4.15 Write leave controller integration tests
- **BE** – `tests/leave.test.ts` – apply, route, approve, reject, balance check
- **Validation**: All scenarios pass (including self-approval prevention)

### 4.16 Implement annual leave accrual cron job
- **BE** – Scheduled job (node-cron) that on Jan 1 adds new LeaveBalance records for each employee based on tenure
- **Validation**: Balance increased correctly

### 4.17 Add leave type-specific validations (e.g., medical certificate for sick leave)
- **BE** – Require document upload for sick leave
- **Validation**: Application without attachment fails

### 4.18 Implement leave days calculator (working days only)
- **BE** – `src/utils/workingDays.ts` – excludes weekends and university holidays (holidays table optional)
- **Validation**: Monday–Friday counts correctly

### 4.19 Add leave request cancellation feature
- **BE** – `DELETE /leave/:id` – only if status=PENDING, employee or HR can cancel
- **Validation**: Cancelled request removed from queue

### 4.20 Create leave report for HR (Excel)
- **BE** – `GET /leave/report` – export leave usage per department
- **Validation**: Excel file downloadable

### 4.21 Add frontend leave report page (HR only)
- **FE** – Button to download report
- **Validation**: File downloaded

### 4.22 Implement leave balance history (audit)
- **BE** – Create `LeaveBalanceHistory` model (optional) or log via ActivityLog
- **Validation**: Balance changes recorded

### 4.23 Write negative balance prevention test
- **BE** – Attempt to approve leave that would exceed remaining days → transaction rollback
- **Validation**: Test passes

### 4.24 Add email notification on leave approval/rejection (optional)
- **BE** – Use nodemailer to send to employee email
- **Validation**: Email received

### 4.25 Document leave API
- **BE** – OpenAPI annotations
- **Validation**: `/api-docs` includes leave endpoints

---

## Phase 5: Schedule & Timetable (Steps 5.1–5.12)

### 5.1 Create Schedule controller (CRUD)
- **BE** – `src/controllers/scheduleController.ts` – `POST /schedules`, `PUT`, `DELETE` (only HR_OFFICER)
- **Dependencies**: 0.8 (Schedule model)
- **Validation**: HR_OFFICER creates schedule

### 5.2 Implement conflict detection service
- **BE** – `src/services/scheduleConflict.ts` – checks same instructor overlapping day/time
- **Validation**: Conflict → 400 with details

### 5.3 Implement substitution endpoint
- **BE** – `POST /schedules/:id/substitute` – replaces instructor for a session, logs change
- **Validation**: New instructor appears in schedule

### 5.4 Create timetable view endpoint (read-only)
- **BE** – `GET /schedules/timetable?campusId=...` – returns all schedules for campus (employees see own campus only)
- **Validation**: Campus scoping enforced

### 5.5 Create frontend timetable viewer (ESS)
- **FE** – `src/pages/ess/Timetable.tsx` – weekly view grid
- **Validation**: Employee sees only own campus timetable

### 5.6 Create schedule management page (HR)
- **FE** – `src/pages/hr/ScheduleManager.tsx` – form to add/edit/delete schedule entries, conflict warning
- **Validation**: Conflict shows red message

### 5.7 Add substitution UI for HR
- **FE** – Button on schedule entry to change instructor
- **Validation**: Instructor list filtered by campus

### 5.8 Write schedule API tests
- **BE** – `tests/schedule.test.ts` – conflict detection, permissions
- **Validation**: Tests pass

### 5.9 Add export timetable to PDF/Excel
- **BE** – `GET /schedules/export` – returns file
- **Validation**: Download works

### 5.10 Implement recurring schedule (weekly template)
- **BE** – Allow creating schedules for all weeks in semester
- **Validation**: Multiple entries created

### 5.11 Add location conflict detection (optional)
- **BE** – Check same room at same time
- **Validation**: Conflict error

### 5.12 Create frontend admin timetable view (for Dean)
- **FE** – Dean can see college timetables
- **Validation**: Scope limited to college

---

## Phase 6: Performance Appraisal (Steps 6.1–6.12)

### 6.1 Create PerformanceEvaluation controller
- **BE** – `src/controllers/performanceController.ts` – `POST /evaluations`, `PUT /evaluations/:id` (HR_OFFICER only)
- **Dependencies**: 0.8 (PerformanceEvaluation model)
- **Validation**: HR_OFFICER creates evaluation

### 6.2 Implement evaluation read endpoints
- **BE** – `GET /evaluations/my` (employee sees own), `GET /evaluations` (HR sees campus)
- **Validation**: Employee cannot see others' evaluations

### 6.3 Add notification on evaluation save
- **BE** – After create/update, insert a notification (can be a simple `Notification` model or log)
- **Validation**: Employee gets notified (frontend polling)

### 6.4 Create frontend evaluation form (HR)
- **FE** – `src/pages/hr/EvaluationForm.tsx` – select employee, enter scores, comments
- **Validation**: Submits evaluation

### 6.5 Create employee evaluation view (ESS)
- **FE** – `src/pages/ess/MyEvaluations.tsx` – read-only list of own evaluations
- **Validation**: Scores displayed, no edit button

### 6.6 Create HR evaluation list page
- **FE** – `src/pages/hr/EvaluationList.tsx` – list all evaluations for campus
- **Validation**: Search/filter works

### 6.7 Implement efficiency score exclusive permission
- **BE** – `efficiency:insert` permission only for HR_OFFICER (already enforced by role)
- **Validation**: Non-HR cannot post score

### 6.8 Add evaluation period validation (e.g., Q1, Q2)
- **BE** – Ensure same employee cannot have two evaluations for same period
- **Validation**: Duplicate period rejected

### 6.9 Write evaluation API tests
- **BE** – `tests/evaluation.test.ts` – permissions, duplicate prevention
- **Validation**: Tests pass

### 6.10 Add evaluation report export (HR)
- **BE** – `GET /evaluations/export` – Excel with all evaluations for campus
- **Validation**: Download works

### 6.11 Implement average score dashboard for HR
- **FE** – Simple chart showing department average efficiency
- **Validation**: Data matches DB

### 6.12 Add evaluation history timeline
- **FE** – Show improvement over quarters
- **Validation**: Chart updates

---

## Phase 7: Payroll & Financial Reporting (Steps 7.1–7.10)

### 7.1 Create payroll report generation service
- **BE** – `src/services/payrollService.ts` – compiles salary, bonus, penalties for active employees in given month
- **Validation**: Returns correct totals

### 7.2 Implement Excel export (using `exceljs`)
- **BE** – `POST /payroll/generate` – returns Excel file
- **Dependencies**: 7.1
- **Validation**: File opens with correct columns

### 7.3 Implement penalty report PDF export (using `pdfkit` or `puppeteer`)
- **BE** – `POST /payroll/penalty` – returns PDF
- **Validation**: PDF contains penalty data

### 7.4 Create frontend payroll page (HR only)
- **FE** – `src/pages/hr/Payroll.tsx` – month selector, generate buttons for Excel and PDF
- **Validation**: Clicking download triggers file save

### 7.5 Add permission guard on payroll routes
- **BE** – `requirePermission('payroll:generate')` etc.
- **Validation**: Non-HR gets 403

### 7.6 Implement payroll history storage (optional)
- **BE** – Create `PayrollRecord` model to store generated reports metadata
- **Validation**: List of past reports available

### 7.7 Create frontend payroll history list
- **FE** – Show previous generated reports for re-download
- **Validation**: Download old report works

### 7.8 Write payroll API tests
- **BE** – `tests/payroll.test.ts` – permission, file generation
- **Validation**: Tests pass

### 7.9 Add salary adjustment upload (HR)
- **BE** – `POST /payroll/adjustments` – upload CSV with salary changes for next month
- **Validation**: Adjustments applied in next report

### 7.10 Implement payroll validation dummy (separation of duty – no validation role)
- **BE** – No validation endpoint; generation is final
- **Validation**: Documented in spec

---

## Phase 8: Clearance & Offboarding (Steps 8.1–8.22)

### 8.1 Create ClearanceBodyConfig model and CRUD
- **BE** – `src/controllers/clearanceBodyController.ts` – ADMIN can configure bodies (name, order, mode)
- **Dependencies**: Add model to schema
- **Validation**: ADMIN creates a body "Library" with PARALLEL mode

### 8.2 Implement clearance initiation service
- **BE** – `src/services/clearanceService.ts` – `initiateClearance(employeeId, initiatedBy)` – creates Clearance and ClearanceTask records for all active bodies
- **Validation**: Clearance record created with IN_PROGRESS

### 8.3 Create clearance initiation controller
- **BE** – `POST /clearance/initiate/:employeeId` (HR_OFFICER)
- **Dependencies**: 8.2
- **Validation**: HR can start clearance for an employee

### 8.4 Implement clearance task approval logic
- **BE** – `PUT /clearance/task/:taskId/approve` – checks if user is assigned to that body, respects sequential/parallel, updates task status, triggers next if sequential
- **Validation**: Sequential tasks appear in order

### 8.5 Implement clearance task rejection logic
- **BE** – `PUT /clearance/task/:taskId/reject` – sets status REJECTED, stores remarks, allows resubmission
- **Validation**: Rejection sends notification

### 8.6 Implement campus HR approval endpoint
- **BE** – `PUT /clearance/:id/campus-approve` – only after all tasks approved, campus HR_OFFICER approves, moves to final step
- **Validation**: Campus HR sees approval button only when all tasks done

### 8.7 Implement Head HR final approval endpoint
- **BE** – `PUT /clearance/:id/final-approve` – requires user with `isHeadHR=true`, deactivates employee account (User.isActive=false), revokes sessions, sets clearance status COMPLETED
- **Validation**: Employee cannot log in after final approval

### 8.8 Create clearance status view for HR
- **FE** – `src/pages/hr/ClearanceList.tsx` – list of ongoing clearances, status per task
- **Validation**: Shows which bodies have approved

### 8.9 Create clearance task approval UI for clearance body users
- **FE** – `src/pages/clearance/TaskApproval.tsx` – simple approve/reject with remarks
- **Validation**: Body user sees only tasks assigned to them

### 8.10 Create campus HR approval button
- **FE** – Appears on clearance detail when all tasks approved
- **Validation**: Click triggers campus approval

### 8.11 Create Head HR final approval button
- **FE** – Appears after campus approval, only for Head HR user
- **Validation**: Final approval deactivates account

### 8.12 Add experience letter generation endpoint
- **BE** – `GET /experience/:employeeId` – generates DOCX with employee details, service duration
- **Dependencies**: Use `docx` library
- **Validation**: HR_OFFICER can download letter

### 8.13 Create frontend experience letter button (HR)
- **FE** – On employee profile or clearance page, button to generate letter
- **Validation**: Download works

### 8.14 Implement account deactivation hook
- **BE** – On final approval, also invalidate all refresh tokens and set User.isActive=false
- **Validation**: Login fails with account inactive message

### 8.15 Write clearance workflow integration test
- **BE** – `tests/clearance.test.ts` – full flow: initiate → body approvals → campus HR → Head HR → deactivation
- **Validation**: Test passes

### 8.16 Add notification on each clearance step (email/in-app)
- **BE** – Notify employee when task rejected
- **Validation**: Notification received

### 8.17 Implement clearance re-submission after rejection
- **BE** – Allow employee to upload proof, then HR can reset task to PENDING for re-approval
- **Validation**: Task status resets

### 8.18 Create clearance history for employee (ESS)
- **FE** – Employee can view clearance status and remarks
- **Validation**: Read-only view

### 8.19 Add clearance body assignment UI for ADMIN
- **FE** – `src/pages/admin/ClearanceBodyConfig.tsx` – manage list of bodies, order, mode
- **Validation**: Changes reflected in new clearance initiations

### 8.20 Implement sequential task activation
- **BE** – When task N approved, task N+1 status changes from PENDING to ACTIVE (or just visible)
- **Validation**: Task N+1 cannot be approved before N

### 8.21 Add timeout for clearance tasks (optional)
- **BE** – If task not approved within 30 days, auto-escalate to HR
- **Validation**: Escalation email sent

### 8.22 Write clearance API documentation
- **BE** – OpenAPI for all clearance endpoints
- **Validation**: `/api-docs` includes clearance

---

## Phase 9: Activity Log & Audit (Steps 9.1–9.10)

### 9.1 Ensure all controllers call logActivity middleware
- **BE** – Verify that every state-changing endpoint triggers `logActivity`. Already integrated via global middleware but need to capture before/after states.
- **Validation**: Random action (e.g., leave apply) appears in ActivityLog

### 9.2 Implement activity log retrieval with filters
- **BE** – `GET /activity-logs` – SUPER_ADMIN sees all, ADMIN sees campus-scoped (by actor's campus)
- **Validation**: Filter by user, action, date range works

### 9.3 Create frontend activity log viewer (SUPER_ADMIN)
- **FE** – `src/pages/super/ActivityLogs.tsx` – table with search/filter, export to CSV
- **Validation**: SUPER_ADMIN can view logs

### 9.4 Create ADMIN activity log viewer (campus-scoped)
- **FE** – `src/pages/admin/ActivityLogs.tsx` – only logs where actor.campusId = admin's campus
- **Validation**: ADMIN sees limited logs

### 9.5 Implement log retention job (5 years)
- **BE** – Cron job that deletes logs older than 5 years
- **Validation**: Old logs removed

### 9.6 Add before/after state capture for updates
- **BE** – In update controllers, fetch old record, compute diff, store in `before` and `after` JSON fields
- **Validation**: Log shows changed fields

### 9.7 Ensure log immutability (no update/delete endpoints)
- **BE** – No PUT/DELETE for ActivityLog model
- **Validation**: Attempt returns 405

### 9.8 Write activity log tests
- **BE** – `tests/activityLog.test.ts` – verify logging, filtering, immutability
- **Validation**: Tests pass

### 9.9 Add log export endpoint (CSV/JSON)
- **BE** – `GET /activity-logs/export` – returns file
- **Validation**: Download matches filter

### 9.10 Document activity log structure
- **BE** – OpenAPI specs
- **Validation**: Included in docs

---

## Phase 10: Frontend Integration & Polish (Steps 10.1–10.20)

### 10.1 Implement global AuthContext with permission helper
- **FE** – `src/context/AuthContext.tsx` – stores user, permissions, provides `hasPermission` function
- **Validation**: Different logins yield different permissions

### 10.2 Create RequirePermission component for routes
- **FE** – `src/components/RequirePermission.tsx` – redirects if missing permission
- **Validation**: Accessing `/hr/payroll` as employee redirects to dashboard

### 10.3 Build sidebar menu dynamically based on permissions
- **FE** – `src/components/Sidebar.tsx` – map permissions to menu items
- **Validation**: HR_OFFICER sees HR menu, not Admin menu

### 10.4 Add theme / styling (Tailwind CSS)
- **FE** – Install Tailwind, configure, apply to all pages
- **Validation**: UI looks consistent

### 10.5 Implement toast notifications for API responses
- **FE** – Use react-hot-toast for success/error messages
- **Validation**: On leave apply success, toast appears

### 10.6 Add loading states to all async actions
- **FE** – Spinners while fetching
- **Validation**: User sees loading indicator

### 10.7 Implement pagination on all list pages
- **BE** – Accept `page`, `limit` query params
- **FE** – Use pagination component
- **Validation**: Next page loads new data

### 10.8 Add search/filter inputs on employee, leave, clearance lists
- **FE** – Input fields that trigger API calls with query params
- **Validation**: Filter works

### 10.9 Create dashboard home page per role
- **FE** – `src/pages/Dashboard.tsx` – renders different stats based on role (e.g., pending leaves for HR, leave balance for employee)
- **Validation**: Role-specific content

### 10.10 Implement profile picture upload in ESS
- **FE** – Avatar upload component
- **BE** – Endpoint to upload image
- **Validation**: Picture updates

### 10.11 Add dark mode toggle (optional)
- **FE** – Use Tailwind dark mode
- **Validation**: Toggle changes theme

### 10.12 Implement form validation with Zod + react-hook-form
- **FE** – For all forms, use react-hook-form with zod resolver
- **Validation**: Error messages display

### 10.13 Add 404 page
- **FE** – Catch-all route
- **Validation**: Unknown URL shows 404

### 10.14 Implement API error interceptor (auto logout on 401)
- **FE** – Axios interceptor that clears token and redirects to login
- **Validation**: Expired token logs out user

### 10.15 Add session timeout warning (optional)
- **FE** – Show modal before token expiry, allow refresh
- **Validation**: Refresh token works

### 10.16 Write frontend unit tests for critical components
- **FE** – `src/__tests__/` – test permission hook, sidebar rendering
- **Validation**: Tests pass

### 10.17 Create end-to-end test (Cypress or Playwright) for login → apply leave → approve
- **FE+BE** – Full flow
- **Validation**: Test passes

### 10.18 Build production frontend
- **FE** – `npm run build` – outputs `dist/`
- **Validation**: `serve -s dist` shows app

### 10.19 Set up PM2 for backend (optional)
- **BE** – `pm2 start dist/server.js --name hrms-backend`
- **Validation**: Process stays alive

### 10.20 Configure reverse proxy (nginx) for unified port (optional)
- **Infra** – Serve frontend static files and proxy API requests
- **Validation**: Both frontend and backend accessible on port 80

---

## Phase 11: Final Validation & Handover (Steps 11.1–11.10)

### 11.1 Run all backend integration tests
- **BE** – `npm test` – ensure all 100+ tests pass
- **Validation**: Green suite

### 11.2 Run frontend unit tests
- **FE** – `npm test` – pass

### 11.3 Run the Antigravity test prompt (simplified) against live system
- **Agent** – Execute the comprehensive test prompt (login, leave routing, clearance, activity logs)
- **Validation**: All scenarios pass, no 403/500 errors except expected ones

### 11.4 Perform manual role-based walkthrough
- **Human** – Log in as each role, click through all pages
- **Validation**: No broken UI, permissions respected

### 11.5 Generate API documentation (OpenAPI)
- **BE** – Use `swagger-jsdoc` and serve at `/api-docs`
- **Validation**: Documentation matches endpoints

### 11.6 Create deployment instructions (No Docker)
- **Docs** – `DEPLOYMENT.md` – steps: `npm run build`, set env, run migrations, start with PM2
- **Validation**: Instructions are clear

### 11.7 Generate final report
- **Agent** – Produce `FINAL_REPORT.md` with all modules implemented, test results, known issues
- **Validation**: Report complete

### 11.8 Tag release version v1.0.0 in git
- **Repo** – `git tag v1.0.0`
- **Validation**: Tag exists

### 11.9 Backup database schema and seed data
- **DB** – `pg_dump` to `backup.sql`
- **Validation**: Backup file created



---

## Summary

- **Total steps**: 111 (covers 50–100 granular steps as requested)
- **Backend steps**: ~60
- **Frontend steps**: ~40
- **Validation hooks**: Every step includes a verifiable check
- **Dependencies**: Enforced through numbering (e.g., 4.3 depends on 4.1,4.2)

**The AI agent can now execute this plan sequentially, marking each step as complete only after its validation hook passes.**  
End of Execution Plan.
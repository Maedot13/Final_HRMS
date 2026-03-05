# HRMS Backend Analysis Document

This document provides a comprehensive analysis of the HRMS backend codebase, architecture, entities, APIs, and business logic. It serves as the foundational reference for frontend developers and UI generation tools.

---

## 1. System Overview and Architecture

The backend is built with **Node.js, Express, TypeScript, Prisma (PostgreSQL), and BullMQ (Redis)**. It supports a multi-campus university structure with role-based access control and strict campus isolation.

### Key Architectural Components

*   **Database**: PostgreSQL managed via Prisma ORM.
*   **Authentication**: JWT-based (Access + Refresh tokens).
*   **Validation**: Zod schema validation middleware.
*   **Logging**: Winston (Console, JSON file for error/all logs).
*   **Background Jobs**: BullMQ and Redis for asynchronous tasks (e.g., event-driven notifications and email sending).
*   **Error Handling**: Standardized `AppError` class throwing specific `ErrorCode` values.
*   **Pagination**: Cursor-based pagination strategy implementation for large data sets (e.g., Audit Logs).

---

## 2. Entity Relationships (ERD Summary)

The system consists of several relational entities heavily grouped around the `Campus` isolation model:

*   **Global Entities**:
    *   **Campus**: The root tenant object. Contains configuration like timezone and employee ID generation patterns.
    *   **User**: Can be scoped to `CAMPUS` or `UNIVERSITY`. Contains authentication credentials, roles, and status.
*   **Campus-Scoped Core Entities**:
    *   **Department**: Belongs to a campus. Can have one assigned `headEmployeeId`.
    *   **Employee**: Links a `User` to their HR data, assigned to a `Campus` and a `Department`.
*   **Operational Entities (Linked to Employee & Campus)**:
    *   **LeaveRequest & LeaveBalance**: Tracks annual, sick, maternity, paternity, and unpaid leaves.
    *   **SabbaticalRequest**: Handled separately from standard leaves.
    *   **ClearanceRequest / ClearanceUnit / ClearanceCheck**: Multi-step exit clearance workflow.
    *   **PayrollTransfer**: Generated when a clearance is successfully completed.
    *   **JobPosting & JobApplication**: Internal recruitment system.
    *   **Notification**: Stores read/unread alerts for users.
    *   **AuditLog**: Tracks sensitive actions for compliance.

*(Every operational entity directly links to a `Campus` via `campusId` to enforce strict logical data isolation, except global users).*

---

## 3. Module & API Definition

The APIs are grouped into functional modules. All routes are prefixed with `/api/v1`. Access to these endpoints relies on the Bearer JWT token in the `Authorization` header.

### 3.1. Auth Module
Handles authentication, session management, and registration.

*   `POST /auth/register`: Register a new user and auto-generate an Employee record. Body: `{ email, password, name, role, departmentId }`.
*   `POST /auth/login`: Authenticate via `{ employeeId, password }`. Returns tokens and user object.
*   `POST /auth/refresh`: Get new access token using `{ refreshToken }`.
*   `POST /auth/logout`: Revoke token. Body `{ refreshToken }`.
*   `POST /auth/change-password`: Force password change (often required on first login). Body `{ currentPassword, newPassword }`.
*   `GET /auth/me`: Retrieve current authenticated user profile.

### 3.2. Campuses Module (University Admin Only)
Manages the isolated tenants.

*   `GET /campuses`: List all campuses.
*   `POST /campuses`: Create new campus. Requires configs like `employeeIdPrefix`.
*   `GET /campuses/{id}`: Get campus details.
*   `PATCH /campuses/{id}`: Update campus configs (pattern cannot be changed after IDs are generated).
*   `GET /campuses/{id}/readiness`: Checks if a campus can be activated (i.e. has all required admin roles and department heads).

### 3.3. Users & Employees Module
*   `GET /users` & `GET /users/{id}`: List and view users.
*   `PATCH /users/{id}/role` & `PATCH /users/{id}/status`: Toggle roles and active status.
*   `POST /users/{id}/reset-password`: Reset user password securely.
*   `GET /employees/{id}`: View employee profile.
*   `PATCH /employees/{id}`: Update employee details (department, phone, address, etc).

### 3.4. Departments Module
*   `GET /departments`: List all departments in the requester's campus.
*   `POST /departments`: Create a department.
*   `PATCH /departments/{id}/head`: Assign or change the Department Head. Demotes old head automatically.
*   `DELETE /departments/{id}`: Remove department (only if no employees are attached).

### 3.5. Leave Management Module
*   `POST /leave`: Submit a new request `{ leaveType, startDate, endDate, reason }`. Validates against balances.
*   `GET /leave` (or `/leave/my`): List current employee's leaves.
*   `GET /leave/pending`: For HR/Admins/Dept Heads to view leaves awaiting approval.
*   `PATCH /leave/{id}/approve` & `PATCH /leave/{id}/reject`: Approve or reject leave request. Triggers email & notification workers.

### 3.6. Sabbatical Module
*   `POST /sabbatical`: Create request `{ purpose, startDate, endDate, plan }`. Requires 7+ service years.
*   `GET /sabbatical`: View own or campus sabbatical requests.
*   `PATCH /sabbatical/{id}/approve` & `PATCH /sabbatical/{id}/reject`: Process request.

### 3.7. Clearance Process Module
*   `POST /clearance/requests`: Initiate exit clearance `{ reason, lastWorkingDay }`.
*   `GET /clearance/requests/{id}`: View clearance and its inner unit checklist.
*   `GET /clearance/units/{unitId}/pending`: View checks awaiting approval from a specific unit.
*   `PATCH /clearance/requests/{id}/approve-check` & `PATCH /clearance/requests/{id}/reject-check`: Approve/Reject line items.
*   *Note*: When all checks are approved, `SystemEvents.CLEARANCE_COMPLETED` is fired, generating a Payroll Transfer automatically.

### 3.8. Recruitment Module
*   `POST /recruitment/postings`: Create job post.
*   `GET /recruitment/postings` & `/postings/{id}`: List/View jobs.
*   `PATCH /recruitment/postings/{id}/status`: Toggle OPEN/CLOSED.
*   `POST /recruitment/apply`: Apply with `{ jobPostingId, coverLetter, cvUrl }`.
*   `GET /recruitment/my-applications`: View own applications.
*   `GET /recruitment/postings/{id}/applications`: View candidates for a job.
*   `PATCH /recruitment/applications/{id}/status`: Change candidate status (SUBMITTED, UNDER_REVIEW, SHORTLISTED, REJECTED).

### 3.9. Reports & Dashboards Module
*   `GET /reports/summary`: General KPI counts (employees, leaves, jobs).
*   `GET /reports/leave`, `/reports/departments`, `/reports/recruitment`: Statistical drill-downs.
*   `GET /payroll/data-transfer`: Fetches finalized payroll transfers for finance ops.

---

## 4. Shared Utilities, Middleware, and Workers

### 4.1. Middleware
*   **Authentication (`auth.middleware.ts`)**: Validates Bearer token, asserts active status, and blocks access if `mustChangePassword` is true. Checks Redis blacklist.
*   **Authorization**: `authorize([...roles])` allows specific roles. `requireUniversityAdmin` protects multi-campus routes.
*   **Validation (`validate.middleware.ts`)**: Uses Zod to parse asynchronous request shapes (`body`, `query`, `params`).

### 4.2. Background Workers (`notification.worker.ts`)
Uses BullMQ `SystemEvents` queue to natively handle complex async operations:
*   Sends Emails & In-App Notifications on leave approval/rejection.
*   Handles Clearance progression (notifying user when units approve/reject).
*   Automatically triggers Payroll data transfer when a clearance is 100% completed.

### 4.3. Pagination (`pagination.ts`)
*   Uses **Cursor-based pagination** returning `{ data: [], pagination: { nextCursor, hasMore, count } }`. This requires the frontend to pass `?cursor=X&limit=Y` instead of standard page numbers.

---

## 5. Business Logic Rules and Edge Cases

### Security & Access Control
1.  **Campus Isolation**: A user belonging to `Campus A` strictly cannot view or mutate entities belonging to `Campus B`. This validation occurs in DB queries and middleware. Only `UserScope.UNIVERSITY` Users (University Admins) bypass this.
2.  **Password Forced Change**: If `mustChangePassword` is true on the user object, the frontend ***must*** restrict the user to the Change Password screen. Standard APIs will throw `PASSWORD_CHANGE_REQUIRED`.

### Departments & Hierarchy
1.  **Unique Department Head**: A department can only have **one** head. When replacing a head via API, the system automatically demotes the old head and promotes the new one to `DEPARTMENT_HEAD` role.

### HR Operations
1.  **Sabbatical Eligibility**: A user throwing a `POST /sabbatical` will receive an error if their `hireDate` calculates back to less than 7 years of service.
2.  **Clearance Workflow**: A clearance spans multiple units (e.g., Library, IT, Finance). Once all `ClearanceCheck` rows are `APPROVED`, the background worker finalizes the clearance and cuts a payroll transfer.
3.  **Leave Balances**: Creating a leave checks existing balances (Annual, Sick, etc). If insufficient, a validation error is thrown. Unpaid leave can bypass constraints.

---

## 6. Error Handling Strategy

The backend has a canonical standard format for errors parsing `AppError` exceptions.

**JSON Schema Response for Errors:**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": { ... },
  "timestamp": "2026-03-05T12:00:00Z",
  "requestId": "uuid"
}
```

**Pre-defined Error Codes Frontend Needs to Handle:**
*   `VALIDATION_ERROR` (400) -> Map Zod error `details` to form fields.
*   `AUTHENTICATION_FAILED` (401) -> Redirect to Login or Refresh token.
*   `PASSWORD_CHANGE_REQUIRED` (403) -> Redirect to /force-password-change.
*   `FORBIDDEN` (403) -> Show purely "Access Denied" or soft-hide UI elements.
*   `NOT_FOUND` (404) -> Generic 404 page / Toast.
*   `CONFLICT` / `UNIQUE_CONSTRAINT_VIOLATION` (409) -> E.g., trying to create an identical campus code.
*   `INSUFFICIENT_BALANCE` (400) -> Highlight leave type form error.
*   `INVALID_DATE_RANGE` (400) -> Highlight date pickers.

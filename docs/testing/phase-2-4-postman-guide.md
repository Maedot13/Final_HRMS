# Master Backend QA Analysis & Postman Test Suite Guide

This document is the exhaustive Postman testing suite for the HR Management System. It covers the entire system lifecycle, with updated security rules for multi-campus isolation and role-based access control (RBAC).

## Environment Variables & Dynamic Persistence

Set up a Postman Environment with the following. The suite is designed to be **self-populating** via post-request scripts.

| Variable | Description |
| :--- | :--- |
| `baseUrl` | `http://localhost:3000/api/v1` |
| `csrfToken` | Extracted from `/csrf-token`. |
| `superAdminToken` | Root access (University Scope). |
| `campusId` | Dynamic ID of the created Campus. |
| `campusAdminToken`| Initial admin for the new campus. |
| `hrToken` | Token for the HR Officer. |
| `deptHeadToken` | Token for the Department Head. |
| `financeToken` | Token for the Finance Officer. |
| `employeeToken` | Token for the Standard Employee. |
| `departmentId` | Dynamic ID of the created Department. |
| `targetEmployeeId` | The numeric `id` of an employee. |
| `targetEmployeeSID` | The string `employeeId` (e.g., `DEP/0001`). |
| `leaveRequestId` | Active leave request for status testing. |
| `clearanceId` | Active clearance process. |
| `jobPostingId` | Dynamic Job ID for applications. |

---

## Folder 01: System Bootstrap & Infrastructure

### 1.1 Root Health Check
- **GET** `/health` (Mounted at root)
- **Validation**: `200 OK`, `database: 'connected'`, `redis: 'connected'`.

### 1.2 CSRF Acquisition
- **GET** `{{baseUrl}}/csrf-token`
- **Script**: `pm.environment.set("csrfToken", pm.response.json().csrfToken);`

### 1.3 Super Admin Login (Bootstrap)
- **POST** `{{baseUrl}}/auth/login`
- **Body**: `{ "employeeId": "SUPER_ADMIN", "password": "..." }`
- **Script**: `pm.environment.set("superAdminToken", pm.response.json().token);`

---

## Folder 02: Organization & Campus Setup

### 2.1 Create University Campus (Inactive state)
- **POST** `{{baseUrl}}/campuses`
- **Auth**: `{{superAdminToken}}`
- **Body**:
    ```json
    {
      "code": "AAU-MAIN",
      "name": "Addis Ababa University",
      "employeeIdPrefix": "AAU",
      "employeeNumericLength": 4,
      "initialAdmin": {
        "employeeId": "ADM-001",
        "email": "admin@aau.edu",
        "name": "Main Admin"
      }
    }
    ```
- **Note**: This returns `tempPassword`. Capture `campusId` and `adminEmployeeId`.
- **Security Check**: Attempt to create with duplicate `code` -> `409 Conflict`.

### 2.2 Check Campus Readiness (Gate 1)
- **GET** `{{baseUrl}}/campuses/{{campusId}}/readiness`
- **Expected**: `isReady: false`, listing missing `HR_OFFICER` and `FINANCE_OFFICER`.

### 2.3 Attempt Activation (Expected Failure)
- **PATCH** `{{baseUrl}}/campuses/{{campusId}}`
- **Body**: `{ "isActive": true }`
- **Expected Success**: `422 Unprocessable Entity` (Readiness Gate Block).

### 2.4 Test ID Pattern Locking
- **PATCH** `{{baseUrl}}/campuses/{{campusId}}`
- **Body**: `{ "employeeIdPrefix": "FAIL" }`
- **Logic**: Since an initial admin employee exists, this should return `400` because patterns are locked.

---

## Folder 03: Identity & Access Management (IAM)

### 3.1 Campus Admin First Login (Force PW Change)
- **POST** `{{baseUrl}}/auth/login` (Using `tempPassword`)
- **Required**: `POST {{baseUrl}}/auth/change-password` before any other actions.

### 3.2 Register HR Officer & Finance Officer
- **POST** `{{baseUrl}}/auth/register` (Repeat for both)
- **Auth**: `{{superAdminToken}}` or `{{campusAdminToken}}`.
- **Logic**: Verify that manual `employeeId` in request is ignored; system must generate `AAU0001`, `AAU0002`.

### 3.3 Activate Campus (Final Readiness)
- **GET** `{{baseUrl}}/campuses/{{campusId}}/readiness` -> `isReady: true`.
- **PATCH** `{{baseUrl}}/campuses/{{campusId}}` -> `{ "isActive": true }`.

---

## Folder 04: Departmental Operations

### 4.1 Create Department
- **POST** `{{baseUrl}}/departments`
- **Body**: `{ "name": "Computer Science" }`
- **Script**: Save `departmentId`.

### 4.2 List Departments
- **GET** `{{baseUrl}}/departments`
- **Auth**: `ADMIN`, `HR_OFFICER`, `DEPARTMENT_HEAD`.
- **Logic**: View all campus departments.

### 4.3 Get Specific Department
- **GET** `{{baseUrl}}/departments/{{departmentId}}`
- **Auth**: `ADMIN`, `HR_OFFICER`, `DEPARTMENT_HEAD`.

### 4.4 Update Department
- **PATCH** `{{baseUrl}}/departments/{{departmentId}}`
- **Body**: `{ "name": "Computer Science & IT" }`
- **Auth**: `ADMIN` only.

### 4.5 Assign Department Head
- **PATCH** `{{baseUrl}}/departments/{{departmentId}}/head`
- **Body**: `{ "employeeId": "AAU0003" }`
- **Role Verification**: User `AAU0003` role is automatically promoted to `DEPARTMENT_HEAD`.

### 4.6 Test Head Uniqueness
- **POST** `{{baseUrl}}/departments`
- **Body**: `{ "name": "Physics", "headEmployeeId": "AAU0003" }`
- **Expected**: `400` (Employee is already head of Computer Science).

### 4.7 Delete Department (Cleanup Test)
- **DELETE** `{{baseUrl}}/departments/{{departmentId}}`
- **Auth**: `ADMIN` only.
- **Note**: This may fail (`400`) if the department has employees.

---

## Folder 05: Employee Lifecycle Management

### 5.1 Profile Update (RBAC Hardening)
- **PATCH** `{{baseUrl}}/employees/{{targetEmployeeId}}`
- **Fields**: `grossSalary`, `position`, `departmentId`.
- **Role 1 (HR Officer)**: `200 OK` (Allowed for own campus).
- **Role 2 (Campus Admin)**: `200 OK` (Allowed for own campus).
- **Role 3 (University Admin)**: `403 Forbidden`. **Logic**: "University admins have read-only access to local campus resources."
- **Role 4 (Employee Self)**: `403 Forbidden` (BAC Test).

### 5.2 List Campus Users
- **GET** `{{baseUrl}}/campuses/{{campusId}}/users`
- **Auth**: `ADMIN` or `HR_OFFICER`.
- **Logic**:
    - **University Admin**: `200 OK` (View all allowed).
    - **Campus Admin/HR (ID: 1)**: `200 OK` for Campus 1.
    - **Campus Admin/HR (ID: 1)**: `403 Forbidden` for Campus 2 (Cross-campus block).

### 5.3 Get Specific User Account
- **GET** `{{baseUrl}}/users/{{targetEmployeeId}}`
- **Auth**: `ADMIN`.
- **Logic**: Must be within the admin's campus scope.

### 5.4 Update User Role
- **PATCH** `{{baseUrl}}/users/{{targetEmployeeId}}/role`
- **Auth**: `ADMIN` only.
- **Body**: `{ "role": "DEPARTMENT_HEAD" }`
- **Note**: Cannot demote the last active admin on a campus.

### 5.5 Toggle User Status (Deactivate/Activate)
- **PATCH** `{{baseUrl}}/users/{{targetEmployeeId}}/status`
- **Auth**: `ADMIN` only.
- **Body**: `{ "isActive": false }`
- **Note**: Cannot deactivate the last active admin.

### 5.6 Admin Password Reset
- **POST** `{{baseUrl}}/users/{{targetEmployeeId}}/reset-password`
- **Auth**: `ADMIN` only.
- **Expected**: Generates a new temporary password.

---

## Folder 06: Leave Management Master Workflow

### 6.1 Employee Leave Creation (Atomic Balance Check)
- **POST** `{{baseUrl}}/leave`
- **Scenario**: Request 30 days when only 20 are available -> `400 Insufficient Balance`.
- **Script**: Save `leaveRequestId` from the successful (`201`) response for later steps.

### 6.2 View My Leave Requests
- **GET** `{{baseUrl}}/leave/my`
- **Auth**: `{{employeeToken}}`
- **Validation**: Ensure the list contains the newly created request.

### 6.3 Admin/HR View Pending Requests
- **GET** `{{baseUrl}}/leave/pending`
- **Auth**: `{{hrToken}}` or `{{deptHeadToken}}`
- **Validation**: Ensure `status: 'PENDING'` requests populate the queue.

### 6.4 Dept Head Approval (Sectional Isolation)
- **PATCH** `{{baseUrl}}/leave/{{leaveRequestId}}/approve`
- **Security Check**: Dept Head from "Physics" attempts to approve "CS" leave -> `403/Forbidden` (Dept Isolation).

### 6.5 Dept Head Rejection Workflow
- **POST** `{{baseUrl}}/leave` (Create a secondary request for rejection test)
- **PATCH** `{{baseUrl}}/leave/{{leaveRequestId}}/reject`
- **Body**: `{ "comment": "Insufficient coverage for this period." }`
- **Expected**: `200 OK`, `status: REJECTED`.

---

## Folder 07: Sabbatical Eligibility & Uploads

### 7.1 Multi-Year Eligibility Test (Creation)
- **POST** `{{baseUrl}}/sabbatical`
- **Logic**: If `serviceYears < 7`, system must return `400 Not Eligible`.
- **QA Action**: Update `hireDate` in Folder 05 to 8 years ago to trigger success.
- **Script**: Save `sabbaticalId` from the successful response.

### 7.2 View Sabbatical Requests
- **GET** `{{baseUrl}}/sabbatical`
- **Logic**: Employee sees personal requests; Auth roles (`ADMIN`, `HR_OFFICER`) see all relevant campus requests.

### 7.3 Sabbatical Approval/Rejection 
- **PATCH** `{{baseUrl}}/sabbatical/{{sabbaticalId}}/approve`
- **PATCH** `{{baseUrl}}/sabbatical/{{sabbaticalId}}/reject`
- **Auth**: `ADMIN`, `HR_OFFICER`, or `DEPARTMENT_HEAD`.
- **Body**: `{ "comment": "Approved by board." }`

---

## Folder 08: Clearance Orchestration

### 8.1 Parallel Unit Approvals
- **Auth**: Log in as `HR`, `Finance`, `Library` accounts.
- **PATCH** `/approve-check`: Each unit must approve with `unitId`.
- **Completion Logic**: Final unit approval should trigger a notification to Super Admin.

---

## Folder 09: Recruitment Operations

### 9.1 Create Job Posting (Admin/HR)
- **POST** `{{baseUrl}}/recruitment/postings`
- **Auth**: `ADMIN`, `HR_OFFICER`, `RECRUITMENT_COMMITTEE`.
- **Body**: Requires `title`, `description`, `department`, `position`, `deadline`.
- **Script**: Save `jobPostingId`.

### 9.2 View Open Postings (Public/Employee)
- **GET** `{{baseUrl}}/recruitment/postings`
- **Validation**: Ensure `status: 'OPEN'` jobs populate.

### 9.3 Job Deadline Enforcement (Application)
- **POST** `{{baseUrl}}/recruitment/apply`
- **Scenario**: Set `deadline` in the past during 9.1 creation -> `400 Deadline Passed`.
- **Script**: Save `applicationId` on success.

### 9.4 Duplicate Application Prevention
- **POST** `{{baseUrl}}/recruitment/apply` twice for same job -> `400 Already Applied`.

### 9.5 View Employee Applications
- **GET** `{{baseUrl}}/recruitment/my-applications`
- **Auth**: `{{employeeToken}}`.

### 9.6 View Job Applications (HR)
- **GET** `{{baseUrl}}/recruitment/postings/{{jobPostingId}}/applications`
- **Auth**: `ADMIN`, `HR_OFFICER`, `RECRUITMENT_COMMITTEE`.

### 9.7 Update Application Status
- **PATCH** `{{baseUrl}}/recruitment/applications/{{applicationId}}/status`
- **Body**: `{ "status": "SHORTLISTED", "reviewComment": "Strong candidate." }`

### 9.8 Close Job Posting
- **PATCH** `{{baseUrl}}/recruitment/postings/{{jobPostingId}}/status`
- **Body**: `{ "status": "CLOSED" }`

---

## Folder 10: Master Analytics & Reporting

### 10.1 Global vs Campus Stats
- **GET** `/reports/summary` (Admin) vs `/reports/summary?campusId=...` (HR Officer).
- **Validation**: Data must be scoped to the caller's authorized campus.

---

## Folder 11: Real-time Communications

### 11.1 Notification Lifecycle
- **GET** `/notifications/unread-count`
- **PATCH** `/notifications/:id/read`
- **PATCH** `/notifications/read-all`

---

## Folder 12: Audit & Compliance

### 12.1 Audit Export (Evidence)
- **GET** `/api/v1/audit-logs/export`
- **Auth**: `ADMIN` only.
- **Validation**: Verify CSV/JSON stream contains `CAMPUS_ACTIVATED` and `DEPARTMENT_HEAD_CHANGED` events.

---

## Folder 13: Security & Resilience (The "Chaos" Folder)

### 13.1 Token Rotation & Reuse
- **POST** `/auth/refresh-token`: Use a token twice -> `401/403` (Reuse detection).

### 13.2 Session Termination
- **POST** `/auth/logout`: Immediately follow with a Bearer `GET /employees/me` -> `401 Unauthorized`.

### 13.3 Rate Limit Brute Force
- **Iteration**: Script 50 requests to login in 10 seconds.
- **Validation**: `429 Too Many Requests`.

---
*End of Master Backend QA Suite.*

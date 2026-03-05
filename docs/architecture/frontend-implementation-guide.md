# HRMS Frontend Implementation Guide

This document is the **definitive blueprint** for implementing the frontend of the HRMS application. It maps the backend architecture (documented in `backend-analysis.md`) to actionable frontend components, data requirements, state management, and user flows.

---

## 1. Project Setup & Architecture

### Tech Stack Recommendations
*   **Framework**: Next.js (App Router) or React (Vite) for fast SPA interaction.
*   **State Management**:
    *   **Server State (API)**: React Query (`@tanstack/react-query`) or SWR. Crucial for caching, retries, and background refetching of employee lists and dashboard KPIs.
    *   **Client State (UI UI/Auth)**: Zustand or React Context for holding the `User` object, `Tokens`, and active `Campus` context.
*   **Styling**: Tailwind CSS combined with shadcn/ui or MUI for fast, enterprise-grade component building.
*   **Forms**: React Hook Form combined with Zod (using the same backend schemas ideally) for robust client-side validation.
*   **HTTP Client**: Axios with global interceptors.

### Axial Interceptor Logic
*   **Request Interceptor**: Attach `Authorization: Bearer <token>` to all requests (except `/auth/*`).
*   **Response Interceptor**:
    *   Catch `401 AUTHENTICATION_FAILED` -> Trigger silent refresh (`POST /api/v1/auth/refresh`). If refresh fails, log out and redirect to `/login`.
    *   Catch `403 PASSWORD_CHANGE_REQUIRED` -> Redirect to `/force-password-change`.
    *   Catch `400 VALIDATION_ERROR` -> Map `details` payload to React Hook Form `setError` functions.

---

## 2. Global State & Data Models

### 2.1. Authentication Store (`useAuthStore`)
```typescript
interface AuthState {
  user: {
    id: number;
    employeeId: string;
    email: string;
    role: 'ADMIN' | 'HR_OFFICER' | 'DEPARTMENT_HEAD' | 'FINANCE_OFFICER' | 'RECRUITMENT_COMMITTEE' | 'EMPLOYEE';
    scope: 'CAMPUS' | 'UNIVERSITY';
    campusId: number | null;
  } | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
}
```

---

## 3. Folder Structure Mapping

```text
/src
  /api          # Axios setup, interceptors, React Query hooks per feature (e.g., useLeave.ts)
  /components   # Reusable UI (Buttons, Modals, Tables, Status Badges)
  /layouts      # Core layouts (AuthLayout, DashboardLayout with Sidebar/Topbar)
  /pages        # Route-level components mapped below
  /store        # Zustand stores (useAuthStore, useUIStore)
  /types        # TypeScript interfaces matching backed schema
  /utils        # Formatters (date, currency), error parsers
```

---

## 4. Pages, Routes & Feature Modules

### 4.1. Authentication & Security
**Route**: `/login`
*   **Purpose**: Initial entry point.
*   **API**: `POST /api/v1/auth/login` (`{employeeId, password}`)
*   **Components**: LoginForm (employeeId text input, password input, submit button).
*   **Flow**: On success, set Zustand store -> redirect to `/dashboard`. If `mustChangePassword` flag applies, intercept and redirect to `/force-password-change`.

**Route**: `/force-password-change`
*   **Purpose**: Security measure for newly created accounts.
*   **API**: `POST /api/v1/auth/change-password` (`{currentPassword, newPassword}`)
*   **Components**: ChangePasswordForm (current pass, new pass, confirm new pass).
*   **Validations**: Zod matches (new === confirm), minimum 8 chars.

---

### 4.2. Dashboard (Home)
**Route**: `/dashboard`
*   **Purpose**: High-level overview based on role.
*   **API**: `GET /api/v1/reports/summary`, `GET /api/v1/notifications/unread-count`
*   **Components**: 
    *   `StatCards`: (Total Employees, Pending Leaves, Open Jobs)
    *   `QuickActions`: Direct links to "Request Leave", "Post Job", etc., restricted by role.
    *   `RecentActivity`: Mini feed based on latest `/api/v1/audit-logs/my-logs`.
*   **Loading State**: Skeletons for metric cards.

---

### 4.3. Employee Profiling
**Route**: `/employees` (HR/Admin/Dept Head)
*   **Purpose**: Employee directory.
*   **API**: `GET /api/v1/employees`
*   **Components**: 
    *   `EmployeeDataTable`: Columns (ID, Name, Dept, Role, Status). Features: Pagination, Search, Filter by Dept.
*   **Role Logic**: Employees cannot view this list.

**Route**: `/employees/[id]` or `/profile` (Self)
*   **API**: `GET /api/v1/employees/{id}`, `PATCH /api/v1/employees/{id}`
*   **Components**: 
    *   `ProfileHeader`: Avatar, Name, Job Title.
    *   `ContactInfoForm`: Editable inputs for phone, address, emergency contact.
*   **State Management**: React Query `useQuery(['employee', id])`. Optimistic update on form submit.

---

### 4.4. Leave Management Workflow
**Route**: `/leave` (Self)
*   **Purpose**: Request new leaves and view own history.
*   **API**: `GET /api/v1/leave/my`, `POST /api/v1/leave`
*   **Components**: 
    *   `LeaveHistoryTable`: List past leaves and statuses (PENDING, APPROVED, REJECTED).
    *   `LeaveRequestFormModal`: Fields: Type dropdown (ANNUAL, SICK, MATERNITY...), DatePickers (Start, End), Textarea (Reason).
*   **Validations**: Start date must be before end date. Cannot submit without reasoning.

**Route**: `/leave/approvals` (Dept Head / HR)
*   **API**: `GET /api/v1/leave/pending`, `PATCH /api/v1/leave/{id}/approve`, `PATCH /api/v1/leave/{id}/reject`
*   **Components**: 
    *   `PendingLeavesList`: Cards or table row per request.
    *   `DecisionModal`: Requires an input `comment` for rejects. Approve requires optional `comment`.

---

### 4.5. Exit Clearance Workflow (Critical Flow)
**Route**: `/clearance` (Employee View)
*   **Purpose**: Start clearance, track progress across departments.
*   **API**: `POST /api/v1/clearance/requests`, `GET /api/v1/clearance/requests/{id}`
*   **Components**: 
    *   `InitiateClearanceForm`: Inputs (Reason, Last Working Day).
    *   `ClearanceTracker`: Visual stepper or grid showing all required units (e.g., Library, IT) and their status (PENDING, APPROVED).

**Route**: `/clearance/approvals` (Unit Heads / Admin)
*   **API**: `GET /api/v1/clearance/units/{unitId}/pending`, `PATCH /api/v1/clearance/requests/{id}/approve-check`
*   **Flow**: Department head logs in, navigates to approvals, sees employees waiting on their specific unit, clicks "Approve" (sends `unitId`).
*   **Backend Hook Insight**: The frontend does not handle finalization. Once all units approve, the backend worker auto-creates the Payroll Transfer. The UI should just reflect `status: COMPLETED` via polling or refetch.

---

### 4.6. Internal Recruitment
**Route**: `/jobs`
*   **Purpose**: Job board.
*   **API**: `GET /api/v1/recruitment/postings`
*   **Components**: `JobCardGrid`. If HR, show "Create Job" CTA.

**Route**: `/jobs/create` (HR / Recruitment Committee)
*   **API**: `POST /api/v1/recruitment/postings`
*   **Forms**: `JobPostingForm` (Title, Description WYSIWYG, Requirements, Deadline).

**Route**: `/jobs/[id]`
*   **Purpose**: Job details and apply button.
*   **API**: `POST /api/v1/recruitment/apply`
*   **Forms**: `ApplicationModal` (Cover Letter textarea, CV URL input).

**Route**: `/jobs/[id]/applicants` (Recruitment Committee)
*   **API**: `GET /api/v1/recruitment/postings/{id}/applications`, `PATCH /api/v1/recruitment/applications/{id}/status`
*   **Components**: Kanban board or Table moving candidates from SUBMITTED -> SHORTLISTED.

---

### 4.7. System Administration & Audits
**Route**: `/admin/departments`
*   **API**: `GET /api/v1/departments`, `POST /api/v1/departments`, `PATCH /api/v1/departments/{id}/head`
*   **Components**: `DepartmentList`. `AssignHeadModal` (Searchable dropdown of employees).

**Route**: `/admin/audit-logs`
*   **API**: `GET /api/v1/audit-logs`
*   **Implementation Need**: Must implement **Cursor-based pagination**. The table cannot rely on standard `page=1`. It must use `nextCursor` from the API response for "Load More" or "Next Page" functionality.

**Route**: `/super-admin/campuses` (Scope: UNIVERSITY Only)
*   **API**: `GET /api/v1/campuses`, `POST /api/v1/campuses`
*   **Flow**: Provide UI to spin up new campuses. Must supply `employeeIdPrefix` and `initialAdmin` JSON structure.

---

## 5. UI Elements & States

### 5.1. Status Badges
Consistent color mapping for statuses across Leave, Clearance, and Jobs:
*   `PENDING`/`SUBMITTED`: Yellow / Warning
*   `APPROVED`/`SHORTLISTED`/`OPEN`: Green / Success
*   `REJECTED`/`CLOSED`: Red / Danger

### 5.2. Skeleton Loaders
*   Use skeleton representations instead of generic spinners for tables and dashboard metrics.
*   React Query `isLoading` maps to skeleton rendering.

### 5.3. Error Boundaries
*   Wrap major route sections in React Error Boundaries to catch unhandled crashes.
*   **API Errors**: Map `{ code, message, details }` from the backend to a global Toast Notification system (e.g., `react-hot-toast`). For `VALIDATION_ERROR`, map the output to form-level inline errors.

---

## 6. Priority / Implementation Order

**Frontend developers (or AI) should implement the system in this exact chronological order:**

1.  **Phase 1: Foundation**: Set up App framework, Axios interceptors, Auth Zustand store, Tailwind/UI library.
2.  **Phase 2: Authentication**: `/login`, `/force-password-change`. Test JWT token persistence, interceptor token refresh, and basic role extraction.
3.  **Phase 3: Core Layouts & Dashboard**: Sidebar navigation (conditional by role), Topbar (Notifications dropdown), Dashboard metric skeletons.
4.  **Phase 4: Employee Directory**: `/profile`, `/employees`. Ensures basic CRUD and data-fetching patterns are solid.
5.  **Phase 5: Self-Service Workflows**: `/leave` (Request forms), `/jobs` (Apply forms).
6.  **Phase 6: Managerial Approvals**: `/leave/approvals`, `/jobs/[id]/applicants`.
7.  **Phase 7: Clearance Complexity**: The multi-step clearance `/clearance`.
8.  **Phase 8: Administration**: `/admin/*` routes, cursor-based pagination for Audit logs, Campus creation for supers.
9.  **Phase 9: Polish**: Polish error handling, skeletons, toast notifications, responsive mobile views.

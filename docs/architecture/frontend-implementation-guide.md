# Full Codebase Analysis & Frontend Implementation Guide
**Project:** Bahir Dar University HRMS
**Target Role:** Senior Full-Stack Developer

This document provides a comprehensive analysis of the existing backend architecture and a highly structured, execution-ready roadmap for the frontend implementation.

---

## Phase 1: Comprehensive Backend Analysis

### 1.1 Project Architecture & Structure
The backend is a robust Node.js application built with **Express, TypeScript, and Prisma ORM** against a **PostgreSQL** database. It utilizes **Redis** for caching and **BullMQ** for event-driven async processing. The architecture is modularly separated into routes, controllers, services, schemas (Zod), and middleware, ensuring strong separation of concerns.

### 1.2 Implemented Features & Business Logic Flow
The backend is highly mature and implements the following core domains:
*   **Authentication & Security:** Robust JWT-based auth with refresh tokens, CSRF protection, and bcrypt password hashing. Includes forced password changing for new accounts.
*   **Multi-Campus Tenancy:** Data is rigidly scoped by `campusId`. Users have scopes (`CAMPUS` vs `UNIVERSITY`).
*   **Role-Based Access Control (RBAC):** Six strict roles: `ADMIN`, `HR_OFFICER`, `DEPARTMENT_HEAD`, `FINANCE_OFFICER`, `RECRUITMENT_COMMITTEE`, `EMPLOYEE`.
*   **Employee Management:** Core profiles merging generic `User` auth accounts with `Employee` HR details (service years, salary, contract data).
*   **Leave Management:** Multi-step workflows for Annual, Sick, Maternity, Paternity, and Unpaid leave. Includes automated overlapping request checks and balance tracking.
*   **Sabbatical Requests:** Specialized workflows requiring document uploads (`planDocumentUrl`) and specific approvers.
*   **Clearance & Exit:** Multi-unit clearance processes (e.g., Library, IT, Finance) approving sequentially or in parallel, triggering final `PayrollTransfer` records upon completion.
*   **Internal Recruitment:** Job postings by HR, applications by employees (with CVs and cover letters), status tracking, and strict conflict-of-interest checks (e.g., HR/Committee members cannot apply).
*   **Notifications & Event Bus:** Systemic alerts (e.g., when an application is updated or a leave is approved) driven by an internal EventBus and stored in the database.
*   **Auditing:** Exhaustive tracking of 19 distinct actions (Logins, Leave Approvals, Employee Updates, etc.) via `AuditLog` service.

### 1.3 Missing, Incomplete, or Technical Considerations
*   **File Uploads:** Endpoints expecting `attachmentUrl` or `cvUrl` imply the frontend must handle `multipart/form-data` uploads (via Multer on the backend) or direct S3 signed URLs if configured.
*   **WebSockets vs Polling:** Notifications currently rely on REST (`/api/notifications/unread-count`). The frontend must use short-polling or React Query background refetching.
*   **Data Separation:** The UI must gracefully handle the conceptual split between a `User` (auth/sys-admin context) and an `Employee` (HR context).

### 1.4 Complete Backend Scope Definition
*   **Fully Implemented:** Auth, RBAC, Multi-campus scoping, CRUD for Users/Employees, Leave/Sabbatical flows, Clearance flows, Job Board, Notifications, Audit Logs, Redis caching, Email notifications.
*   **Partially Implemented:** Reports/Analytics endpoints exist but rely heavily on how the frontend visualizes the aggregated data.
*   **Required Frontend Abstractions:** Axios interceptors for smooth token refresh, strictly typed Zod forms mapping to backend schemas, caching strategies using React Query.

---

## Phase 2: Frontend Architecture & Alignment Strategy

Act strictly as a **Senior Frontend Architect** adhering to these guidelines:

### 2.1 Core Tech Stack
*   **Framework:** React 18 with TypeScript via Vite.
*   **Routing:** React Router v6 (Data Router API with loaders/actions).
*   **State Management:**
    *   **Server State:** TanStack Query (React Query) v5 for all API interactions, caching, and invalidation.
    *   **Client State:** Zustand for lightweight global state (Auth User, Theme, Sidebar state).
*   **Form Management:** React Hook Form integrated with `@hookform/resolvers/zod`. Share `packages/types` schemas if possible, or mirror backend Zod schemas identically.
*   **UI Library:** Material-UI (MUI v5) or TailwindCSS + Radix UI (shadcn/ui). Both are acceptable; ensure high-quality data tables (pagination, sorting, filtering).
*   **HTTP Client:** Axios with global request interceptors (attaching JWT) and response interceptors (handling 401 token refresh logic and generic 500 Toast fallbacks).

### 2.2 Recommended Folder Structure
```text
packages/frontend/src/
├── api/             # Axios instance, generic fetchers, interceptors (api.client.ts)
├── assets/          # Static assets, SVG icons, logo
├── components/      # Shared UI (Button, Modal, CoreTable, FileUploader)
├── config/          # Environment variables, constants, UI enums
├── features/        # Feature-based modular structure
│   ├── auth/        # Auth APIs, forms, contexts, components
│   ├── leaves/      # Leave requests list, approval modals, forms
│   ├── clearance/   # Multi-unit clearance flows
│   ├── employees/   # Directory, profile cards
│   └── recruitment/ # Job board, application forms
├── hooks/           # Global custom hooks (useDebounce, useRoleAccess)
├── layouts/         # DashboardLayout (Sidebar, Topbar), AuthLayout
├── routes/          # Route definitions, ProtectedRoute, RoleGuard wrappers
├── store/           # Zustand stores (useAuthStore.ts, useUIStore.ts)
├── types/           # Frontend-focused TS types (merging backend types)
└── utils/           # Formatters (dates, currency, file-size), error extractors
```

### 2.3 Form Validation & Error Handling Strategy
*   **Validation:** Use Zod. If the backend schema dictates `leaveType: z.enum(['ANNUAL', 'SICK'])`, mirror it perfectly.
*   **Error Handling:**
    *   Extract backend error messages from `error.response?.data?.message`.
    *   Bind field-specific validation errors from `400 Bad Request` directly to React Hook Form inputs using `setError()`.
    *   For `500` or network errors, use a global Toast notification (e.g., `react-hot-toast` or `sonner`).

### 2.4 Role-Based UI Handling
*   Create a `<RoleGuard expectedRoles={['ADMIN', 'HR_OFFICER']}>` wrapper component to conditionally render sensitive buttons (e.g., "Delete User").
*   Implement `CampusContext` for `UNIVERSITY` scope users to switch between campuses, attaching `?campusId=X` to all API queries automatically via an Axios interceptor or React Query default params.

---

## Phase 3: Phase-by-Phase Execution Plan

### Phase 3.1: Foundation & Authentication (Week 1)
*   **What needs to be built:** Vite scaffolding, Axios setup, Auth Context, Login Screen, Password Reset Screen.
*   **Why it is needed:** Establishes the secure shell of the application. No other features can be built without verified identity and token refresh mechanics.
*   **Implementation steps:**
    1.  Setup Vite React TS project. Configure aliases (`@/*`).
    2.  Build `Axios` instance. Inject Bearer token from local storage/memory. Implement `axios.interceptors.response` intercepting 401s to call `/api/auth/refresh` and retry the original request.
    3.  Create Zustand `useAuthStore` to track `user`, `role`, `scope`, and `isAuthenticated`.
    4.  Build `/login` page using React Hook Form. Route to `/dashboard` on success.
    5.  Handle the `mustChangePassword` edge case by intercepting login responses and redirecting to a forced `/change-password` route.

### Phase 3.2: Dashboard & Core Directory (Week 2)
*   **What needs to be built:** Main App Layout (Sidebar, Header), Employee Directory, User Management.
*   **Why it is needed:** Provides navigation and the ability for HR/Admins to manage the foundational data (people) that all other workflows depend on.
*   **Implementation steps:**
    1.  Build `DashboardLayout` with a responsive sidebar containing links guarded by `useAuthStore().role`.
    2.  Implement `NotificationsMenu` in the header, querying `/api/notifications/unread-count` every 60s using React Query `refetchInterval`.
    3.  Build `/employees` data table. Use React Query `useQuery(['employees', page, filters])`. Implement server-side pagination.
    4.  Build `EmployeeProfile` drawer/page displaying `contactInfo`, `salaryDetails`, and `leaveBalances`.
    5.  Build `/users` management (ADMIN only) allowing role assignments.

### Phase 3.3: Leave & Sabbatical Workflows (Week 3)
*   **What needs to be built:** Leave request forms, Sabbatical forms, and Approvals Dashboard for Department Heads.
*   **Why it is needed:** Core HR operational feature.
*   **Implementation steps:**
    1.  **Forms:** Build `/leaves/request` using `FormData` if `attachmentUrl` requires uploading a file to Multer endpoints. Utilize date pickers enforcing `startDate < endDate`.
    2.  **Lists:** Employee view (`getEmployeeRequests`) vs Approver view (`getPendingRequests`).
    3.  **Actions:** Department Head view requires inline "Approve" / "Reject" (with modal for comments) mutating state via `useMutation` and calling `queryClient.invalidateQueries({ queryKey: ['leaves'] })`.

### Phase 3.4: Clearance & Exit Management (Week 4)
*   **What needs to be built:** Clearance initiation, Multi-Unit check interfaces, and Payroll Transfer views.
*   **Why it is needed:** Handles the complex offboarding process interactively.
*   **Implementation steps:**
    1.  **Employee initiates:** Flow to submit resignation/clearance.
    2.  **Unit Checking Board:** A Kanban or List view for users in various clearance units (Library, Finance) to fetch `getPendingChecksForUnit`.
    3.  **Check Actions:** Mutate `/api/clearances/:id/checks/:unitId/approve`.
    4.  **Edge cases:** Render the status of the overall clearance as a progress bar or timeline component (e.g., "3 of 5 units approved").

### Phase 3.5: Recruitment & Job Board (Week 5)
*   **What needs to be built:** Internal Job Postings UI, Application Form, Candidate Review Interface.
*   **Why it is needed:** Facilitates internal mobility.
*   **Implementation steps:**
    1.  **Job Board:** Card-based UI for `/jobs` fetching `getJobPostings`.
    2.  **Application Form:** `/jobs/:id/apply`. Critical requirement: Handle `cvUrl` file upload accurately. Must enforce UI validation preventing Committee members from applying.
    3.  **Review Dashboard:** HR/Committee view (`getApplicationsForJob`) showing tabular list of candidates with a slide-out PDF viewer for CVs. Action buttons to update status to `SHORTLISTED` or `REJECTED`.

### Phase 3.6: System Administration, Analytics & Polish (Week 6)
*   **What needs to be built:** Audit Logs Viewer, Chart Dashboards, Loading States.
*   **Why it is needed:** System transparency, compliance, and UX perfection.
*   **Implementation steps:**
    1.  **Audit Logs:** Build a high-performance grid for `/audit` with heavy filtering capabilities (Date range, Action type, User ID).
    2.  **Dashboard Analytics:** Implement `Chart.js` or `Recharts` using `/api/reports/dashboard` to show beautiful visualizations of HR metrics.
    3.  **UX Polish:** Add `NProgress` to router transitions. Add skeleton loaders for all major tables and profile cards to prevent UI layout jumps.

---

## Testing & Quality Assurance Strategy
1.  **Component Tests (Vitest + React Testing Library):** Focus on rendering complex components like the Mult-Unit Clearance timeline and RoleGuard wrappers.
2.  **State Testing:** Test custom hooks and Zustand logic independently from the UI.
3.  **API Mocking (MSW):** Implement Mock Service Worker for robust testing of React Query mutations (e.g., simulating a 403 Forbidden on Leave Approval and ensuring the error toast appears).
4.  **E2E (Playwright/Cypress):** Fully map three critical user journeys:
    *   *Journey A:* HR Officer logs in -> Posts a new Job.
    *   *Journey B:* Employee attempts to apply -> Uploads CV -> Submits.
    *   *Journey C:* Department Head logs in -> Approves Leave.

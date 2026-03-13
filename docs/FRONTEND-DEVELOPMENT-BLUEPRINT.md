# HRMS Frontend Development Blueprint

**Version:** 1.0  
**Status:** Analysis & Planning  
**Backend Reference:** `docs/architecture/backend-analysis.md`

This document provides a production-grade, step-by-step implementation plan for the HRMS frontend. It is derived from full backend analysis and a reference UI design image.

---

## Table of Contents

1. [Backend Analysis Summary](#1-backend-analysis-summary)
2. [Product Structure & Feature Map](#2-product-structure--feature-map)
3. [UI Architecture](#3-ui-architecture)
4. [Design System Specification](#4-design-system-specification)
5. [Screen Planning](#5-screen-planning)
6. [Implementation Roadmap](#6-implementation-roadmap)
7. [API Integration Plan](#7-api-integration-plan)
8. [Reusable Component Strategy](#8-reusable-component-strategy)
9. [UX Patterns](#9-ux-patterns)
10. [Summary](#10-summary)

---

## 1. Backend Analysis Summary

### 1.1 Modules and REST Endpoints

| Module | Base Path | Endpoints | Auth |
|--------|-----------|-----------|------|
| **Auth** | `/api/v1/auth` | `POST /register`, `POST /login`, `GET /me`, `POST /refresh`, `POST /logout`, `POST /change-password` | Varies |
| **Users** | `/api/v1/users` | `GET /`, `GET /:id`, `PATCH /:id/role`, `PATCH /:id/status`, `POST /:id/reset-password` | Admin |
| **Employees** | `/api/v1/employees` | `GET /:id`, `PATCH /:id` | Admin/HR/Dept Head/Finance (view); Admin/HR (update) |
| **Campuses** | `/api/v1/campuses` | `GET /`, `POST /`, `GET /:id`, `GET /:id/readiness`, `PATCH /:id`, `GET /:id/users` | University Admin (CRUD) |
| **Departments** | `/api/v1/departments` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `PATCH /:id/head`, `DELETE /:id` | Auth + campus scope |
| **Leave** | `/api/v1/leave` | `POST /`, `GET /`, `GET /my`, `GET /pending`, `PATCH /:id/approve`, `PATCH /:id/reject` | Auth + role-based |
| **Sabbatical** | `/api/v1/sabbatical` | `POST /`, `GET /`, `PATCH /:id/approve`, `PATCH /:id/reject` | Auth + role-based |
| **Clearance** | `/api/v1/clearance` | `POST /requests`, `GET /requests/:id`, `PATCH /requests/:id/approve-check`, `PATCH /requests/:id/reject-check`, `GET /units/:unitId/pending` | Auth |
| **Recruitment** | `/api/v1/recruitment` | `GET /postings`, `GET /postings/:id`, `POST /postings`, `PATCH /postings/:id/status`, `POST /apply`, `GET /my-applications`, `GET /postings/:id/applications`, `PATCH /applications/:id/status` | Auth + role-based |
| **Payroll** | `/api/v1/payroll` | `GET /data-transfer` | Admin/HR/Finance |
| **Reports** | `/api/v1/reports` | `GET /summary`, `GET /leave`, `GET /departments`, `GET /recruitment` | Admin/HR |
| **Notifications** | `/api/v1/notifications` | `GET /`, `GET /unread-count`, `PATCH /read-all`, `PATCH /:id/read` | Auth |
| **Audit Logs** | `/api/v1/audit-logs` | `GET /`, `GET /my-logs`, `GET /export`, `GET /:id` | Auth; Admin/HR for full logs |

### 1.2 Authentication Flow

- **Login:** `POST /auth/login` with `{ employeeId, password }`. Returns `accessToken`, `refreshToken`, `user`.
- **Token Refresh:** `POST /auth/refresh` with `{ refreshToken }` when access token expires.
- **Protected Routes:** All domain routes require `Authorization: Bearer <accessToken>`.
- **Password Change Required:** If `user.mustChangePassword` is true, redirect to `/force-password-change`; all other APIs return `PASSWORD_CHANGE_REQUIRED` (403).
- **CSRF:** State-changing routes (`leave`, `sabbatical`, `clearance`, `users`) use CSRF token (non-test env). Fetch via `GET /api/v1/csrf-token` before mutation.

### 1.3 Authorization Roles

| Role | Scope | Capabilities |
|------|-------|--------------|
| **ADMIN** | CAMPUS or UNIVERSITY | Full campus or university-wide control. University Admin: campus CRUD, cross-campus access. |
| **HR_OFFICER** | CAMPUS | User management, employee updates, leave/sabbatical approval, reports, audit logs. |
| **DEPARTMENT_HEAD** | CAMPUS | View employees in dept, approve leave, clearance unit approvals. |
| **FINANCE_OFFICER** | CAMPUS | Payroll data-transfer, employee view. |
| **RECRUITMENT_COMMITTEE** | CAMPUS | Job postings, application status management. |
| **EMPLOYEE** | CAMPUS | Self-service: leave, sabbatical, clearance init, job apply, own profile. |

### 1.4 Entity Models (Summary)

- **Campus:** Root tenant; config (timezone, employeeIdPrefix, etc.).
- **User:** Auth; links to Employee; `role`, `scope`, `campusId`.
- **Employee:** HR data; `departmentId`, `hireDate`, `grossSalary`, etc.
- **Department:** Campus-scoped; optional `headEmployeeId`.
- **LeaveRequest / LeaveBalance:** Leave types (ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID).
- **SabbaticalRequest:** 7+ years service; `purpose`, `plan`, dates.
- **ClearanceRequest / ClearanceUnit / ClearanceCheck:** Multi-step exit clearance.
- **PayrollTransfer:** Generated on clearance completion.
- **JobPosting / JobApplication:** Internal recruitment.
- **Notification, AuditLog, RefreshToken**

### 1.5 Pagination and Filtering

- **Audit Logs:** Offset-based: `?page=1&limit=50`; filters: `userId`, `action`, `entityType`, `startDate`, `endDate`. Response: `{ data, pagination: { page, limit, total, pages } }`.
- **Pagination Helper (other modules):** Cursor-based: `?cursor=X&limit=Y`. Response: `{ data, pagination: { nextCursor, hasMore, count } }`.

### 1.6 Error Response Format

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": { ... },
  "timestamp": "2026-03-05T12:00:00Z",
  "requestId": "uuid"
}
```

**Error codes to handle:** `VALIDATION_ERROR` (400), `AUTHENTICATION_FAILED` (401), `PASSWORD_CHANGE_REQUIRED` (403), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` / `UNIQUE_CONSTRAINT_VIOLATION` (409), `INSUFFICIENT_BALANCE` (400), `INVALID_DATE_RANGE` (400).

### 1.7 Backend-to-UI Capability Mapping

| Backend Module | UI Capability |
|----------------|---------------|
| Auth | Login, Force Password Change, Session/Refresh |
| Users | User/Employee directory, role/status management |
| Employees | Profile view/edit, employee detail |
| Campuses | Campus list, create, edit, readiness (University Admin) |
| Departments | Department CRUD, assign head |
| Leave | Leave request form, history, pending approvals |
| Sabbatical | Sabbatical request form, history, approvals |
| Clearance | Initiate clearance, tracker, unit approvals |
| Recruitment | Job board, create job, apply, applicant management |
| Payroll | Payroll data transfer (month/year filter) |
| Reports | Dashboard summary, leave/department/recruitment stats |
| Notifications | Notification dropdown, mark read |
| Audit | Audit log list, filters, export |

**Note on "Claims":** The reference UI mentions "Active Claims", "Pending Claims Approval", "Claimed Amount". The backend has no dedicated Claims module. Map these to: **Active Claims** → Pending clearances, **Pending Claims Approval** → Pending leave/sabbatical approvals, **Claimed Amount** → Payroll total or aggregated salary display from payroll data.

---

## 2. Product Structure & Feature Map

### 2.1 Feature Map

```
Auth
├── Login
├── Force Password Change
└── Logout (via header)

Dashboard
├── Summary metrics (employees, pending leaves, open jobs, etc.)
├── Quick actions (role-based)
├── Recent activity (audit logs)
└── Upcoming holidays (if backend supports; else placeholder)

Employee Management
├── User/Employee Directory (Admin)
├── Employee Profile (view)
├── Employee Profile Edit (Admin/HR)
└── User Role/Status management (Admin)

Campus Management (University Admin only)
├── Campus List
├── Campus Create
├── Campus Edit
└── Campus Readiness

Department Management
├── Department List
├── Department Create
├── Department Edit
├── Assign Department Head
└── Department Delete

HR Operations
├── Leave Management
│   ├── Request Leave
│   ├── My Leave History
│   └── Pending Leave Approvals (HR/Dept Head)
├── Sabbatical Management
│   ├── Request Sabbatical
│   ├── My Sabbatical History
│   └── Pending Sabbatical Approvals
├── Clearance Process
│   ├── Initiate Clearance
│   ├── Clearance Tracker
│   └── Unit Pending Approvals
└── Recruitment
    ├── Job Board
    ├── Create Job (HR/Recruitment)
    ├── Job Detail & Apply
    └── Applicant Management (Recruitment)

Payroll
└── Payroll Data Transfer (Admin/HR/Finance)

Reports & Analytics
├── Dashboard Summary
├── Leave Stats
├── Department Stats
└── Recruitment Stats

Settings & Admin
├── Audit Logs
├── Audit Export
└── User Management (Admin)
```

### 2.2 User Flows (Role-Based)

| Role | Primary Flows |
|------|---------------|
| Employee | Login → Dashboard → Request Leave / Apply for Job / Initiate Clearance → Profile |
| Dept Head | + Pending Leave Approvals, Clearance unit approvals |
| HR Officer | + User directory, Employee edit, Leave/Sabbatical approvals, Reports, Audit |
| Admin | + Full user management, Department management, Campus (if University scope) |
| University Admin | + Campus CRUD, Campus Readiness |
| Finance Officer | + Payroll data transfer, Employee view |
| Recruitment Committee | + Job creation, Applicant status management |

---

## 3. UI Architecture

### 3.1 Recommended Folder Structure

```
src/
├── api/
│   ├── client.ts              # Axios instance, interceptors
│   ├── auth.api.ts
│   ├── users.api.ts
│   ├── employees.api.ts
│   ├── campuses.api.ts
│   ├── departments.api.ts
│   ├── leave.api.ts
│   ├── sabbatical.api.ts
│   ├── clearance.api.ts
│   ├── recruitment.api.ts
│   ├── payroll.api.ts
│   ├── reports.api.ts
│   ├── notifications.api.ts
│   └── audit.api.ts
│
├── components/
│   ├── ui/                    # Base design system components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Avatar.tsx
│   │   └── Tabs.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── DashboardLayout.tsx
│   │   └── AuthLayout.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── SearchBar.tsx
│       ├── FilterPanel.tsx
│       ├── StatusBadge.tsx
│       ├── ConfirmDialog.tsx
│       └── EmptyState.tsx
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── employees/
│   ├── leave/
│   ├── sabbatical/
│   ├── clearance/
│   ├── recruitment/
│   ├── payroll/
│   ├── reports/
│   ├── departments/
│   ├── campuses/
│   ├── users/
│   └── audit/
│
├── layouts/
│   ├── AuthLayout.tsx
│   └── DashboardLayout.tsx
│
├── pages/
│   ├── LoginPage.tsx
│   ├── ForcePasswordChangePage.tsx
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx
│   ├── UserListPage.tsx
│   ├── EmployeeDetailPage.tsx
│   ├── CampusListPage.tsx
│   ├── DepartmentListPage.tsx
│   ├── LeaveRequestPage.tsx
│   ├── LeaveApprovalsPage.tsx
│   ├── SabbaticalRequestPage.tsx
│   ├── SabbaticalApprovalsPage.tsx
│   ├── ClearancePage.tsx
│   ├── ClearanceApprovalsPage.tsx
│   ├── JobBoardPage.tsx
│   ├── JobDetailPage.tsx
│   ├── JobApplicantsPage.tsx
│   ├── PayrollPage.tsx
│   ├── AuditLogsPage.tsx
│   └── NotFoundPage.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── usePagination.ts
│
├── store/
│   ├── useAuthStore.ts
│   └── useUIStore.ts
│
├── types/
│   └── index.ts               # API response types, enums
│
├── utils/
│   ├── formatters.ts          # date, currency
│   ├── errorParser.ts         # map backend errors to form errors
│   └── constants.ts
│
├── routes/
│   └── index.tsx              # Route definitions + guards
│
├── App.tsx
└── main.tsx
```

### 3.2 Component Hierarchy

```
App
└── Router
    ├── AuthLayout (unauthenticated)
    │   ├── LoginPage
    │   └── ForcePasswordChangePage
    └── DashboardLayout (authenticated)
        ├── Sidebar (role-based nav)
        ├── Topbar (notifications, profile)
        └── Outlet
            ├── DashboardPage
            ├── ProfilePage
            ├── UserListPage
            ├── ... (all feature pages)
            └── NotFoundPage
```

### 3.3 State Management

- **Auth:** Zustand store (`useAuthStore`) for `user`, `accessToken`, `refreshToken`, `isAuthenticated`.
- **Server State:** React Query for all API data (employees, leave, jobs, etc.).
- **UI State:** Zustand `useUIStore` for sidebar collapsed, notifications dropdown open, etc.

### 3.4 Routing Structure

```
/login
/force-password-change
/dashboard
/profile
/profile/:id?                    # For admins viewing others
/users                           # Admin: user directory
/employees                       # Alias or redirect; list from /users
/employees/:id                   # Employee detail
/campuses                        # University Admin
/campuses/:id
/departments
/leave                           # My requests
/leave/approvals
/sabbatical
/sabbatical/approvals
/clearance
/clearance/approvals
/jobs
/jobs/create
/jobs/:id
/jobs/:id/applicants
/payroll
/reports
/audit-logs
/*
  └── NotFoundPage
```

---

## 4. Design System Specification

*(Derived from MapleHR.io reference image; do not copy text/content from the image)*

### 4.1 Typography System

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-xs` | 12px | 400 | Secondary labels, IDs |
| `text-sm` | 14px | 400 | Body, navigation items |
| `text-base` | 16px | 400 | Default body |
| `text-lg` | 18px | 600 | Section titles |
| `text-xl` | 20px | 600 | Page titles |
| `text-2xl` | 24px | 700 | Dashboard metric values, brand |
| Font family | — | — | Sans-serif (Inter, Roboto, or system-ui) |

### 4.2 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps |
| `space-2` | 8px | Icon padding |
| `space-3` | 12px | Small gaps |
| `space-4` | 16px | Card padding, list spacing |
| `space-5` | 20px | Section spacing |
| `space-6` | 24px | Major section padding |
| `space-8` | 32px | Page margins |

### 4.3 Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| **Primary** | `#38A752` | Brand, active nav, primary buttons |
| **Primary Light** | `#E8F6EE` | Icon backgrounds (success) |
| ** Danger** | `#EF4444` | Errors, reject, delete |
| **Danger Light** | `#FFE3DD` | Pending approval icon bg |
| **Warning** | `#F59E0B` | Pending, warning states |
| **Purple** | `#8B5CF6` | Active claims/clearance accent |
| **Purple Light** | `#EDE5FF` | Icon bg |
| **Info** | `#3B82F6` | Info, links |
| **Info Light** | `#E0F2FE` | Icon bg |
| **Background** | `#F9FAFB` | Page background |
| **Surface** | `#FFFFFF` | Card, sidebar bg |
| **Text Primary** | `#111827` | Headings, primary text |
| **Text Secondary** | `#6B7280` | Labels, descriptions |
| **Border** | `#E5E7EB` | Borders, dividers |

### 4.4 Shadows

- **Card:** `0 1px 3px rgba(0,0,0,0.08)` — subtle lift
- **Dropdown:** `0 4px 6px rgba(0,0,0,0.1)` — elevated

### 4.5 Border Radius

- **Cards, inputs:** `8px` to `12px`
- **Buttons:** `8px`
- **Avatars:** `50%` (circle)
- **Badges:** `6px`

### 4.6 Component Style

| Component | Style |
|-----------|-------|
| **Sidebar** | White bg, vertical nav. Active item: green bg, white text. Inactive: dark grey text. Expandable sections with chevron. |
| **Topbar** | Minimal; notification icon, help icon, profile dropdown. |
| **Dashboard Cards** | White card, subtle shadow. Large numeric value; small colored icon (circular bg). Label below. |
| **Buttons** | Rounded, consistent padding. Primary: green bg. Secondary: light grey bg, dark text. |
| **Tabs** | Pill-style. Active: green bg, white text. Inactive: light grey bg. |
| **Tables** | Minimal borders; bold headers; avatar + text for people; right-align dates/numbers. |
| **Forms** | Light border; rounded corners; focus: green border or ring. |
| **Modals** | Centered overlay, rounded corners, shadow. |
| **Status Badges** | PENDING: warning; APPROVED: success; REJECTED: danger. |

### 4.7 Icon Usage

- Outlined/stroke icons (not filled).
- Inactive: dark grey; Active: white on green.
- Dashboard cards: colored icons in circular light-bg containers.

---

## 5. Screen Planning

### 5.1 Complete Screen List

| Screen | Purpose | APIs | Roles | Key Components | Actions |
|--------|---------|------|-------|----------------|---------|
| **Login** | Authenticate | `POST /auth/login` | All | LoginForm | Submit |
| **Force Password Change** | Required first-time flow | `POST /auth/change-password` | All | ChangePasswordForm | Submit |
| **Dashboard** | Overview | `GET /reports/summary`, `GET /notifications/unread-count` | Admin, HR | StatCards, QuickActions, RecentActivity | Navigate |
| **Profile (Self)** | View/edit own profile | `GET /employees/:id`, `PATCH /employees/:id` | All | ProfileHeader, ContactInfoForm | Update |
| **User Directory** | List users/employees | `GET /users` | Admin | DataTable, SearchBar | View, Role/Status, Reset Password |
| **Employee Detail** | View employee | `GET /employees/:id` | Admin, HR, Dept Head, Finance | ProfileHeader, Info sections | Edit (Admin/HR) |
| **Campus List** | List campuses | `GET /campuses` | University Admin | DataTable | Create, Edit |
| **Campus Create/Edit** | CRUD campus | `POST /campuses`, `PATCH /campuses/:id` | University Admin | CampusForm | Submit |
| **Campus Readiness** | Check readiness | `GET /campuses/:id/readiness` | University Admin | ReadinessCheck | — |
| **Department List** | CRUD departments | `GET /departments`, `POST`, `PATCH`, `DELETE` | Admin, HR | DataTable, DepartmentForm | Create, Edit, Assign Head, Delete |
| **Leave Request** | Request leave | `POST /leave`, `GET /leave/my` | All | LeaveRequestForm, LeaveHistoryTable | Submit, View history |
| **Leave Approvals** | Approve/reject | `GET /leave/pending`, `PATCH /leave/:id/approve|reject` | HR, Dept Head | PendingLeavesList, DecisionModal | Approve, Reject |
| **Sabbatical Request** | Request sabbatical | `POST /sabbatical`, `GET /sabbatical` | All (7+ yrs) | SabbaticalForm, HistoryTable | Submit |
| **Sabbatical Approvals** | Approve/reject | `PATCH /sabbatical/:id/approve|reject` | HR, Admin | Similar to Leave | Approve, Reject |
| **Clearance Initiate** | Start clearance | `POST /clearance/requests`, `GET /requests/:id` | All | InitiateForm, ClearanceTracker | Submit, Track |
| **Clearance Approvals** | Unit approvals | `GET /clearance/units/:unitId/pending`, `PATCH approve-check` | Unit heads | PendingChecksList, ApproveModal | Approve, Reject |
| **Job Board** | Browse jobs | `GET /recruitment/postings` | All | JobCardGrid | Apply |
| **Job Create** | Create posting | `POST /recruitment/postings` | HR, Recruitment | JobPostingForm | Submit |
| **Job Detail** | View job, apply | `GET /postings/:id`, `POST /apply` | All | JobDetail, ApplicationModal | Apply |
| **Job Applicants** | Manage applicants | `GET /postings/:id/applications`, `PATCH /applications/:id/status` | Recruitment | ApplicantTable/Kanban | Update status |
| **Payroll** | View transfer data | `GET /payroll/data-transfer` | Admin, HR, Finance | PayrollTable, MonthYearFilter | Filter, Export |
| **Reports** | Analytics | `GET /reports/leave`, `/departments`, `/recruitment` | Admin, HR | StatsCharts, Tables | Filter |
| **Audit Logs** | Security logs | `GET /audit-logs`, `/my-logs`, `/export` | Admin (full), All (my) | DataTable, FilterPanel | Filter, Export |
| **NotFound** | 404 | — | All | EmptyState | Go home |

---

## 6. Implementation Roadmap

### Phase 1 — Project Setup (Est: 0.5–1 day)

- [ ] Initialize/confirm Vite + React + TypeScript setup.
- [ ] Configure Tailwind CSS (or adopt design tokens from spec).
- [ ] Set up Axios client, base URL, and global interceptors (token attach, 401 refresh, 403 password-change redirect, error mapping).
- [ ] Set up React Query (QueryClient, default options).
- [ ] Create Zustand stores: `useAuthStore`, `useUIStore`.
- [ ] Define shared TypeScript types for API responses.
- [ ] Set up React Router with basic structure.

**Deliverables:** `api/client.ts`, `store/useAuthStore.ts`, `routes/index.tsx`.

---

### Phase 2 — Design System (Est: 1–2 days)

- [ ] Implement base UI components: Button, Input, Select, Card, Badge, Skeleton, Avatar, Modal, Tabs.
- [ ] Define design tokens (colors, spacing, radii, typography) in CSS variables or Tailwind config.
- [ ] Implement StatusBadge with role-based color mapping.
- [ ] Build EmptyState, ConfirmDialog.

**Deliverables:** `components/ui/*`, `index.css` (tokens).

---

### Phase 3 — Authentication Pages (Est: 0.5–1 day)

- [ ] Login page: employeeId + password, submit to `POST /auth/login`.
- [ ] Handle `mustChangePassword` → redirect to force-password-change.
- [ ] Force Password Change page: current + new + confirm; `POST /auth/change-password`.
- [ ] Auth layout (centered card, minimal chrome).
- [ ] Protected route guard: redirect unauthenticated to `/login`.

**APIs:** `POST /auth/login`, `POST /auth/change-password`.

---

### Phase 4 — Application Layout (Est: 1–1.5 days)

- [ ] Dashboard layout: Sidebar + Topbar + content area.
- [ ] Sidebar: logo, nav items (role-based visibility), profile summary at bottom.
- [ ] Topbar: notifications icon (unread count), profile dropdown, logout.
- [ ] Responsive: collapsible sidebar on smaller screens.

**APIs:** `GET /auth/me`, `GET /notifications/unread-count`.

---

### Phase 5 — Core Dashboard (Est: 1 day)

- [ ] Dashboard page with StatCards: map `GET /reports/summary` (employeeCount, pendingLeaveCount, activeClearanceCount, openJobsCount, pendingSabbaticalCount).
- [ ] Quick actions (Request Leave, Post Job, etc.) based on role.
- [ ] Recent activity from `GET /audit-logs/my-logs` (first page).

**APIs:** `GET /reports/summary`, `GET /audit-logs/my-logs`, `GET /notifications/unread-count`.

---

### Phase 6 — Employee & User Management (Est: 1.5–2 days)

- [ ] User List page: `GET /users`, DataTable with columns (ID, name, email, role, status).
- [ ] Role/status modals: `PATCH /users/:id/role`, `PATCH /users/:id/status`.
- [ ] Reset password: `POST /users/:id/reset-password`.
- [ ] Profile page: `GET /employees/:id` (self or by id), ProfileHeader, ContactInfoForm.
- [ ] Employee update: `PATCH /employees/:id` (Admin/HR only).

**APIs:** `GET /users`, `GET /users/:id`, `PATCH /users/:id/role`, `PATCH /users/:id/status`, `POST /users/:id/reset-password`, `GET /employees/:id`, `PATCH /employees/:id`.

---

### Phase 7 — Campus & Department Management (Est: 1–1.5 days)

- [ ] Campus List (University Admin): `GET /campuses`, create/edit forms.
- [ ] Campus Create/Edit: `POST /campuses`, `PATCH /campuses/:id`.
- [ ] Campus Readiness: `GET /campuses/:id/readiness`.
- [ ] Department List: `GET /departments`, create/edit/delete.
- [ ] Assign Head: `PATCH /departments/:id/head` with employee search.

**APIs:** Campus and Department CRUD endpoints.

---

### Phase 8 — HR Workflows: Leave & Sabbatical (Est: 2 days)

- [ ] Leave Request page: form (type, start, end, reason), `POST /leave`, history from `GET /leave/my`.
- [ ] Leave Approvals page: `GET /leave/pending`, approve/reject modals.
- [ ] Sabbatical Request page: form (purpose, dates, plan), `POST /sabbatical`, history.
- [ ] Sabbatical Approvals: approve/reject.

**APIs:** Leave and Sabbatical endpoints.

---

### Phase 9 — Clearance & Recruitment (Est: 2–2.5 days)

- [ ] Clearance Initiate: form (reason, lastWorkingDay), `POST /clearance/requests`.
- [ ] Clearance Tracker: `GET /clearance/requests/:id`, visual stepper.
- [ ] Clearance Approvals: `GET /clearance/units/:unitId/pending`, approve/reject.
- [ ] Job Board: `GET /recruitment/postings`, JobCardGrid.
- [ ] Job Create: `POST /recruitment/postings`.
- [ ] Job Detail & Apply: `POST /recruitment/apply`.
- [ ] Applicants: `GET /postings/:id/applications`, `PATCH /applications/:id/status`.

**APIs:** Clearance and Recruitment endpoints.

---

### Phase 10 — Payroll, Reports, Audit (Est: 1.5 days)

- [ ] Payroll page: `GET /payroll/data-transfer` with month/year filter.
- [ ] Reports page: `GET /reports/leave`, `/departments`, `/recruitment`; charts/tables.
- [ ] Audit Logs: `GET /audit-logs` (filters), `GET /audit-logs/export`.

**APIs:** Payroll, Reports, Audit endpoints.

---

### Phase 11 — Error Handling & Polish (Est: 1 day)

- [ ] Global error boundary.
- [ ] Toast notifications for success/error.
- [ ] Map `VALIDATION_ERROR` details to form fields.
- [ ] Loading skeletons for tables and cards.
- [ ] Empty states for lists.
- [ ] Responsive polish.
- [ ] 404 page.

---

## 7. API Integration Plan

### 7.1 Auth

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/auth/login` | POST | `{ employeeId, password }` | `{ accessToken, refreshToken, user }` | LoginPage |
| `/auth/refresh` | POST | `{ refreshToken }` | `{ accessToken, refreshToken }` | Axios interceptor |
| `/auth/change-password` | POST | `{ currentPassword, newPassword }` | `{ message }` | ForcePasswordChangePage |
| `/auth/me` | GET | — | User object | useAuthStore, Topbar |
| `/auth/logout` | POST | `{ refreshToken }` | — | useAuthStore |

### 7.2 Users

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/users` | GET | — | `User[]` (incl. employee) | UserListPage |
| `/users/:id` | GET | — | User | UserDetailModal |
| `/users/:id/role` | PATCH | `{ role }` | User | RoleModal |
| `/users/:id/status` | PATCH | `{ isActive }` | User | StatusToggle |
| `/users/:id/reset-password` | POST | — | `{ message }` | ResetPasswordModal |

### 7.3 Employees

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/employees/:id` | GET | — | Employee (full) | ProfilePage, EmployeeDetailPage |
| `/employees/:id` | PATCH | `updateEmployeeSchema` | Employee | ProfilePage form |

### 7.4 Campuses

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/campuses` | GET | — | Campus[] | CampusListPage |
| `/campuses` | POST | campus body | Campus | CampusCreateForm |
| `/campuses/:id` | GET | — | Campus | CampusEditForm |
| `/campuses/:id` | PATCH | partial campus | Campus | CampusEditForm |
| `/campuses/:id/readiness` | GET | — | Readiness object | CampusReadinessCard |

### 7.5 Departments

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/departments` | GET | — | Department[] | DepartmentListPage |
| `/departments` | POST | `{ name, campusId }` | Department | DepartmentForm |
| `/departments/:id` | PATCH | `{ name }` | Department | DepartmentForm |
| `/departments/:id/head` | PATCH | `{ headEmployeeId }` | Department | AssignHeadModal |
| `/departments/:id` | DELETE | — | — | Delete confirm |

### 7.6 Leave

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/leave` | POST | `createLeaveRequestSchema` | LeaveRequest | LeaveRequestForm |
| `/leave/my` | GET | — | LeaveRequest[] | LeaveHistoryTable |
| `/leave/pending` | GET | — | LeaveRequest[] | LeaveApprovalsPage |
| `/leave/:id/approve` | PATCH | `{ comment? }` | LeaveRequest | ApproveModal |
| `/leave/:id/reject` | PATCH | `{ comment }` | LeaveRequest | RejectModal |

### 7.7 Sabbatical

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/sabbatical` | POST | `{ purpose, startDate, endDate, plan }` (+ file) | SabbaticalRequest | SabbaticalForm |
| `/sabbatical` | GET | — | SabbaticalRequest[] | SabbaticalHistory |
| `/sabbatical/:id/approve` | PATCH | `{ comment? }` | SabbaticalRequest | ApproveModal |
| `/sabbatical/:id/reject` | PATCH | `{ comment }` | SabbaticalRequest | RejectModal |

### 7.8 Clearance

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/clearance/requests` | POST | `{ reason, lastWorkingDay }` | ClearanceRequest | InitiateForm |
| `/clearance/requests/:id` | GET | — | ClearanceRequest + checks | ClearanceTracker |
| `/clearance/requests/:id/approve-check` | PATCH | `{ unitId, comment? }` | — | ApproveCheckModal |
| `/clearance/requests/:id/reject-check` | PATCH | `{ unitId, comment }` | — | RejectCheckModal |
| `/clearance/units/:unitId/pending` | GET | — | Pending checks | ClearanceApprovalsPage |

### 7.9 Recruitment

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/recruitment/postings` | GET | — | JobPosting[] | JobBoardPage |
| `/recruitment/postings/:id` | GET | — | JobPosting | JobDetailPage |
| `/recruitment/postings` | POST | `createJobPostingSchema` | JobPosting | JobCreateForm |
| `/recruitment/postings/:id/status` | PATCH | `{ status }` | JobPosting | ToggleJobStatus |
| `/recruitment/apply` | POST | `{ jobPostingId, coverLetter, cvUrl }` (multipart cv) | JobApplication | ApplicationModal |
| `/recruitment/my-applications` | GET | — | JobApplication[] | MyApplications |
| `/recruitment/postings/:id/applications` | GET | — | JobApplication[] | ApplicantsPage |
| `/recruitment/applications/:id/status` | PATCH | `{ status, reviewComment? }` | JobApplication | ApplicantStatusModal |

### 7.10 Payroll

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/payroll/data-transfer` | GET | `?month=&year=` | `{ period, count, data }` | PayrollPage |

### 7.11 Reports

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/reports/summary` | GET | — | `{ employeeCount, pendingLeaveCount, ... }` | DashboardPage |
| `/reports/leave` | GET | — | Grouped stats | ReportsPage |
| `/reports/departments` | GET | — | Dept stats | ReportsPage |
| `/reports/recruitment` | GET | — | Job + application counts | ReportsPage |

### 7.12 Notifications & Audit

| Endpoint | Method | Request | Response | Consumed By |
|----------|--------|---------|----------|-------------|
| `/notifications` | GET | — | Notification[] | NotificationDropdown |
| `/notifications/unread-count` | GET | — | `{ count }` | Topbar badge |
| `/notifications/:id/read` | PATCH | — | — | Mark read |
| `/audit-logs` | GET | `?page=&limit=&userId=&action=&entityType=&startDate=&endDate=` | `{ data, pagination }` | AuditLogsPage |
| `/audit-logs/my-logs` | GET | Same filters | Same | Dashboard RecentActivity |
| `/audit-logs/export` | GET | Filters | JSON download | Export button |

---

## 8. Reusable Component Strategy

| Component | Purpose | Used In |
|-----------|---------|---------|
| **DataTable** | Sortable, paginated table | UserList, DepartmentList, LeaveApprovals, AuditLogs, JobApplicants |
| **SearchBar** | Debounced search input | UserList, JobBoard |
| **FilterPanel** | Multi-filter UI | AuditLogs, Reports, Payroll |
| **FormField** | Label + input + error | All forms |
| **Modal** | Centered overlay | Approve/Reject, Assign Head, Create Job, Application |
| **ConfirmDialog** | Yes/No confirmation | Delete department, Reject leave |
| **Sidebar** | Nav + profile | DashboardLayout |
| **DashboardCard** | Metric card with icon | Dashboard |
| **StatusBadge** | PENDING/APPROVED/REJECTED etc. | Leave, Sabbatical, Clearance, Jobs |
| **EmptyState** | No data message | Empty lists |
| **Skeleton** | Loading placeholder | Tables, cards |
| **Avatar** | User/employee image | Sidebar, tables, profile |
| **Tabs** | Tab navigation | Profile, Dashboard sections |

---

## 9. UX Patterns

### 9.1 Loading States

- Use skeleton loaders for tables and cards; avoid generic spinners for content.
- React Query `isLoading` → show skeletons; `isFetching` (refetch) → optional subtle indicator.

### 9.2 Error Handling

- **401:** Silent refresh; on failure → logout, redirect to login.
- **403 PASSWORD_CHANGE_REQUIRED:** Redirect to `/force-password-change`.
- **403 FORBIDDEN:** Show toast "Access Denied"; optionally hide UI elements.
- **404:** Toast or inline "Not found" + link to list.
- **VALIDATION_ERROR:** Map `details` to form `setError` for inline field errors.
- **Generic:** Toast with `message`; log `requestId` for support.

### 9.3 Empty States

- Friendly illustration or icon + message + CTA (e.g., "No pending leaves" + "Request Leave" button).

### 9.4 Pagination

- **Audit logs:** Offset `page`/`limit`; show page numbers or prev/next.
- **Other list APIs:** If cursor-based, use "Load More" with `nextCursor`.

### 9.5 Form Validation

- Client-side: Zod schemas aligned with backend.
- On submit, show backend `VALIDATION_ERROR` details on fields.
- Disable submit while loading.

### 9.6 Notifications

- Success: Short toast.
- Error: Toast with message.
- Use `react-toastify` or similar; position top-right.

---

## 10. Summary

This blueprint provides:

- **Backend mapping:** All modules, endpoints, auth, roles, entities, errors.
- **Feature map:** Auth, Dashboard, Employee, Campus, Department, HR workflows, Payroll, Reports, Audit.
- **UI architecture:** Folder structure, components, state, routing.
- **Design system:** Typography, spacing, colors, shadows, components (from reference image).
- **Screen list:** 20+ screens with purpose, APIs, roles, components, actions.
- **10-phase implementation roadmap** from setup to polish.
- **API integration plan** per module.
- **Reusable components** and **UX patterns** for loading, errors, empty states, pagination, forms, notifications.

**Existing stack:** React, Vite, MUI, React Query, Zustand, React Router, React Hook Form, Zod, Axios.

**Recommendation:** Consider complementing or replacing MUI with a Tailwind-based design system to match the reference image (MapleHR.io) more closely. The design spec in §4 can be implemented with Tailwind tokens and custom components.

---

*End of Blueprint*

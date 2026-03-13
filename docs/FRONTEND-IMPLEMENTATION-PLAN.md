# HRMS Frontend Implementation Plan

**Context:** This document outlines the comprehensive roadmap and architecture for building the frontend of the HR Management System. Designed for a senior frontend engineering team, it acts as a step-by-step implementation blueprint derived directly from the application architecture and backend specifications.

---

## 1. Application Structure

The recommended frontend architecture follows a Feature-Sliced Design (FSD) approach, promoting high cohesion and modularity. This structure scales elegantly as enterprise HR features expand.

```text
src/
├── api/             # API transport layer, Axios clients, interceptors
├── assets/          # Static assets (images, fonts, global CSS variables)
├── components/      # Shared/Global internal design system components
│   ├── ui/          # Primitives (Buttons, Inputs, Cards, Modal, Badge)
│   ├── layout/      # Shell layouts (Sidebar, Topbar, Wrappers)
│   └── shared/      # Shared composites (DataTables, Filters, EmptyStates)
├── features/        # Feature modules (Domain-driven segments)
│   ├── auth/        
│   ├── dashboard/   
│   ├── campus/      
│   ├── department/  
│   ├── employee/    
│   ├── leave/       
│   ├── clearance/   
│   ├── recruitment/ 
│   ├── payroll/     
│   ├── reports/     
│   └── audit/       
├── hooks/           # Global custom utilities (useAuth, usePermissions)
├── layouts/         # High-level layout configuration 
├── routes/          # Centralized route definitions and access guards
├── store/           # Global state management (Zustand)
├── types/           # Global TypeScript definitions and domain models
└── utils/           # Formatters, generic helpers, constants
```

---

## 2. Design System Requirements

To ensure UI consistency across all modules and match the reference architecture (MapleHR.io aesthetics), the application utilizes a custom internal Design System. 

### Core Foundations
- **Typography:** Sans-serif (Inter/Roboto), scaling from `12px` (labels) to `24px` (dashboard metrics).
- **Color Palette:** 
  - Primary Theme: Greens (`#38A752`) for primary actions and success states.
  - Semantic Colors: Danger (`#EF4444`), Warning (`#F59E0B`), Info (`#3B82F6`), Active Accent (`#8B5CF6`).
  - Surface/Background: Clean neutral scale (`#FFFFFF` surfaces, `#F9FAFB` backdrops, `#111827` primary text).
- **Styling Specs:** Standardized radiuses (8px-12px elements, circular avatars), distinct shadows (subtle lift for cards, elevated dropdowns).

### Reusable UI Components
- **Data Display:** `DataTable` (sortable, paginated), `Card`, `Avatar`, `StatusBadge` (Pending/Approved/Rejected variants).
- **Forms & Inputs:** `FormField` wrappers, `Select`, `Input`, `SearchFilterBar`.
- **Navigation & Layout:** `Sidebar` (role-aware recursive navigation), `Tabs`, `Stepper` (for multi-step flows like clearance).
- **Overlays & Feedback:** `Modal`, `ConfirmDialog`, `Toast` notifications, `Skeleton` loaders, and user-friendly `EmptyState` fallbacks.

---

## 3. Feature Modules

The frontend is logically divided into self-contained feature domains mapping to domain behaviors.

1. **Authentication:** Login, dynamic role assertion, automatic token refresh, forced password updates.
2. **Dashboard:** Aggregated analytics, quick role-specific actions, and an overview of recent activities.
3. **Campus Management:** (University Admin level) University hierarchy setups, configuration, and readiness validations.
4. **Department Management:** Structural configurations and department head assignments.
5. **Employee Management:** Central personnel dictionary, profile details, HR record modifications, and role provisioning.
6. **Workflows & Approvals (Leave & Sabbatical):** Complex employee self-service pipelines with managerial approval queues.
7. **Clearance Management:** Multi-department, sequential exit tracking metrics and approval routing.
8. **Recruitment:** Internal job catalog, candidate application interfaces, and recruitment committee applicant tracking boards.
9. **Payroll & Reporting:** System-wide data export tools, analytical charting widgets mapped directly to backend aggregates.
10. **Settings & Admin:** Security audit trails with deep filtering and notification handling.

---

## 4. Phase Planning

The development effort is orchestrated across professional delivery phases to guarantee stability, testability, and continuous integration. The phases are structured by dependency and architectural layers.

### Phase 1: Core Architecture & Scaffolding

- **Purpose:** Establish the fundamental project structure, networking layer, and global state machines. Sets the concrete floor for the application.
- **Scope:** Initialization of Vite/React/TypeScript, React Router, Zustand stores, React Query config, and Axios setups.
- **Tasks:**
  - Setup ESLint/Prettier and base `tsconfig.json`.
  - Configure Axios instance with global interceptors (handling `401` automatic refreshes, `403 PASSWORD_CHANGE_REQUIRED` redirects).
  - Setup core state slices (Auth and UI global states).
- **Components:** None heavily developed. Skeleton architecture only.
- **Screens:** Only dummy routes for sanity checks.
- **Backend Integration:** None (configuration only).
- **Dependencies:** Initialized Git repository.
- **Deliverables:** A compiling, empty React application with robust networking logic built-in.
- **Validation Checklist:** 
  - [ ] App launches locally without errors.
  - [ ] Axios interceptor correctly parses mock error responses.

### Phase 2: Design System & Shared Primitives

- **Purpose:** Centralize UI consistency by engineering the primitive UI kit upfront before any feature work begins.
- **Scope:** Implementation of CSS tokens/Tailwind config and base component rendering.
- **Tasks:**
  - Map Figma/Blueprint design tokens to code variables.
  - Build and unit test foundational components (Buttons, Inputs, Cards).
  - Implement form validation patterns using React Hook Form + Zod.
- **Components:** `Button`, `Input`, `Select`, `Badge`, `Card`, `Skeleton`, `Modal`, `EmptyState`.
- **Screens:** Component preview sandbox (e.g., Storybook or hidden route).
- **Backend Integration:** None.
- **Dependencies:** Phase 1 complete.
- **Deliverables:** Reusable UI library acting as building blocks for all subsequent pages.
- **Validation Checklist:** 
  - [x] Primary, Secondary, Danger, and Info button variants render perfectly.
  - [x] Status badges match styling requirements correctly.

### Phase 3: Identity & Access Management (IAM)

- **Purpose:** Create the secured entryway into the application and develop the dynamic, role-protected application shell.
- **Scope:** Login workflows, session persistence, forced password changes, and the primary Dashboard Application Wrapper (Sidebar/Topbar).
- **Tasks:**
  - Build Authentication layout.
  - Develop Login Form consuming Auth Store logic.
  - Develop strict Route Guards resolving user roles from context.
  - Implement Sidebar navigation that dynamically hides options based on JWT roles.
- **Components:** `AuthLayout`, `DashboardLayout`, `Sidebar`, `Topbar`, `LoginForm`, `ChangePasswordForm`.
- **Screens:** `/login`, `/force-password-change`.
- **Backend Integration:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/change-password`, `GET /auth/me`.
- **Dependencies:** Phase 1 & 2.
- **Deliverables:** Protected, authenticable application with dynamic structural layouts.
- **Validation Checklist:** 
  - [ ] Unauthenticated hits redirect to `/login`.
  - [ ] Specific roles successfully see/hide relevant sidebar navigational options.

### Phase 4: Foundational Infrastructure (Campus & Departments)

- **Purpose:** Empower system administrators with the foundational configuration tools required for the application to function multitenant-style.
- **Scope:** University Admin tools for Campuses and Campus Admin tools for Departments.
- **Tasks:**
  - Build paginated data tables for Campus and Department listings.
  - Implement CRUD forms using Modals/Pages.
  - Build the Visual Campus Readiness check component (University Admins).
- **Components:** `DataTable`, `CampusForm`, `DepartmentForm`, `UserSearchSelect` (for assigning heads), `ReadinessCheckCard`.
- **Screens:** `/campuses`, `/campuses/:id`, `/departments`.
- **Backend Integration:** `GET/POST/PATCH` on `/campuses` and `/departments`, `GET /campuses/:id/readiness`.
- **Dependencies:** Phase 3.
- **Deliverables:** System-wide operational settings are configurable visually.
- **Validation Checklist:**
  - [x] Forms properly map and display `VALIDATION_ERROR` payloads from the server.
  - [x] Campus creation reflects correctly on table list refreshes.

### Phase 5: Workforce Directory & HR Profiles

- **Purpose:** Expose user searchability, profile management, and global HR personnel oversight.
- **Scope:** Central user directory, deep profile viewing, and role reassignment capabilities.
- **Tasks:**
  - Construct heavy-duty User list with comprehensive search/filter functionality.
  - Build an Employee Detail view segmented into organized tabs (Basic Info, Contract, Job Info).
  - Implement role and status toggles for admins.
- **Components:** `ProfileHeader`, `ContactInfoForm`, `RoleManagerModal`, `ComplexFilterBar`.
- **Screens:** `/users`, `/employees/:id` (Detail/Edit View).
- **Backend Integration:** `GET /users`, `PATCH /users/:id/role/status`, `POST /users/:id/reset-password`, `GET/PATCH /employees/:id`.
- **Dependencies:** Phase 3.
- **Deliverables:** Fully operational global address book with HR modification powers.
- **Validation Checklist:** 
  - [ ] Paginating across large user volumes is smooth and cursor/offset handlers work.
  - [ ] Updates to Employee entity automatically update React Query cache and sync UI immediately.

### Phase 6: Core Self-Service Workflows (Leave & Sabbatical)

- **Purpose:** Realize automated workflows mapping the heavy operational burden of PTO requests directly into visual UI elements.
- **Scope:** Employee facing request systems, historical views, and Managerial approval queues.
- **Tasks:**
  - Develop form systems for Time Off submission.
  - Build personal history tables parsing dates securely.
  - Design Action Modals empowering Department Heads and HR Officers to approve with attached comments.
- **Components:** `LeaveRequestForm`, `ApprovalActionModal`, `HistoryTable`.
- **Screens:** `/leave`, `/leave/approvals`, `/sabbatical`, `/sabbatical/approvals`.
- **Backend Integration:** `POST/GET` mapping to `/leave` and `/sabbatical`, specific role `PATCH` execution to `/approve|reject`.
- **Dependencies:** Phase 5 (Requires active employees).
- **Deliverables:** Fluid lifecycle execution for absence requests from initiation to final outcome.
- **Validation Checklist:** 
  - [ ] Date overlap errors passed by backend correctly block UI submissions.
  - [ ] Approved requests change StatusBadges to green `APPROVED` instantly.

### Phase 7: Clearance Tracking

- **Purpose:** Abstract the complex inter-departmental exit orchestration into an easy-to-use checklist.
- **Scope:** Clearance Request firing, linear progress tracking, targeted departmental check resolutions.
- **Tasks:**
  - Build dynamic, visual Stepper component tracking unit approvals.
  - Route clearance unit checks to their corresponding department head's dashboard.
- **Components:** `ClearanceTrackerStepper`, `InitiateClearanceForm`, `UnitApprovalList`.
- **Screens:** `/clearance`, `/clearance/approvals`.
- **Backend Integration:** `POST /clearance/requests`, `GET /clearance/requests/:id`, `PATCH /clearance/requests/:id/approve-check`.
- **Dependencies:** Phase 4 & 5.
- **Deliverables:** Clear organizational exit mechanism eliminating administrative ambiguity.
- **Validation Checklist:** 
  - [ ] Clearance sequence stepper visually highlights current blockers based on pending `ClearanceCheck` items.

### Phase 8: Internal Job Board & Talent Pool

- **Purpose:** Construct a rich application tracking environment promoting internal mobility.
- **Scope:** Vacancy catalog, detailed role specs, file attachments (CVs), and applicant progression Kanban.
- **Tasks:**
  - Build visually engaging Job cards in grid views.
  - Develop an application Modal with Multipart/Form-Data file uploading support.
  - Develop Recruitment application dashboard mapping candidates to review stages.
- **Components:** `JobCardGrid`, `JobPostingForm`, `ApplicationUploadModal`, `ApplicantKanbanView`.
- **Screens:** `/jobs`, `/jobs/create`, `/jobs/:id`, `/jobs/:id/applicants`.
- **Backend Integration:** `GET/POST` `/recruitment/postings`, `POST /recruitment/apply`, `PATCH /recruitment/applications/:id/status`.
- **Dependencies:** Phase 3.
- **Deliverables:** Complete closed-system candidate tracking architecture.
- **Validation Checklist:** 
  - [ ] Multipart file uploads seamlessly map to backend without `Content-Type` stripping.
  - [ ] Applicants can be progressed across statuses by Recruitment Committee roles.

### Phase 9: Analytics, Data Handover & System Audits

- **Purpose:** Provide macro-reporting power and enable strict security oversight of data trails.
- **Scope:** Analytical dashboard landing page, tabular analytics summaries, Audit Log viewer, Payroll export endpoints.
- **Tasks:**
  - Plug backend aggregation metrics into Top-Level Dashboard Cards.
  - Build dedicated Audit log view requiring heavy query param mapping to UI Filters.
  - Implement a straightforward Date Filter exporting functionality.
- **Components:** `StatCard`, `ActivityTimeline`, `DateRangePicker`, `Charts` (using Recharts/Chart.js).
- **Screens:** `/dashboard`, `/reports`, `/payroll`, `/audit-logs`.
- **Backend Integration:** Integration with all `/reports`, `/payroll/data-transfer`, and `/audit-logs` endpoints.
- **Dependencies:** All previous phases.
- **Deliverables:** Fully capable executive view giving complete system monitoring metrics and compliance logs.
- **Validation Checklist:** 
  - [ ] Dashboard numeric values match the API output JSON exactly.
  - [ ] Audit Log multi-parameter filtering pushes distinct, accurate queries.

### Phase 10: UX Hardening & Pre-Flight Polish

- **Purpose:** Elevate from "Functional" to "Enterprise Quality" ensuring UI resiliency and perfect perceived performance.
- **Scope:** Global optimizations, Error Boundaries, Load Skeletons, CSS responsiveness formatting.
- **Tasks:**
  - Audit all React Query queries to implement standard `isFetching` layout skeleton loaders vs hard spinners.
  - Centralize `react-toastify` usage.
  - Refine mobile breakpoint handling for complex DataTables (stacking vs horizontal scroll).
  - Setup a comprehensive `NotFoundPage` (404 / 500 boundaries).
- **Components:** `GlobalErrorBoundary`, `NotFoundPage`.
- **Screens:** Optimization affects all viewports system-wide.
- **Backend Integration:** Comprehensive manual test tracking edge failure cases parsing `VALIDATION_ERROR` payloads elegantly.
- **Dependencies:** Phase 1-9.
- **Deliverables:** An aesthetic, robust, and flawlessly resilient frontend architecture.
- **Validation Checklist:** 
  - [ ] 404 Pages route cleanly out of mismatched paths.
  - [ ] The app manages hard server drops gracefully without freezing white-screens.
  - [ ] Skeletons perfectly mask data-loading phases, matching the dimensional rendering of the eventual layout.

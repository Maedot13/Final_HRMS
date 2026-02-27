## Multi-Campus HRMS – Full Implementation Plan

This is a **developer-focused implementation guide** for turning the existing single-campus HRMS into a **multi-campus system** for Bahir Dar University.

- Architecture/reference: `docs/multi-campus-architecture.md`
- This plan: **what to change, in what order, and in which files**, phase by phase.

---

## Phase 0 – Pre-checks and Ground Rules

### 0.1 Understand current state
- **Backend**:
  - Node/Express + Prisma + PostgreSQL (Neon).
  - Key modules: `auth`, `employee`, `leave`, `sabbatical`, `clearance`, `payroll`, `recruitment`, `notifications`, `audit`.
  - Prisma schema: `packages/backend/prisma/schema.prisma`.
- **Types** (shared): `packages/types/src/index.ts`.
- **Frontend**: currently Vite React starter; multi-campus concerns are mostly backend in early phases.

### 0.2 Operational assumptions
- All campuses live in **one logical database** (Neon).
- Existing data represents a **single campus**; we’ll migrate that to a default campus (`MAIN`).
- Initially, there is **no per-campus UI**; campus isolation is enforced in the API.

---

## Phase 1 – Schema and Data Migration (Baseline Multi-Campus)

Goal: introduce `Campus` and `campusId` fields, backfill existing data, and keep behavior unchanged.

> Most of this is already implemented in your repo; this section is both a checklist and a reference if you need to re-apply or extend it.

### 1.1 Add `Campus` model and enums (Prisma)
- **File**: `packages/backend/prisma/schema.prisma`
- Add:
  - `model Campus` with `id`, `code`, `name`, `description?`, `isActive`, `timezone?`, `createdAt`, `updatedAt`.
  - `enum UserScope { CAMPUS; UNIVERSITY }`.

### 1.2 Add `campusId` and `scope` to core models
- **User**:
  - Fields: `scope UserScope @default(CAMPUS)`, `campusId Int?`, relation to `Campus`, `@@index([campusId])`.
  - Keep `email` and `employeeId` uniqueness for now (global).
- **Employee**:
  - Fields: `campusId Int?`, relation to `Campus`, `@@index([campusId])`.
- **Transactional models**:
  - `LeaveRequest`, `LeaveBalance`, `SabbaticalRequest`, `ClearanceRequest`, `JobPosting`, `Notification`, `AuditLog`:
    - Add `campusId Int?`, relation to `Campus`, `@@index([campusId])` (where useful).
  - `ClearanceUnit`:
    - Add `campusId Int?`, relation to `Campus`.
    - Replace `name @unique` with `@@unique([campusId, name])`.

### 1.3 Migration SQL (Phase 1 schema migration)
- **File**: `packages/backend/prisma/migrations/20260223000000_add_multi_campus_phase1/migration.sql`
- Ensure it:
  - Creates `UserScope` and `Campus`.
  - Alters all necessary tables to add `campusId` and FKs.
  - Updates `ClearanceUnit` uniqueness.

### 1.4 Backfill script (default campus + campusId)
- **File**: `packages/backend/scripts/seed-multi-campus-backfill.ts`
- Responsibilities:
  - Create **default campus** (`code: 'MAIN'`, `name: 'Main Campus'`) if missing.
  - Set this `campusId` on:
    - `User`, `Employee` (simple `updateMany`).
    - `LeaveRequest`, `LeaveBalance`, `SabbaticalRequest`, `ClearanceRequest` (via their `Employee`).
    - `ClearanceUnit` (default campus).
    - `JobPosting` (via `User`), `Notification` (via `User`), `AuditLog` (via `User` where possible).

### 1.5 Seed configuration
- **File**: `packages/backend/package.json`
- Ensure:

```json
"prisma": {
  "seed": "ts-node scripts/seed-multi-campus-backfill.ts && ts-node scripts/seed-clearance-units.ts"
}
```

- **File**: `packages/backend/scripts/seed-clearance-units.ts`
  - Uses composite unique: `where: { campusId_name: { campusId, name } }`.
  - Requires campus `MAIN` to exist (backfill first).

### 1.6 Execute Phase 1
- **Commands** (when DB is reachable):

```bash
cd packages/backend
npx prisma migrate deploy          # or `prisma migrate dev` with the Phase 1 migration
npx prisma db seed                 # runs backfill + clearance units
npx prisma generate
```

- Verify via Prisma Studio:
  - `Campus` has at least one row (`MAIN`).
  - All `User`, `Employee`, and main transactional tables have `campusId` set (not null for existing rows).

---

## Phase 2 – Authentication, Authorization & Campus Isolation

Goal: **all campus-scoped users are restricted to their campus**; university-level admins can see everything.

### 2.1 Extend JWT payload with campus context
- **File**: `packages/backend/src/utils/token.ts`
  - `TokenPayload` should include:
    - `userId: number`
    - `role: UserRole`
    - `scope?: UserScope`
    - `campusId?: number | null`
    - `employeeId?: string | null`

### 2.2 Add `UserScope` and `Campus` to shared types
- **File**: `packages/types/src/index.ts`
  - Add:
    - `export enum UserScope { CAMPUS = 'CAMPUS', UNIVERSITY = 'UNIVERSITY' }`
    - `export interface Campus {...}`
  - Update `User` interface to include:
    - `scope?: UserScope`
    - `campusId?: number | null`
    - `campus?: Campus`
- Build types package:

```bash
cd /home/kirubel/Desktop/HRMS
npm run build --workspace=packages/types
```

### 2.3 Default campus resolution for new users
- **File**: `packages/backend/src/lib/campus.ts`
  - Implement:
    - `getDefaultCampusId()` → first active campus (e.g. `MAIN`), cached.
    - `clearDefaultCampusCache()` for tests.

### 2.4 Update auth service to set scope + campus in tokens
- **File**: `packages/backend/src/services/auth.service.ts`
  - **login**:
    - Fetch user with `campusId` and `scope`.
    - For tokens, set:

      ```ts
      const scope = user.scope === 'UNIVERSITY' ? UserScope.UNIVERSITY : UserScope.CAMPUS;
      const token = generateToken({
        userId: user.id,
        role: user.role as UserRole,
        scope,
        campusId: user.campusId ?? null,
        employeeId: user.employeeId
      });
      ```

  - **register**:
    - Before transaction: `const campusId = await getDefaultCampusId();`
    - When creating `User`: set `scope: 'CAMPUS', campusId`.
    - When creating `Employee`: set `campusId`.
    - Tokens: set `scope: UserScope.CAMPUS`, `campusId`.

  - **refreshToken**:
    - Include `scope` and `campusId` from `dbToken.user` when generating new access/refresh tokens.

### 2.5 Make campus scope helper utilities
- **File**: `packages/backend/src/lib/campusScope.ts`
  - Implement:

    ```ts
    export type CampusScopeContext =
      | { scope: UserScope.UNIVERSITY; campusId: null }
      | { scope: UserScope.CAMPUS; campusId: number };

    export function getCampusScope(req: Request): CampusScopeContext { ... }
    export function campusWhere(req: Request): { campusId?: number } { ... }
    export function assertSameCampus(req: Request, resourceCampusId: number | null | undefined): void { ... }
    ```

  - Behavior:
    - If `scope = UNIVERSITY` → no campus filter.
    - If `scope = CAMPUS` but `campusId` missing → **throw** (fail closed).

### 2.6 Enforce campus isolation on core endpoints

#### 2.6.1 Employees
- **Files**:
  - `src/controllers/employee.controller.ts`
  - `src/services/employee.service.ts`
- **Controller**:
  - After existing role checks, call:

    ```ts
    assertSameCampus(req, employee.campusId);
    ```

  - If `Cross-campus access denied` or `Missing campus context` → return `403 Forbidden`.
- Service:
  - `getEmployeeById` already includes full employee with `campusId`; no change needed beyond ensuring `campusId` is selected.

#### 2.6.2 Leave
- **Files**:
  - `src/services/leave.service.ts`
  - `src/controllers/leave.controller.ts`
- **On create**:
  - In `createLeaveRequest(employeeId, data)`:
    - Fetch `Employee` to get `campusId`.
    - Set `campusId` on:
      - `LeaveBalance` create (upsert).
      - `LeaveRequest` create.
- **Queries**:
  - `getPendingRequests(approverDepartment, campusId?)`:
    - Add `campusId` filter when provided.
  - `getAllPendingRequests(campusId?)`:
    - Filter by `campusId` for campus users; no filter for university admins.
- **Approve / reject**:
  - Service methods:

    ```ts
    approveRequest(id, approverId, approverDept, approverCampusId, comment?)
    rejectRequest(id, approverId, approverDept, approverCampusId, comment?)
    ```

  - Throw `Cross-campus access denied` if request’s `campusId` differs from `approverCampusId` for campus users.
  - Controller obtains `approverCampusId` via `getCampusScope(req)`.

#### 2.6.3 Sabbatical
- **Files**:
  - `src/services/sabbatical.service.ts`
  - `src/controllers/sabbatical.controller.ts`
- **On create**:
  - Set `campusId` on `SabbaticalRequest` from employee.
- **Listing**:
  - `getSabbaticalRequests(employeeId?, campusId?)`:
    - For employees: filter by `employeeId` (implicitly campus).
    - For HR/Admin: filter by `campusId` for campus users; no filter for university scope.
- **Pending/approval**:
  - Methods accept `campusId` and check equality before approval/rejection, similar to leave.
- **Notifications**:
  - When creating notifications, include `campusId` so they are visible only in that campus.

#### 2.6.4 Recruitment (Job postings & applications)
- **Files**:
  - `src/services/recruitment.service.ts`
  - `src/controllers/recruitment.controller.ts`
- **CreateJobPosting**:
  - Fetch `User` by `createdBy`, use `campusId` → set on `JobPosting`.
- **List & detail**:
  - `getJobPostings(filters, campusId?)` → apply `campusId` filter.
  - `getJobPostingById(id, campusId?)` → use `findFirst` with both `id` and `campusId`.
- **Update status**:
  - `updateJobStatus(id, status, campusId?)`:
    - Update via `updateMany` with both `id` and `campusId`, then re-fetch.
- **Controller**:
  - Use `getCampusScope(req)` to pass `campusId` into service methods for campus users.

#### 2.6.5 Clearance
- **File**: `src/services/clearance.service.ts`
- **Initiate clearance**:
  - Fetch employee with `campusId`.
  - Fetch `ClearanceUnit` only from that campus: `where: { isActive: true, campusId }`.
  - Create `ClearanceRequest` with `campusId`.
- **Notifications**:
  - `notifyRole` and `notifyDepartmentHead` calls include `campusId`, ensuring only same-campus HR/Finance/Dept-heads receive them.
- (Additional approvals/check endpoints can follow the same pattern as leave/sabbatical.)

#### 2.6.6 Notifications
- **File**: `src/services/notification.service.ts`
- **createNotification**:
  - Accept optional `campusId`.
  - If missing, resolve from `User.campusId`.
- **notifyUsers / notifyRole / notifyDepartmentHead**:
  - Accept `campusId?`.
  - Filter target users/employees by `campusId` when provided.

#### 2.6.7 Audit logs
- **File**: `src/controllers/audit.controller.ts`
- **getAuditLogs / exportAuditLogs**:
  - Derive campus context via `getCampusScope(req)`.
  - For campus users: force `where.campusId = ctx.campusId`.
  - For university admins: allow all campuses (plus optional filters).

### 2.7 Build & lint

```bash
cd /home/kirubel/Desktop/HRMS
npm run build:backend
```

Ensure TypeScript compiles without errors and ESLint is clean on changed files.

---

## Phase 3 – SUPER_ADMIN Role and Campus Switching

Goal: clearly separate **campus HR/Admin** from **university-level SUPER_ADMIN** and support inspecting other campuses explicitly.

### 3.1 Model SUPER_ADMIN / University scope
- **Option A (recommended)**:
  - Keep `UserRole.ADMIN` but use `scope: UNIVERSITY` to mean “university admin/SUPER_ADMIN”.
  - Campus admins are `role: ADMIN, scope: CAMPUS`.
- **Option B**:
  - Add a new role `SUPER_ADMIN` in both Prisma and `@hrms/types`, and treat `scope: UNIVERSITY` as implied.

Update:
- `prisma` enum `UserRole` (if using a dedicated SUPER_ADMIN role).
- `@hrms/types` enum `UserRole`.
- Seed/admin creation script to create:
  - One `scope: UNIVERSITY` SUPER_ADMIN account.
  - Per-campus admins (`scope: CAMPUS`).

### 3.2 “Act as campus” header / query
- For university admins:
  - Accept a header, e.g. `X-Campus-Id`, or query param `?campusId=` for list endpoints.
  - In `getCampusScope(req)`:
    - If `scope = UNIVERSITY` and `X-Campus-Id` is present, treat that as “view context” for filtering (but keep audit logs recording the real user and acted-on campus).
- Update controllers where `campusIdFilter` is currently derived:
  - For university admins, allow override via header/query.
  - For campus users, ignore overrides.

### 3.3 Admin tools for campus management
- Add endpoints (admin-only, university scope):
  - `GET /api/v1/campuses`
  - `POST /api/v1/campuses`
  
  - `PATCH /api/v1/campuses/:id`
  - `GET /api/v1/campuses/:id/users` (optional).
- Wire them into:
  - `src/routes` (e.g. `campus.routes.ts`).
  - `src/controllers/campus.controller.ts`.
  - `src/services/campus.service.ts`.

---

## Phase 4 – Integration Tests for Campus Isolation

Goal: protect against regressions and accidental cross-campus data exposure.

### 4.1 General test strategy
- Use **Prisma test DB** (or `NODE_ENV=test` connection).
- For each module, the pattern:
  1. Seed Campus A and Campus B.
  2. Seed users/employees in both campuses.
  3. Obtain JWT for:
     - Campus A HR/Admin.
     - Campus B HR/Admin.
     - University-level admin.
  4. Assert:
     - Campus A user **cannot** see campus B data.
     - Campus A user **can** see campus A data.
     - University admin can see both (when desired).

### 4.2 Specific tests
- **Employees**:
  - `GET /employees/:id`
    - Campus A HR cannot fetch an employee from campus B.
- **Leave**:
  - Creating leave for campus A employee.
  - Campus B approver cannot approve or reject that leave.
- **Sabbatical**:
  - Same pattern as leave.
- **Recruitment**:
  - Job posting in campus A:
    - Not visible and not updatable by campus B HR.
- **Clearance**:
  - Clearance request initiated for campus A employee:
    - Notifications & approvals stay within campus A.
- **Audit logs**:
  - Campus A HR cannot query logs whose `campusId` belongs to campus B.

### 4.3 Implementation details
- Add tests under:
  - `packages/backend/src/__tests__/integration/*`
- Use existing integration tests as templates:
  - `auth.test.ts`
  - `leave.test.ts`
  - `userManagement.test.ts`

---

## Phase 5 – Frontend Awareness of Campus (Later)

Goal: once the backend is safe, have the frontend **display campus-aware UI** and eventually allow switching for SUPER_ADMIN.

### 5.1 Extend auth responses
- Include `campusId`, `scope`, and `campus` in the **`AuthResponse.user`** payload.
- Confirm `@hrms/types` `User` type matches what backend returns.

### 5.2 Basic UI changes
- Show current campus in the header (for campus users).
- Disable or hide filters that imply cross-campus visibility for non-university users.

### 5.3 Admin-only campus switcher
- For UNIVERSITY scope:
  - Dropdown or side panel listing campuses from `GET /campuses`.
  - When selecting a campus, set a client-side “current campus” and send it via:
    - Header `X-Campus-Id` (preferred), or
    - Query parameter `?campusId=`.

---

## Phase 6 – Hardening, Monitoring, and Governance

### 6.1 Hardening
- Review all endpoints for:
  - Proper use of `getCampusScope(req)` or service-level campus checks.
  - No “global” queries on tenant data without campus filter (except for UNIVERSITY scope).
- Add ESLint rules or code-review checklist items around:
  - New `findMany` / `findFirst` on tenant tables must include campus filter or be explicitly justified.

### 6.2 Monitoring
- Add logs/metrics for:
  - Cross-campus access denials (should be rare).
  - High-volume endpoints by campus (for performance tuning).

### 6.3 Governance & policy
- Define processes:
  - Who can create campuses.
  - Who can assign roles across campuses.
  - How SUPER_ADMIN accounts are created and audited.

---

## Quick Recap Checklist

- **Phase 1**: ✅ Schema, `Campus`, `campusId` on all relevant tables, backfill, seed.
- **Phase 2**: ✅ JWT carries `scope` + `campusId`; helpers; Employees/Leave/Sabbatical/Recruitment/Clearance/Notifications/Audit wired to campus scope.
- **Phase 3**: ✅ University admin (scope: UNIVERSITY) promoted in seed; X-Campus-Id header/query for "act as campus"; campus CRUD endpoints (GET/POST/PATCH /campuses, GET /campuses/:id/users).
- **Phase 4**: ✅ Integration tests for campus isolation (employees, leave, recruitment, clearance, audit).
- **Phase 5 (backend)**: ✅ Auth responses include `campusId`, `scope`, `campus` in user payload.
- **Phase 5 (frontend)**: 🔜 Frontend uses `scope`/`campusId` to shape UI, add campus switcher for admins.
- **Phase 6**: ✅ Hardening (Payroll, Reports, User Management now campus-scoped); logging for cross-campus denials.

Use this file as your **implementation to-do list**. For each phase, work through the bullets, and rely on `docs/multi-campus-architecture.md` whenever you need deeper reasoning or context behind a design decision.


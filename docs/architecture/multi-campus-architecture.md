# Multi-Campus HRMS Architecture Redesign

## Bahir Dar University – 7 Campuses

This document provides a full redesign of the HRMS to support **multi-campus** operation (Bahir Dar University ~7 campuses), including current limitations, recommended architecture, schema changes, auth/authz, audit, performance, real-world patterns, migration plan, and risks.

---

## 1. Analysis: Current Codebase Limitations

### 1.1 No Campus or Tenant Concept

- **User** and **Employee** have no `campusId`. All data is implicitly global.
- **employeeId** is `@unique` globally; in multi-campus, it should be unique **per campus** (e.g. same employee number can exist on different campuses).
- **email** is globally unique; acceptable if emails are central (e.g. `user@bdu.edu.et`), but login/identity must still be tied to campus for scoping.

### 1.2 Roles Are Global

- **UserRole** (ADMIN, HR_OFFICER, DEPARTMENT_HEAD, etc.) is a single enum with no campus context.
- An ADMIN or HR_OFFICER can act on **all** data; there is no “campus HR” vs “university-level admin.”
- **authorization.service.ts** uses `UserRole.ADMIN` for “can approve any unit” with no campus check.
- **auth.middleware.ts** `authorize(allowedRoles)` only checks role, not campus.

### 1.3 No Data Isolation

- All queries (employees, leave, clearance, payroll, recruitment, notifications) are unscoped; any user with the right role sees **all** records.
- **ClearanceUnit** is global (e.g. “HR”, “Finance”); in multi-campus, units are typically **per campus** (each campus has its own HR, Finance, etc.) or a mix of shared and campus-specific.
- **JobPosting** has no campus; recruitment could be campus-specific or university-wide.
- **AuditLog** has no `campusId`; cross-campus audit queries and compliance per campus are not possible.

### 1.4 Shared vs Campus-Specific Not Modeled

- Leave types, clearance units, job departments, and config are not classified as “university-wide” vs “campus-specific.”
- No concept of “default campus” for a user or “active campus” in the session.

### 1.5 Identifier and Uniqueness Assumptions

- **employeeId** and **email** uniqueness are global; multi-campus requires at least `(campusId, employeeId)` uniqueness for employee numbers if each campus issues its own IDs.
- If the university uses a **single** employee ID space, then `employeeId` can stay globally unique and you add `campusId` only for “primary campus” or “current assignment.”

### 1.6 Summary of Gaps

| Area | Current | Needed for multi-campus |
|------|--------|--------------------------|
| Entity model | No Campus | Campus entity; relations from User, Employee, and transactional data |
| Roles | Global only | Campus-scoped roles + SUPER_ADMIN (university-level) |
| Uniqueness | Global employeeId/email | Per-campus or global by policy |
| Queries | No filter | All list/get scoped by campus (or all for SUPER_ADMIN) |
| ClearanceUnit | Global | Per-campus or shared with campus override |
| Audit | No campus | campusId (and optionally scope) on every log |
| Config | N/A | Shared vs campus-specific config tables |

---

## 2. Recommended Multi-Tenant Strategy: Single Database with campus_id

### 2.1 Option Comparison

| Strategy | Pros | Cons | Verdict for BDU (7 campuses) |
|----------|------|------|------------------------------|
| **Single DB + campus_id** | Simple ops, one codebase, easy reporting, ACID across campuses | Must enforce scoping in app and indexes | **Recommended** |
| Schema-per-campus | Strong isolation in one DB | Many schemas, migrations × N, complex | Overkill |
| Database-per-campus | Hard isolation | 7 DBs, backups, migrations, cross-campus reporting hard | Overkill |
| Separate app instance per campus | Isolated deployments | 7× deployment and code drift | Not recommended |

### 2.2 Justification for Single DB + campus_id (Row-Level Multi-Tenancy)

- **Scale**: 7 campuses is moderate; single PostgreSQL (e.g. Neon) handles this easily with proper indexing.
- **Governance**: One schema, one migration path, one backup, one audit store.
- **Reporting**: University-wide and per-campus reports are simple (WHERE campus_id = ? or GROUP BY campus_id).
- **Real-world**: Many university HRMS (e.g. Workday, SAP SuccessFactors) use a single logical database with org/campus/tenant dimensions.
- **Cost**: One Neon (or one Postgres) instance; no need for 7 DBs or 7 schemas.

**Conclusion**: Use **single database, single schema, with a `Campus` table and `campusId` (or equivalent) on all tenant-scoped tables.** Enforce isolation in the application layer and with DB constraints/indexes.

---

## 3. Proposed Multi-Campus Architecture (High Level)

- **Single** Node/Express API and single PostgreSQL database.
- **Campus** is a first-class entity; all tenant-scoped data carries `campusId`.
- **Roles**:
  - **SUPER_ADMIN**: University-level; can impersonate/switch campus; full access to all campuses.
  - **Campus-scoped roles**: ADMIN, HR_OFFICER, DEPARTMENT_HEAD, FINANCE_OFFICER, RECRUITMENT_COMMITTEE, EMPLOYEE — effective only within one (or more) assigned campuses.
- **Auth**: JWT includes `userId`, `role`, and `campusId` (primary campus). Optional `scope: 'university' | 'campus'` and list of `campusIds` for SUPER_ADMIN.
- **Authorization**: Every request that touches data is checked: either user’s campus matches resource’s campus, or user is SUPER_ADMIN (or has explicit multi-campus assignment).
- **Audit**: Every log has `campusId` (nullable for system/university-level actions); filtering and retention can be per campus.

---

## 4. Database Schema Changes

### 4.1 New and Modified Tables (Conceptual)

**New: Campus**

- `Campus`: id, code (e.g. MAIN, POLY), name, description, isActive, timezone?, createdAt, updatedAt.
- Optional: address, contactInfo (JSON) for reporting.

**Modified: User and Employee**

- **User**: Add `campusId` (FK to Campus, nullable only for SUPER_ADMIN during setup). Add `role` (existing) and optionally `scope` (e.g. UNIVERSITY | CAMPUS). Uniqueness: `(email)` can stay global; if you support same person on multiple campuses, consider `(campusId, email)` or a separate “user per campus” model.
- **Employee**: Add `campusId` (FK, NOT NULL). Uniqueness: `(campusId, employeeId)` so employee numbers are unique per campus.

**Transactional and reference data**

- **LeaveRequest, LeaveBalance, SabbaticalRequest**: Add `campusId` (denormalized from Employee for query performance) or rely on Employee.campusId only; recommend adding to hot tables for simpler queries and indexes.
- **ClearanceRequest, ClearanceCheck, PayrollTransfer**: Add `campusId`.
- **ClearanceUnit**: Make campus-scoped: add `campusId` (nullable = university-wide unit). So “Finance” can be one global unit or one per campus.
- **JobPosting, JobApplication**: Add `campusId` (posting and application scoped to campus).
- **Notification**: Add `campusId` (optional; null = system-wide).
- **AuditLog**: Add `campusId` (nullable for university-level actions).

**Shared vs campus-specific configuration**

- **ConfigKey** (or similar): key (e.g. `leave.annual_days`), value (JSON), `campusId` (null = university default), override order: campus > university.

### 4.2 ERD (Text)

```
Campus (1) ──────────────────── (*) User
   │                                    │
   │                                    │ (optional: UserCampusAssignment for multi-campus users)
   │
   ├────────────────────────────────────── (*) Employee
   │         │
   │         ├── (*) LeaveRequest
   │         ├── (*) LeaveBalance
   │         ├── (*) SabbaticalRequest
   │         ├── (*) ClearanceRequest ── (*) ClearanceCheck
   │         │         │
   │         │         └── (1) PayrollTransfer
   │         ├── (*) JobApplication
   │         └── ...
   │
   ├── (*) ClearanceUnit (campusId nullable = shared)
   ├── (*) JobPosting
   ├── (*) Notification (campusId nullable)
   └── (*) AuditLog (campusId nullable)
```

### 4.3 Example Table Definitions (Prisma-style)

```prisma
model Campus {
  id          Int       @id @default(autoincrement())
  code        String    @unique   // e.g. "MAIN", "POLY"
  name        String
  description String?
  isActive    Boolean   @default(true)
  timezone    String?   @default("Africa/Addis_Ababa")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  users       User[]
  employees   Employee[]
  leaveRequests     LeaveRequest[]
  leaveBalances     LeaveBalance[]
  sabbaticalRequests SabbaticalRequest[]
  clearanceRequests ClearanceRequest[]
  jobPostings       JobPosting[]
  clearanceUnits    ClearanceUnit[]
  notifications    Notification[]
  auditLogs        AuditLog[]
}

model User {
  id            Int       @id @default(autoincrement())
  passwordHash  String
  role          UserRole
  scope         UserScope @default(CAMPUS)  // UNIVERSITY = super admin
  campusId      Int?      // null only for SUPER_ADMIN with scope UNIVERSITY
  employeeId    String    // per-campus uniqueness: (campusId, employeeId)
  email         String
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  campus        Campus?   @relation(fields: [campusId], references: [id])
  employee      Employee?
  // ... rest

  @@unique([campusId, employeeId])
  @@index([campusId])
  @@index([email])
}

enum UserScope {
  CAMPUS     // campus-scoped admin/HR/employee
  UNIVERSITY // super admin
}

model Employee {
  id         Int      @id @default(autoincrement())
  campusId   Int
  userId     Int      @unique
  employeeId String   // unique per campus
  name       String
  department String
  position   String
  hireDate   DateTime
  // ...

  campus     Campus   @relation(fields: [campusId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
  // ...

  @@unique([campusId, employeeId])
  @@index([campusId])
}

model LeaveRequest {
  id         Int   @id @default(autoincrement())
  campusId   Int   // denormalized for filtering/indexing
  employeeId Int
  // ...
  campus     Campus   @relation(fields: [campusId], references: [id])
  employee   Employee @relation(fields: [employeeId], references: [id])
  @@index([campusId, status])
  @@index([campusId, createdAt])
}

model ClearanceUnit {
  id        Int     @id @default(autoincrement())
  campusId  Int?    // null = university-wide unit
  name      String
  // ...
  campus    Campus? @relation(fields: [campusId], references: [id])
  @@unique([campusId, name])  // name unique per campus (or globally when campusId null)
  @@index([campusId])
}

model AuditLog {
  id         Int    @id @default(autoincrement())
  campusId   Int?   // null = university-level action
  userId     Int?
  action     AuditAction
  entityType String
  entityId   Int?
  // ...
  campus     Campus? @relation(fields: [campusId], references: [id])
  @@index([campusId, timestamp])
  @@index([userId, timestamp])
}
```

Apply the same pattern: add `campusId` (and relation to `Campus`) to all tables that must be scoped (LeaveBalance, SabbaticalRequest, ClearanceRequest, ClearanceCheck, PayrollTransfer, JobPosting, JobApplication, Notification). Keep RefreshToken and global config without campusId.

---

## 5. Authentication and Authorization Strategy

### 5.1 Token Payload (JWT)

- `userId`, `role`, `email`, `employeeId` (optional).
- **campusId**: Primary campus for this session (required for CAMPUS-scoped users; optional for UNIVERSITY).
- **scope**: `CAMPUS` | `UNIVERSITY` (SUPER_ADMIN only).
- **campusIds**: Optional array of campus IDs the user can access (for SUPER_ADMIN or multi-campus HR). If absent, treat as single campus = `campusId`.

### 5.2 Restricting Users to Their Campus

- **Middleware**: After `authenticate`, attach `req.campusId` and `req.scope` from token.
- **Authorization helper**:  
  - For CAMPUS scope: allow only if `resource.campusId === req.campusId` (or `resource` loaded via employee who belongs to that campus).
  - For UNIVERSITY scope: allow if `req.scope === 'UNIVERSITY'` (and optionally `req.campusIds` includes resource’s campus or is “all”).
- **List endpoints**:  
  - CAMPUS: `WHERE campusId = :req.campusId`.  
  - UNIVERSITY: no campus filter (or filter by query param `campusId` for reporting).
- **Create/update**: Set `campusId` from `req.campusId` (never from body for non–SUPER_ADMIN).

### 5.3 Super Admins (University-Level)

- Role: e.g. `SUPER_ADMIN` or keep `ADMIN` with `scope: UNIVERSITY`.
- Token: `scope: 'UNIVERSITY'`, `campusId` optional (e.g. “default” campus for UI), `campusIds: [1,2,...,7]` or omit = all.
- API behavior:  
  - Can call any endpoint; list endpoints return all campuses unless filtered by `?campusId=`.  
  - Optional header or query `X-Campus-Id` to “act as” a campus (audit log still records real userId and campus context).
- No extra “login per campus”; one login, backend decides visibility by scope.

### 5.4 Role Hierarchy Across Campuses

- **University level**: SUPER_ADMIN (full access to all campuses).
- **Campus level**: ADMIN (that campus only), HR_OFFICER, DEPARTMENT_HEAD, FINANCE_OFFICER, RECRUITMENT_COMMITTEE, EMPLOYEE — all scoped to campuses the user is assigned to.
- **Multi-campus users**: e.g. one HR_OFFICER in two campuses: `UserCampusAssignment` (userId, campusId) and token carries `campusIds: [1,2]`; list/detail filters use `WHERE campusId IN (req.campusIds)`.

### 5.5 Implementation Sketch

- **authorize(allowedRoles, options?: { requireCampus?: boolean })**: Check role and, if `requireCampus`, ensure `req.campusId` (or `req.campusIds`) is set.
- **requireCampusAccess(campusId)**: Ensure `req.scope === 'UNIVERSITY'` or `campusId === req.campusId` or `req.campusIds?.includes(campusId)`.
- **getCampusScope(req)**: Returns `{ campusId, campusIds, scope }` for use in Prisma `where` clauses.

---

## 6. Audit Logging in Multi-Campus

### 6.1 Requirements

- Every audit log row has **campusId** (nullable for university-level actions).
- Who did what, where (which campus), when, and to which entity.

### 6.2 Strategy

- **On every audited action**: Set `campusId` from:
  - The resource being changed (e.g. request’s campusId), or
  - The acting user’s primary campus, or
  - Explicit “acting as” campus when SUPER_ADMIN uses `X-Campus-Id`.
- **createAuditLog** signature: add `campusId?: number | null`; pass it from controllers.
- **Query rules**:  
  - CAMPUS users: `WHERE campusId = :req.campusId`.  
  - UNIVERSITY: allow filter by `?campusId=`; export/retention can be per campus.
- **Retention**: Policy can be per campus (e.g. delete logs older than X years for campus Y) using `campusId`.

### 6.3 New Audit Actions (Optional)

- `CAMPUS_SWITCH` (SUPER_ADMIN switched context).
- `USER_CAMPUS_ASSIGNMENT_CHANGE` for audit of role/campus assignment changes.

---

## 7. Performance, Indexing, and Scaling

### 7.1 Indexing

- **All tenant-scoped tables**: Composite indexes starting with `campusId`, e.g.:
  - `(campusId, status)`, `(campusId, createdAt)` for leave, clearance, audit.
  - `(campusId, employeeId)` for Employee; `(campusId, entityType, entityId)` if you have generic entity indexes.
- **AuditLog**: `(campusId, timestamp)`, `(userId, timestamp)`; keep existing (entityType, entityId) if used.
- **List APIs**: Always filter by `campusId` first so indexes are used.

### 7.2 Query Patterns

- Prefer **one** `campusId` filter from token (or IN list for multi-campus users); avoid full table scans.
- Use **denormalized** `campusId` on high-volume tables (LeaveRequest, ClearanceRequest, etc.) so you don’t join through Employee for every list.

### 7.3 Scaling (Future)

- Single DB is enough for 7 campuses. If one campus grows very large: same schema; consider partitioning by `campusId` (e.g. PostgreSQL declarative partitioning) for the largest tables.
- Caching (Redis): key by `campusId` where relevant (e.g. `leave:balance:{campusId}:{employeeId}:{year}`) to avoid cross-campus cache collisions.

### 7.4 Connection and Pooling

- Neon/serverless: single connection string; connection pooling is unchanged. No change needed for 7 campuses.

---

## 8. Real-World University Implementation

### 8.1 How Large Universities Do Multi-Campus HRMS

- **Single ERP/HRMS** with an “organization” or “campus” dimension is common (e.g. Workday, Oracle, SAP).
- **Central HR** sets policy, reporting, and sometimes approval for senior/central roles; **campus HR** handles day-to-day hiring, leave, clearance at that campus.
- **Data isolation**: By org/campus in one DB; strict role-based access so campus HR cannot see another campus’s data unless granted (e.g. reporting role).

### 8.2 Governance and Data Isolation

- **Governance**: Define who can create campuses, who can assign SUPER_ADMIN, and who can assign campus-scoped roles per campus (e.g. only SUPER_ADMIN).
- **Data isolation**: Enforce in application: every query and mutation checks campus; no “SELECT *” without campus filter for tenant data.
- **Reporting**: Central reports: aggregate by campus; campus reports: filter by campusId. No PII of other campuses for campus users.

### 8.3 Inter-Campus Staff Transfers

- **Option A (recommended)**: One Employee record; add `campusId` and treat as “current primary campus.” On transfer: update `Employee.campusId` (and optionally User.campusId); create an audit event “TRANSFER” and optionally a small `EmployeeTransfer` history table (fromCampusId, toCampusId, employeeId, effectiveDate).
- **Option B**: New employee record per campus and link person (e.g. personId); more complex and usually unnecessary for 7 campuses.

### 8.4 Central HR vs Campus HR

- **Central HR**: Mapped to SUPER_ADMIN or a dedicated role with `scope: UNIVERSITY`; can view/edit all campuses, run university reports, and configure shared policies.
- **Campus HR**: ADMIN or HR_OFFICER with `scope: CAMPUS` and that campusId; can only manage their campus. Clearance units and approval chains are per campus (or shared by design); config can override per campus.

---

## 9. Phase-by-Phase Migration (Single → Multi-Campus)

### Phase 1: Schema and data (no behavior change)

1. Add `Campus` table; seed one campus (e.g. “Main” or “Current”).
2. Add `campusId` to User, Employee, and all tenant-scoped tables (nullable initially).
3. Backfill: set every existing row’s `campusId` to the single seeded campus ID.
4. Alter columns to NOT NULL where required; add FKs and indexes.
5. Add `scope` to User (default CAMPUS); add uniqueness `(campusId, employeeId)` for Employee/User.
6. Run migrations and sanity checks; keep existing APIs working (all data still under one campus).

### Phase 2: Auth and authorization

1. Extend JWT with `campusId` and `scope`; issue tokens with campus from User’s campusId.
2. Introduce `requireCampusAccess` and `getCampusScope(req)`; in read/write paths, add `where: { campusId: req.campusId }` (or IN list for multi-campus).
3. Restrict list/detail endpoints to user’s campus (and SUPER_ADMIN to all).
4. Ensure create/update set `campusId` from request context, not from client.
5. Add SUPER_ADMIN role/scope and assign to one or two users; test cross-campus access.

### Phase 3: Clearance units and config

1. Add `campusId` to ClearanceUnit (nullable = shared); migrate existing units to shared or assign to seeded campus.
2. Introduce shared vs campus-specific config (e.g. ConfigKey with campusId); read with fallback: campus first, then university.
3. Update clearance and approval logic to use campus-scoped units and config.

### Phase 4: Audit and reporting

1. Add `campusId` to AuditLog; backfill existing logs with the single campus.
2. Update `createAuditLog` to accept and store campusId.
3. Restrict audit log APIs by campus for CAMPUS users; add campus filter for UNIVERSITY.
4. Add campus dimension to reports (dropdown or default to user’s campus).

### Phase 5: Multiple campuses and operations

1. Seed remaining campuses; assign users and employees to campuses.
2. Document and train: campus HR only see their campus; SUPER_ADMIN can switch context.
3. Implement inter-campus transfer (update Employee/User campusId + history if needed).
4. Optional: campus switcher UI for SUPER_ADMIN and `X-Campus-Id` or query param for API.

### Phase 6: Hardening and compliance

1. Review all endpoints for campus scoping; add integration tests for cross-campus access (must 403).
2. Penetration test and audit log review per campus.
3. Document retention and export per campus for compliance.

---

## 10. Risks, Edge Cases, and Security

### 10.1 Risks

- **Data leakage**: Forgetting to filter by campus in one endpoint or report. **Mitigation**: Central data access layer that always injects campus filter; code review and tests for “campus A user cannot see campus B data.”
- **Migration bugs**: Backfill wrong campusId or leave nulls. **Mitigation**: Verify counts per campus after backfill; run read-only tests before switching auth.
- **Performance**: Large tables without campus index. **Mitigation**: Index all tenant tables on campusId (and composite with status/dates).
- **SUPER_ADMIN abuse**: Compromised super admin sees all. **Mitigation**: MFA, audit all SUPER_ADMIN actions, limit number of SUPER_ADMIN accounts.

### 10.2 Edge Cases

- **User in multiple campuses**: Use `UserCampusAssignment` and token `campusIds`; ensure list/detail filters use IN list and create uses “current” campus from request (e.g. body or header).
- **Shared clearance unit**: `ClearanceUnit.campusId = null`; approval logic resolves unit once and checks user’s campus access for the clearance request’s campus.
- **Inter-campus job posting**: Either allow JobPosting to have multiple campuses (e.g. junction table) or one posting per campus; document and enforce in business logic.
- **Employee transfer**: Atomic update of Employee (and User) campusId; create audit and optional history row; reassign leave balance/clearance to new campus if business rules require.

### 10.3 Security

- **Never trust client for campusId** on create/update for CAMPUS users; always use `req.campusId` (or validated list for multi-campus).
- **JWT**: Sign with same secret; include campusId and scope so they cannot be tampered.
- **Audit**: Log campusId and userId for every sensitive action; allow per-campus audit export for compliance.
- **Rate limiting**: Can stay global or be per-campus (e.g. Redis key `ratelimit:login:{campusId}:{ip}`) to avoid one campus affecting another.

---

## 11. Folder/Module Restructuring Suggestions

- **`src/context/`** or **`src/campus/`**:  
  - `getCampusScope(req)`, `requireCampusAccess(campusId)`, type definitions for `CampusScope`.
- **`src/middleware/`**:  
  - Extend auth middleware to attach `req.campusId`, `req.scope`, `req.campusIds` from token.  
  - Optional: `requireCampusScope()` that returns 403 if no campus context for CAMPUS-scoped users.
- **`src/services/`**:  
  - All services that touch tenant data accept `campusId` or scope object and add it to Prisma `where`/`data`.  
  - Consider a **base service** or **data access layer** that always applies campus filter for non–SUPER_ADMIN.
- **`src/controllers/`**:  
  - Controllers read scope from `req` and pass to services; never pass client-supplied campusId for writes (except SUPER_ADMIN with explicit “act as”).
- **`prisma/`**:  
  - One schema file; add Campus and campusId everywhere needed; add seeds for Campus and initial admin.

No need for separate “campus module” beyond the above; keep leave, clearance, payroll, etc., but make them campus-aware.

---

## 12. API Design Adjustments

### 12.1 Query Parameters

- **List endpoints**: Support `?campusId=` for SUPER_ADMIN (filter to one campus). For CAMPUS users, ignore or reject if they pass a different campusId.
- **Reports**: `?campusId=` or `?campusIds=1,2,3` for UNIVERSITY; default to user’s campus for CAMPUS.

### 12.2 Request Body

- **Create/update**: Do **not** accept `campusId` from body for CAMPUS users. Set from `req.campusId`. For SUPER_ADMIN, optional `campusId` in body or header to “create on behalf of campus.”
- **Responses**: Include `campusId` (and optionally `campusCode`) in resources so the frontend can show campus and enforce UI consistency.

### 12.3 New Endpoints

- **GET /api/v1/campuses**  
  - Returns list of campuses (for SUPER_ADMIN: all; for CAMPUS: only their campus or assigned campuses).  
- **GET /api/v1/campuses/:id**  
  - Detail for one campus (with access check).  
- **PATCH /api/v1/users/me/campus** (optional)  
  - For multi-campus users, set “current” campus for the session (updates token or session).  
- **POST /api/v1/employees/:id/transfer** (optional)  
  - Body: `{ toCampusId, effectiveDate }`; only SUPER_ADMIN or designated role; creates audit and history.

### 12.4 Versioning

- Keep `/api/v1/`; introduce new fields (campusId, scope) in responses and new endpoints. If you must break compatibility, use `/api/v2/` and document.

---

## 13. Summary

- **Current system**: Single implicit tenant; no campus; roles and data globally visible to admins.
- **Target**: Single database, single schema, with **Campus** and **campus_id** on all tenant-scoped entities; **campus-scoped roles** plus **SUPER_ADMIN**; JWT carries **campusId** and **scope**; **audit** includes campusId; **strict application-level** data isolation and **indexing** on campusId.
- **Migration**: Add Campus and campusId → backfill one campus → enforce auth/authz and audit → add multiple campuses and transfer logic → harden and document.

This design aligns with common university multi-campus HRMS patterns, keeps your stack (Node, Express, PostgreSQL, Redis, REST), and stays within a single database while preserving clear data isolation and a path to scaling and compliance.

---

## 14. Phase 1 Implementation – Execution Steps

Phase 1 has been implemented in the codebase. Use these steps to apply it in your environment.

### 14.1 Prerequisites

- Database (PostgreSQL/Neon) reachable; `DATABASE_URL` set in `packages/backend/.env`.

### 14.2 Apply migration and seed

1. **Apply the Phase 1 migration** (adds `Campus`, `UserScope`, and nullable `campusId` everywhere):

   ```bash
   cd packages/backend
   npx prisma migrate deploy
   ```

   If you use `migrate dev` and the DB is available:

   ```bash
   npx prisma migrate dev --name add_multi_campus_phase1
   ```

   If the migration was already created manually, ensure `prisma/migrations/20260223000000_add_multi_campus_phase1/migration.sql` exists and run `prisma migrate deploy`.

2. **Run the seed** (creates default campus "MAIN" and backfills all existing rows):

   ```bash
   npx prisma db seed
   ```

   This runs `seed-multi-campus-backfill.ts` then `seed-clearance-units.ts`. All existing users, employees, leave requests, etc. are assigned to the default campus.

3. **Regenerate Prisma client** (if you changed schema locally):

   ```bash
   npx prisma generate
   ```

### 14.3 Verify

- Open Prisma Studio: `npx prisma studio`. Check that `Campus` has one row (e.g. code `MAIN`) and that `User`, `Employee`, `LeaveRequest`, etc. have `campusId` set.
- Existing APIs continue to work; no auth or filtering changes in Phase 1. New user registration and new leave/clearance/sabbatical/job records get `campusId` from the creating user or employee.

### 14.4 Optional: make `campusId` required (Phase 1.5)

After backfill, you can add a second migration that sets `Employee.campusId` (and other tenant tables) to `NOT NULL`. This is optional for Phase 1 and can be done when moving to Phase 2.

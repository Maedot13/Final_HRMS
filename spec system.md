```markdown
# System Specification – Bahir Dar University HRMS

## Version 1.0  
**Date:** April 2026  
**Status:** Final for Implementation  

---

## 1. Introduction

### 1.1 Purpose
This document specifies the complete **Human Resource Management System (HRMS)** for Bahir Dar University. It covers the full employee lifecycle – recruitment, onboarding, leave management, performance appraisal, payroll reporting, clearance, offboarding – across multiple campuses, colleges, departments, and units.

### 1.2 Scope
- Multi‑campus support with hierarchical organisation (Campus → College → Department → Unit)
- Role‑based access control (RBAC) with additive special privileges
- Immutable system‑wide activity logging
- Employee self‑service (ESS) portal
- Automated leave routing and approval (Academic VP and HR for Sabbatical/Without Pay/Research, HR for others)
- Multi‑step clearance workflow (clearance bodies → campus HR → Head HR)
- Payroll reporting (Excel)
- Performance appraisal management
- Lecture schedule and timetable management
- Experience letter generation

### 1.3 Glossary

| Term | Definition |
|------|------------|
| **HRMS** | Human Resource Management System |
| **SUPER_ADMIN** | System administrator; creates Admin/HR accounts, views activity logs, manages campuses. Cannot view active employee data. |
| **ADMIN** | Campus‑level administrator; manages org hierarchy, employees, and clearance body configuration within one campus. |
| **HR_OFFICER** | Operational HR; handles leaves, payroll, clearance initiation, performance evaluations, and experience letters. Campus‑scoped unless Head HR. |
| **EMPLOYEE** | Staff member with self‑service access. |
| **Head HR** | System‑wide HR_OFFICER with final clearance approval (`isHeadHR=true`). |
| **Clearance Body** | University department (Library, IT, Finance, etc.) that must approve an employee’s separation. |
| **Special Privilege** | Additive permission (Dean, President) granted on top of a base role. |
| **ESS** | Employee Self‑Service portal. |
| **Campus Scoping** | Users see only data from their assigned campus (unless system‑wide). |
| **Activity Log** | Immutable, tamper‑evident record of every state‑changing action. |

---

## 2. System Architecture

### 2.1 High‑Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (SPA)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ ESS      │ │ Admin    │ │ HR       │ │ Super Admin  │   │
│  │ Dashboard│ │ Dashboard│ │ Dashboard│ │ Dashboard    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / JWT
┌───────────────────────────▼─────────────────────────────────┐
│              Node.js/Express Backend (REST API)              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Authentication │ RBAC │ Activity Logging │ Validation  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │ Leave   │ │Employee │ │Clearance│ │Payroll  │ │Schedule│ │
│  │ Module  │ │ Module  │ │ Module  │ │ Module  │ │ Module │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │ Prisma ORM
┌───────────────────────────▼─────────────────────────────────┐
│                Neon PostgreSQL (Cloud)                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack (No Docker)

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Node.js + Express | 20+ / 4.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL (Neon) | 15+ |
| ORM | Prisma | 5.x |
| Authentication | JWT + bcrypt | – |
| Frontend | React + Vite | 18 / 4.x |
| HTTP Client | Axios | – |
| Styling | Tailwind CSS | 3.x |
| Testing | Jest + Supertest (backend), React Testing Library (frontend) | – |

### 2.3 Folder Structure

```
hrms-backend/
├── src/
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Auth, permission, logging
│   ├── routes/     DIRECTOR       # API route definitions
│   ├── schemas/           # Zod validation schemas
│   ├── utils/             # Helpers (JWT, password, etc.)
│   ├── types/             # TypeScript types
│   ├── tests/             # Integration tests
│   └── app.ts             # Express app setup
├── prisma/
│   ├── schema.prisma      # Database models
│   └── seed.ts            # Seed script
├── .env
├── package.json
└── tsconfig.json

hrms-frontend/
├── src/
│   ├── pages/             # Route pages (ESS, Admin, HR, Super)
│   ├── components/        # Reusable UI components
│   ├── contexts/          # AuthContext, etc.
│   ├── services/          # API client functions
│   ├── hooks/             # Custom hooks (usePermission, etc.)
│   ├── utils/             # Helpers
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
└── vite.config.ts
```

---

## 3. Data Model (Prisma Schema)

### 3.1 Enums

```prisma
enum BaseRole {
  SUPER_ADMIN
  ADMIN
  HR_OFFICER
  EMPLOYEE
}

enum SpecialPrivilege {
  UNIVERSITY_PRESIDENT
  DEAN
}

enum LeaveType {
  ANNUAL
  MATERNITY
  PATERNITY
  SICK
  PERSONAL
  SPECIAL
  WITHOUT_PAY
  STUDY
  RESEARCH
  SABBATICAL
  OTHER
}

enum LeaveStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
}

enum ClearanceStatus {
  IN_PROGRESS
  COMPLETED
}

enum ClearanceTaskStatus {
  PENDING
  APPROVED
  REJECTED
}

enum ApprovalMode {
  SEQUENTIAL
  PARALLEL
}

enum ActivityAction {
  LOGIN
  LOGOUT
  CREATE
  UPDATE
  DELETE
  APPROVE
  REJECT
  INITIATE
  GENERATE
  UPLOAD
  ASSIGN
  VIEW
  ACCESS_DENIED
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
}

enum AcademicRank {
  LECTURER
  ASSISTANT_PROFESSOR
  ASSOCIATE_PROFESSOR
  PROFESSOR
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
}
```

### 3.2 Organisation Models

```prisma
model Campus {
  id          String    @id @default(cuid())
  code        String    @unique
  name        String
  location    String?
  createdAt   DateTime  @default(now())
  colleges    College[]
  employees   Employee[]
  users       User[]
  schedules   Schedule[]
}

model College {
  id          String      @id @default(cuid())
  name        String
  campusId    String
  campus      Campus      @relation(fields: [campusId], references: [id])
  departments Department[]
}

model Department {
  id          String      @id @default(cuid())
  name        String
  collegeId   String
  college     College     @relation(fields: [collegeId], references: [id])
  units       Unit[]
}

model Unit {
  id           String     @id @default(cuid())
  name         String
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id])
}
```

### 3.3 User & Employee Models

```prisma
model User {
  id               String             @id @default(cuid())
  email            String             @unique
  passwordHash     String
  baseRole         BaseRole
  campusId         String?            // null for system-wide (SUPER_ADMIN, Head HR)
  campus           Campus?            @relation(fields: [campusId], references: [id])
  isActive         Boolean            @default(true)
  isTempPassword   Boolean            @default(false)
  isHeadHR         Boolean            @default(false)
  lastLoginAt      DateTime?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  employee         Employee?
  privileges       UserPrivilege[]
  refreshTokens    RefreshToken[]
  leaveApprovals   LeaveApproval[]
  clearanceTasks   ClearanceTask[]
  activityLogs     ActivityLog[]
}

model UserPrivilege {
  id         String          @id @default(cuid())
  userId     String
  user       User            @relation(fields: [userId], references: [id])
  privilege  SpecialPrivilege
  grantedAt  DateTime        @default(now())
  grantedBy  String?         // User ID
}

model RefreshToken {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  token      String   @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime @default(now())
}

model Employee {
  id             String         @id @default(cuid())
  employeeId     String         @unique
  userId         String?        @unique
  user           User?          @relation(fields: [userId], references: [id])
  firstName      String
  lastName       String
  middleName     String?
  dateOfBirth    DateTime?
  gender         String?
  phone          String?
  address        String?
  campusId       String
  campus         Campus         @relation(fields: [campusId], references: [id])
  departmentId   String?
  department     Department?    @relation(fields: [departmentId], references: [id])
  unitId         String?
  unit           Unit?          @relation(fields: [unitId], references: [id])
  jobTitle       String
  employmentType EmploymentType
  academicRank   AcademicRank?
  startDate      DateTime
  endDate        DateTime?
  status         EmployeeStatus @default(ACTIVE)
  salary         Float?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  leaveBalances  LeaveBalance[]
  leaveRequests  LeaveRequest[]
  evaluations    PerformanceEvaluation[]
  clearance      Clearance?
  schedules      Schedule[]
}
```

### 3.4 Leave Models

```prisma
model LeaveBalance {
  id           String     @id @default(cuid())
  employeeId   String
  employee     Employee   @relation(fields: [employeeId], references: [id])
  leaveType    LeaveType
  totalDays    Float
  usedDays     Float      @default(0)
  year         Int
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  @@unique([employeeId, leaveType, year])
}

model LeaveRequest {
  id              String       @id @default(cuid())
  employeeId      String
  employee        Employee     @relation(fields: [employeeId], references: [id])
  leaveType       LeaveType
  startDate       DateTime
  endDate         DateTime
  days            Float
  reason          String?
  status          LeaveStatus  @default(PENDING_APPROVAL)
  approverId      String?      // Assigned by routing
  approvedBy      String?      // User who acted
  approvedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  approvals       LeaveApprova| **VICE_PRESIDENT** | `clearance:read`, `employee:read:any` | System‑wide |
l[]
}

model LeaveApproval {
  id         String      @id @default(cuid())
  leaveId    String
  leave      LeaveRequest @relation(fields: [leaveId], references: [id])
  approvedBy String
  decision   LeaveStatus
  remarks    String?
  timestamp  DateTime    @default(now())
}
```

### optional :3.5 Schedule Model

```prisma
model Schedule {
  id           String   @id @default(cuid())
  course       String
  instructorId String   // Employee.id
  day          String   // MON, TUE, WED, THU, FRI, SAT, SUN
  startTime    String   // HH:MM (24h)
  endTime      String
  location     String
  campusId     String
  campus       Campus   @relation(fields: [campusId], references: [id])
  createdAt    DateTime @default(now())
}
```

### 3.6 Performance Evaluation Model

```prisma
model PerformanceEvaluation {
  id               String   @id @default(cuid())
  employeeId       String
  employee         Employee @relation(fields: [employeeId], references: [id])
  evaluatorId      String   // User ID (HR_OFFICER)
  period           String   // e.g., "2025-Q1"
  efficiencyScore  Float    // 0–100
  workOutputScore  Float    // 0–100
  comments         String?
  createdAt        DateTime @default(now())
}
```

### 3.7 Clearance Models

```prisma
model Clearance {
  id           String          @id @default(cuid())
  employeeId   String
  employee     Employee        @relation(fields: [employeeId], references: [id])
  status       ClearanceStatus @default(IN_PROGRESS)
  initiatedBy  String          // User ID
  initiatedAt  DateTime        @default(now())
  completedAt  DateTime?
  tasks        ClearanceTask[]
}

model ClearanceTask {
  id           String              @id @default(cuid())
  clearanceId  String
  clearance    Clearance           @relation(fields: [clearanceId], references: [id])
  bodyName     String              // Library, IT, Finance, etc.
  status       ClearanceTaskStatus @default(PENDING)
  approverId   String?             // User ID of body approver
  remarks      String?
  order        Int
  approvalMode ApprovalMode
  approvedAt   DateTime?
}

// Optional: Configurable clearance bodies per campus
model ClearanceBodyConfig {
  id           String       @id @default(cuid())
  campusId     String?      // null = system-wide
  campus       Campus?      @relation(fields: [campusId], references: [id])
  name         String
  order        Int
  approvalMode ApprovalMode
  isActive     Boolean      @default(true)
}
```

### 3.8 Activity Log Model

```prisma
model ActivityLog {
  id         String        @id @default(cuid())
  actorId    String
  role       BaseRole
  action     ActivityAction
  resource   String        // e.g., "LeaveRequest", "Employee"
  resourceId String?
  before     Json?
  after      Json?
  metadata   Json?
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime      @default(now())
}
```

---

## 4. Business Rules & Workflows

### 4.1 Employee ID Generation
- **Format:** `[CampusCode]-[YY]-[SEQ]`
- **Example:** `MAIN-26-0045`
- **Rules:**
  - `CampusCode` immutable, assigned at campus creation.
  - `YY` = last two digits of current year.
  - `SEQ` = four‑digit zero‑padded counter, per campus per year, reset to 1 on Jan 1.
  - No two employees share the same ID.

### 4.2 Leave Management Rules

| Leave Type | Eligibility | Max Duration | Approval Authority | Balance Deduction |
|------------|-------------|--------------|--------------------|--------------------|
| Annual | All employees | 20 days +1/year up to 30 | HR_Officer | Yes |
| Maternity | Female employees | 30d prenatal + 90d postnatal | HR_Officer | No |
| Paternity | Male employees | 10 working days | HR_Officer | No |
| Sick | Medical certificate required | 6 months full pay + 2 months half pay | HR_Officer | Yes |
| Personal (marriage/bereavement) | All | 3 working days | HR_Officer | Yes |
| Special (court/election) | All | As needed | HR_Officer | No |
| Study | Academic staff, higher degree | First year full pay, subsequent 50% pay | HR_Officer | No |
| Research | Assistant Professor+, 3+ years service | Up to 6 months | Academic VP, HR_Officer | No |
| Sabbatical | Assistant Professor+, 6+ years service | 1 year full pay | Academic VP, HR_Officer | No |
| Without Pay | All | Up to 2 years | Academic VP, HR_Officer | No |

### 6.4 Leave Management
| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/api/v1/leave/apply` | EMPLOYEE (self) |
| GET | `/api/v1/leave/my-requests` | EMPLOYEE |
| GET | `/api/v1/leave/pending` | HR_OFFICER / Dean / Academic VP (role-specific) |
| POST | `/api/v1/leave/:id/approve` | Depends on leave type (routing) |
| POST | `/api/v1/leave/:id/reject` | Same as approve |
| GET | `/api/v1/leave/balance` | EMPLOYEE (self), HR/ADMIN (others campus) |

**Routing Logic:**
- Sabbatical → Department head → Dean of employee’s college → Academic Vice President → HR_Officer → Final Approval. The full information send to finance department dashboard with tag which describes the type of leave and salary information. (The employee must be notified and know the final approval status).
- Without Pay or Research  → Department head → Dean of employee’s college → Academic Vice President → HR_Officer → Final Approval. The full information send to finance department dashboard with tag which describes the type of leave and salary information. (The employee must be notified and know the final approval status).
- All others->Deapartment Head (if the employee works in non-academic department it will go directly to HR_Officer of employee’s campus.) → HR_Officer of employee’s campus. ->final approval(the employee should know the final approval status)

**Notification & Status Tracking:** Across *all* leave types and at *every* stage of the process, the applicant must be able to view the real-time status of their request (e.g., pending at which stage) and receive notifications upon final approval or rejection.

**Balance Update:** On approval, deduct `days` from `LeaveBalance.usedDays` within a database transaction (row lock). Prevent negative balance.

### 4.3 Clearance Workflow (DAG)

```
HR_Officer initiates clearance
         │
         ▼
┌────────────────────────────────────┐
│ All Clearance Bodies (parallel or  │
│ sequential per config)             │
│ - Library, IT, Finance, Store,     │
│   Lab, Sport, Security, etc.       │
└────────────────────────────────────┘
         │ (all approved)
         ▼
Campus HR_Officer approves campus portion
         │
         ▼
Head HR gives final approval
         │
         ▼
Employee account → INACTIVE
Experience letter available
```

- Each body can approve or reject with a reason.
- Rejection returns task to `PENDING`; employee must address and resubmit.
- Sequential mode: task N+1 becomes active only after task N approved.
- Parallel mode: tasks can be approved in any order.
- After all bodies approve, campus HR must explicitly approve.
- After campus HR approves, Head HR (`isHeadHR=true`) gives final approval.
- On final approval: set `User.isActive = false`, revoke all refresh tokens, set `Clearance.status = COMPLETED`.

**Final approval SHALL be granted ONLY to a user with `isHeadHR = true`. The system SHALL reject any final approval request from any other user, including SUPER_ADMIN, with an HTTP 403 error and log an `ACCESS_DENIED` activity entry.**

### 4.4 Performance Appraisal
- Only HR_Officer can create/update evaluations.
- Efficiency score and work output score (0–100).
- Employee receives notification when evaluation saved.
- Employee can view own evaluations (read‑only).

### optional : 4.5 Schedule Conflict Detection
- When creating or updating a schedule, check: same instructor, same day, overlapping time range → reject with conflict details.

### 4.6 Activity Logging
- Every state‑changing action (create, update, delete, approve, reject, initiate, generate, upload, assign, login, logout) must create an `ActivityLog` entry.
- Logs are immutable – no update or delete API.
- Retention: minimum 5 years (cron job to delete older logs).
- SUPER_ADMIN can view all logs; ADMIN can view logs scoped to their campus.

---

## 5. Role & Permission Matrix

### 5.1 Base Role Permissions

| Permission | SUPER_ADMIN | ADMIN | HR_OFFICER | EMPLOYEE |
|------------|-------------|-------|------------|----------|
| `activity_log:read` (full) | ✅ | ❌ | ❌ | ❌ |
| `activity_log:read` (campus) | ❌ | ✅ | ❌ | ❌ |
| `campus:manage` | ✅ | ❌ | ❌ | ❌ |
| `campus:read` | ✅ | ✅ | ✅ | ✅ |
| `college:manage` | ✅ | ✅ | ❌ | ❌ |
| `department:manage` | ✅ | ✅ | ❌ | ❌ |
| `unit:manage` | ✅ | ✅ | ❌ | ❌ |
| `employee:create` | ❌ | ✅ | ✅ | ❌ |
| `employee:read` (campus) | ❌ | ✅ | ✅ | ❌ |
| `employee:read` (own) | ✅ | ✅ | ✅ | ✅ |
| `employee:update` (campus) | ❌ | ✅ | ✅ | ❌ |
| `employee:activate` | ❌ | ✅ | ✅ | ❌ |
| `employee:document:upload` | ❌ | ✅ | ✅ | ❌ |
| `employee:role:assign` (Admin/HR only) | ✅ | ❌ | ❌ | ❌ |
| `employee:privilege:assign` | ❌ | ✅ | ❌ | ❌ |
| `leave:apply` | ❌ | ❌ | ❌ | ✅ |
| `leave:read` (campus) | ❌ | ✅ | ✅ | ❌ |
| `leave:read` (self) | ✅ | ✅ | ✅ | ✅ |
| `leave:approve` (standard) | ❌ | ❌ | ✅ | ❌ |
| `sabbatical:approve` | ❌ | ❌ | ❌ | ❌* |
| `leave:without_pay:approve` | ❌ | ❌ | ❌ | ❌* |
| `research_leave:approve` | ❌ | ❌ | ❌ | ❌* |
| `payroll:generate` | ❌ | ❌ | ✅ | ❌ |
| `payroll:export` | ❌ | ❌ | ✅ | ❌ |
| `clearance:initiate` | ❌ | ❌ | ✅ | ❌ |
| `clearance:read` (campus) | ❌ | ✅ | ✅ | ❌ |
| `clearance_task:approve` | ❌ | ❌ | ❌ | ❌** |
| `clearance:final:approve` | ❌ | ❌ | ❌ | ❌*** |
| `experience_letter:generate` | ❌ | ❌ | ✅ | ❌ |
| `schedule:write` | ❌ | ❌ | ✅ | ❌ |
| `schedule:read` (campus) | ✅ | ✅ | ✅ | ✅ |
| `evaluation:write` | ❌ | ❌ | ✅ | ❌ |
| `evaluation:read` (self) | ✅ | ✅ | ✅ | ✅ |
| `efficiency:insert` | ❌ | ❌ | ✅ | ❌ |
| `historical:read` (deactivated employees) | ✅ | ❌ | ❌ | ❌ |

> \* Granted only via special privilege (Dean, President).  
> \** Granted only to clearance body users (special accounts).  
> \*** Granted only to Head HR (`isHeadHR=true`).

### 5.2 Special Privileges (Additive)

| Privilege | Added Permissions | Scope |
|-----------|-------------------|-------|
| **DEAN** | `sabbatical:approve`, `employee:read:college`, `schedule:read`, `leave:read:college`, `clearance:read` | College |
| **UNIVERSITY_PRESIDENT** | `leave:without_pay:approve`, `research_leave:approve`, `clearance:read`, `employee:read:any` | System‑wide 
> A user retains all base role permissions when granted a special privilege.


---

## 6. API Endpoints

### 6.1 Authentication
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/api/v1/auth/login` | Login, returns JWT + refresh token | Public |
| POST | `/api/v1/auth/logout` | Logout, revoke refresh token | Authenticated |
| POST | `/api/v1/auth/change-password` | Change password | Authenticated |
| POST | `/api/v1/auth/refresh` | Refresh access token | Authenticated |

### 6.2 Organisation Hierarchy
| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/v1/campuses` | All (campus-scoped) |
| POST | `/api/v1/campuses` | SUPER_ADMIN |
| PUT | `/api/v1/campuses/:id` | SUPER_ADMIN |
| DELETE | `/api/v1/campuses/:id` | SUPER_ADMIN (if no employees) |
| GET | `/api/v1/colleges` | All |
| POST | `/api/v1/colleges` | ADMIN (own campus) |
| PUT | `/api/v1/colleges/:id` | ADMIN |
| DELETE | `/api/v1/colleges/:id` | ADMIN |
| GET | `/api/v1/departments` | All |
| POST | `/api/v1/departments` | ADMIN |
| ... similarly for units | ... | ... |

### 6.3 Employees
| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/v1/employees` | ADMIN/HR_OFFICER (campus-scoped) |
| GET | `/api/v1/employees/me` | All (own profile) |
| POST | `/api/v1/employees` | ADMIN/HR_OFFICER |
| PUT | `/api/v1/employees/:id` | ADMIN/HR_OFFICER (campus) |
| POST | `/api/v1/employees/:id/activate` | ADMIN/HR_OFFICER |
| POST | `/api/v1/employees/:id/documents` | ADMIN/HR_OFFICER |
| GET | `/api/v1/employees/deactivated` | SUPER_ADMIN |

### 6.4 Leave Management
| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/api/v1/leave/apply` | EMPLOYEE (self) |
| GET | `/api/v1/leave/my-requests` | EMPLOYEE |
| GET | `/api/v1/leave/pending` | HR_OFFICER / Dean / President (role-specific) |
| POST | `/api/v1/leave/:id/approve` | Depends on leave type (routing) |
| POST | `/api/v1/leave/:id/reject` | Same as approve |
| GET | `/api/v1/leave/balance` | EMPLOYEE (self), HR/ADMIN (others campus) |

### optional :6.5 Schedule
| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/v1/schedules` | All (campus-scoped) |
| POST | `/api/v1/schedules` | HR_OFFICER |
| PUT | `/api/v1/schedules/:id` | HR_OFFICER |S
| DELETE | `/api/v1/schedules/:id` | HR_OFFICER |
| POST | `/api/v1/schedules/:id/substitute` | HR_OFFICER |

### 6.6 Performance
| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/v1/evaluations/my` | EMPLOYEE |
| GET | `/api/v1/evaluations` | HR_OFFICER (campus) |
| POST | `/api/v1/evaluations` | HR_OFFICER |
| PUT | `/api/v1/evaluations/:id` | HR_OFFICER |

### 6.7 Payroll
| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/api/v1/payroll/generate` | HR_OFFICER (Excel) |

### 6.8 Clearance
| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/api/v1/clearance/initiate/:employeeId` | HR_OFFICER |
| GET | `/api/v1/clearance/:id` | HR_OFFICER, ADMIN, President |
| PUT | `/api/v1/clearance/task/:taskId/approve` | Clearance body user |
| PUT | `/api/v1/clearance/task/:taskId/reject` | Clearance body user |
| PUT | `/api/v1/clearance/:id/campus-approve` | HR_OFFICER (campus) |
| PUT | `/api/v1/clearance/:id/final-approve` | Head HR |

### 6.9 Experience Letter
| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/v1/experience/:employeeId` | HR_OFFICER (download DOCX) |

### 6.10 Activity Log
| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/api/v1/activity-logs` | SUPER_ADMIN (full), ADMIN (campus) |
| GET | `/api/v1/activity-logs/export` | Same as above |

---

## 7. Frontend Pages & Components

### 7.1 Public / Authentication
- `/login` – login form
- `/reset-password` – request password reset
- `/set-password` – set new password (temp password flow)

### 7.2 Employee Self‑Service (ESS)
- `/dashboard` – overview with leave balance, upcoming leaves
- `/profile` – view own profile
- `/leave/apply` – apply for leave
- `/leave/history` – list own leave requests
- `/timetable` – read‑only campus timetable
- `/evaluations` – read‑only own evaluations

### 7.3 HR_Officer Dashboard
- `/hr/employees` – list, create, edit employees
  - **Progressive Employee Profiling**: Employee creation supports incomplete initial data. An employee can be created with or without a department assignment.
  - **Profile Management**: Department assignment and other profile details are optional during creation and can be assigned or changed later through the HR management workflow. HR users have full ability to edit and manage the employee's complete profile information after creation.
  - **Data Synchronization**: Any updates made by HR to employee information are immediately reflected and visible within the employee-facing self-service view (`/profile`).
- `/hr/leave/approvals` – pending leave requests (campus)
- `/hr/performance` – create/update evaluations
- `/hr/payroll` – generate reports
- `/hr/clearance` – initiate and monitor clearance
- `/hr/experience` – generate experience letters

### 7.4 Admin Dashboard
- `/admin/org` – manage campuses, colleges, departments, units
- `/admin/clearance-bodies` – configure clearance bodies
- `/admin/privileges` – assign special privileges

### 7.5 Super Admin Dashboard
- `/super/users` – create Admin/HR_Officer accounts
- `/super/activity-logs` – view and filter logs
- `/super/campuses` – manage campuses

### 7.6 Clearance Body User Interface
- `/clearance/tasks` – list tasks assigned to the logged‑in body user (Library, IT, etc.)
- `/clearance/task/:id` – approve/reject with remarks

### 7.7 Academic Approver Dashboard (VP, Dean, Dept Head)
- Inherits all features from **7.2 Employee Self‑Service (ESS)**.
- `/approvals/leave` – Dedicated module to review and approve/reject pending leave requests routed to their respective stage (Department, Dean, or VP).

### 7.8 Finance Department Dashboard
- `/finance/payroll` – Receive and accept payroll-related reports from the HR_Officer.
- `/finance/leave-data` – Dashboard to view full information with tags describing the type of leave and salary information (especially for Sabbatical, Research, and Without Pay leaves).

---

## 8. Security & Compliance

### 8.1 Authentication
- JWT access token: short expiry (15 minutes).
- Refresh token: 7 days, stored in DB, can be revoked.
- Passwords hashed with bcrypt (cost factor 12).
- Temporary passwords force change on first login.

### 8.2 Authorization
- Permission middleware on every protected endpoint.
- Campus scoping enforced via JWT `campusId` claim.
- Special privileges additive – never replace base role.

### 8.3 Data Protection
- All database connections over TLS (Neon PostgreSQL).
- Input validation using Zod.
- SQL injection prevention via Prisma ORM.
- Activity log immutable (no update/delete API).

### 8.4 Audit
- Every state‑changing action logged with before/after states (JSON).
- Logs retained for 5 years.
- SUPER_ADMIN can export logs.

---

## 9. Testing Requirements

### 9.1 Unit Tests (Jest)
- Permission middleware
- Leave balance calculation
- Conflict detection logic
- ID generation format
- Leave eligibility rules

### 9.2 Integration Tests (Supertest)
- Each API endpoint with different roles (200/403)
- Clearance workflow end‑to‑end
- Leave routing and approval chain
- Activity log creation

### 9.3 Frontend Tests (React Testing Library)
- Conditional rendering based on permissions
- Form submission and error handling

### 9.4 End‑to‑End (Playwright – optional)
- User login → apply leave → HR approves → balance updates

---

## 10. Deployment (No Docker)

### 10.1 Environment Variables

```env
DATABASE_URL="postgresql://user:pass@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=4005
NODE_ENV=production
CORS_ORIGIN="http://localhost:3000"
```

### 10.2 Backend Deployment

```bash
npm run build                     # compile TypeScript to dist/
npx prisma migrate deploy         # run migrations on production DB
NODE_ENV=production node dist/server.js
```

Use `pm2` for process management:

```bash
pm2 start dist/server.js --name hrms-backend
pm2 save
pm2 startup
```

### 10.3 Frontend Deployment

```bash
npm run build                     # generates dist/
npx serve -s dist -l 3000
```

Or use a web server (nginx) to serve static files and proxy API requests.

---

## 11. Acceptance Criteria

- [ ] All modules implemented and permission‑protected.
- [ ] Leave routing works correctly (Academic VP and HR for Sabbatical/Research/Without Pay).
- [ ] Clearance workflow completes (bodies → campus HR → Head HR) and deactivates account.
- [ ] Activity logs record every action and are immutable.
- [ ] SUPER_ADMIN cannot view active employee data but can view deactivated historical records.
- [ ] HR_OFFICER can generate payroll (Excel) report.
- [ ] No Docker used anywhere.
- [ ] All tests pass.
- [ ] Frontend role‑based dashboards function correctly.

---

## 12. Appendices

### Appendix A – Permission to Role Mapping (Code Reference)

```typescript
// For backend permission middleware
const rolePermissions = {
  SUPER_ADMIN: ['activity_log:read', 'campus:manage', 'role:assign', 'historical:read'],
  ADMIN: ['campus:read', 'college:manage', 'employee:manage', 'clearance_body:configure', 'privilege:assign', 'activity_log:read:campus'],
  HR_OFFICER: ['employee:create', 'employee:update', 'leave:approve', 'payroll:generate', 'clearance:initiate', 'experience:generate', 'schedule:write', 'evaluation:write'],
  EMPLOYEE: ['leave:apply', 'profile:read:self', 'timetable:read']
};

const privilegePermissions = {
  DEAN: ['sabbatical:approve', 'employee:read:college', 'schedule:read', 'leave:read:college', 'clearance:read'],
  UNIVERSITY_PRESIDENT: ['leave:without_pay:approve', 'research_leave:approve', 'clearance:read', 'employee:read:any']
};
```

### Appendix B – Example JWT Payload

```json
{
  "sub": "user_123",
  "email": "hr@main.edu",
  "baseRole": "HR_OFFICER",
  "campusId": "campus_main",
  "privileges": [],
  "permissions": ["employee:create", "leave:approve", "payroll:generate"],
  "iat": 1715000000,
  "exp": 1715000900
}
```

### Appendix C – Clearance Body Default Configuration

| Body Name | Default Mode | Order |
|-----------|--------------|-------|
| Library | PARALLEL | 1 |
| IT | PARALLEL | 2 |
| Finance | SEQUENTIAL | 3 |
| Store | PARALLEL | 4 |
| Lab | PARALLEL | 5 |
| Sport | PARALLEL | 6 |
| Security | SEQUENTIAL | 7 |

---

**End of System Specification**

```
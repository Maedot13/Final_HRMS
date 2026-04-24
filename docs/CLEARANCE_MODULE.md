# HRMS Clearance Module — Technical & Operational Documentation

> **Version:** 2.0  
> **Last Updated:** April 24, 2026  
> **Module Owner:** HR Department  
> **Status:** Production-Ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [Workflow Summary](#2-workflow-summary)
3. [Roles & Responsibilities](#3-roles--responsibilities)
4. [Detailed Workflow Stages](#4-detailed-workflow-stages)
5. [Priority Order & Parallel Approval](#5-priority-order--parallel-approval)
6. [Rejection & Resolution Flow](#6-rejection--resolution-flow)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Frontend Pages & Components](#9-frontend-pages--components)
10. [Admin Configuration](#10-admin-configuration)
11. [Security & Access Control](#11-security--access-control)
12. [Test Accounts](#12-test-accounts)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

The Clearance Module manages the complete employee offboarding/clearance process in the HRMS. It enforces a strict, multi-step approval workflow where clearance must be obtained from every active clearance body across **all campuses** before the employee's account is deactivated.

### Key Design Principles

- **HR-Initiated Only**: Only users with the `HR_OFFICER` role can initiate a clearance request for any employee.
- **All-Campus Coverage**: When a clearance is initiated, checks are created for **every active clearance unit across all campuses**, not just the employee's home campus.
- **Isolated Rejections**: A rejection from one clearance body does **not** terminate the entire process. Other bodies can continue approving in parallel. The rejected body can re-approve once the issue is resolved.
- **Automatic Account Deactivation**: Upon final approval by the Head HR, the employee's user account is automatically set to `isActive: false`, their employment status changes to `SUSPENDED`, and all active sessions are revoked.

---

## 2. Workflow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLEARANCE WORKFLOW                             │
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ HR Officer│───>│ All Clearance│───>│ Campus HR    │               │
│  │ Initiates │    │ Bodies Approve│   │ Officers     │               │
│  │ Request   │    │ (All Campuses)│   │ Approve      │               │
│  └──────────┘    └──────────────┘    └──────────────┘               │
│                                              │                       │
│                                              ▼                       │
│                                     ┌──────────────┐                 │
│                                     │  Head HR      │                │
│                                     │  Final Approve│                │
│                                     └──────┬───────┘                 │
│                                            │                         │
│                                            ▼                         │
│                                     ┌──────────────┐                 │
│                                     │ Employee      │                │
│                                     │ Account       │                │
│                                     │ DEACTIVATED   │                │
│                                     └──────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Status Lifecycle

| Status | Description |
|--------|-------------|
| `BODY_APPROVAL_PENDING` | Initial state — waiting for all clearance bodies to approve |
| `HR_APPROVAL_PENDING` | All clearance bodies approved — waiting for campus HR officers |
| `HR_APPROVED` | All campus HR officers approved — waiting for Head HR final sign-off |
| `COMPLETED` | Head HR approved — employee account deactivated |
| `REJECTED` | Head HR or Campus HR rejected (terminal state — requires re-initiation) |

---

## 3. Roles & Responsibilities

| Role | Capability | Module Access |
|------|-----------|---------------|
| **HR_OFFICER** | Initiate clearance for any employee by ID; approve campus-level HR sign-off | Clearance Management page |
| **CLEARANCE_BODY** | View pending checks assigned to their unit; approve or reject (with mandatory reason) | Clearance Body Dashboard |
| **ADMIN** | Manage clearance units (create, edit priority order, activate/deactivate); view pending checks | Admin → Clearance Bodies |
| **HEAD_HR** (`isHeadHR: true`) | Final approval/rejection after all campus HRs have signed off | Final Clearance Approvals page |
| **DEPARTMENT_HEAD** | View clearance requests; approve department-specific checks | Clearance Details modal |
| **FINANCE_OFFICER** | View clearance requests; approve finance-specific checks | Clearance Details modal |
| **EMPLOYEE** | **Cannot** initiate or approve clearance; view-only | N/A |

---

## 4. Detailed Workflow Stages

### Stage 1: Initiation (HR Officer)

1. HR Officer navigates to **Clearance Management** page.
2. Clicks **"Initiate Clearance"** button (visible only to `HR_OFFICER` role).
3. Enters the target employee's **Employee ID** (e.g., `EMP_REGULAR`).
4. Clicks **"Verify"** — the system looks up the employee and displays their name and campus.
5. Fills in:
   - **Reason** (min. 10 characters) — e.g., "Resignation", "Retirement", "Transfer"
   - **Last Working Day** (date picker)
6. Submits → The system creates:
   - One `ClearanceRequest` record with status `BODY_APPROVAL_PENDING`
   - One `ClearanceCheck` record (status `PENDING`) for **each active `ClearanceUnit`** across all campuses

**API**: `POST /api/v1/clearance/requests`
```json
{
  "targetEmployeeId": "EMP_REGULAR",
  "reason": "Resignation — accepted by department",
  "lastWorkingDay": "2026-05-15"
}
```

### Stage 2: Body Approvals (Clearance Bodies)

1. Each clearance body logs in to the **Clearance Body Dashboard**.
2. They see a table of pending checks assigned to their specific unit.
3. For each request, they can:
   - **Approve** ✓ — with optional comment
   - **Reject** ✗ — with **mandatory** reason (min. 5 chars)
4. Approved checks are marked `APPROVED`. Rejected checks are marked `REJECTED`.
5. The main request stays `BODY_APPROVAL_PENDING` until **all** checks are `APPROVED`.

**Priority Ordering**: If sequential clearance is enabled on the campus, bodies can only act after all lower-priority-order bodies have approved. Bodies with the **same priority order** can approve **in parallel**.

**API — Approve**: `PATCH /api/v1/clearance/requests/:id/approve-check`
```json
{
  "unitId": 5,
  "comment": "All library materials returned"
}
```

**API — Reject**: `PATCH /api/v1/clearance/requests/:id/reject-check`
```json
{
  "unitId": 5,
  "comment": "Outstanding library fine of 500 ETB"
}
```

### Stage 3: Campus HR Approval

Once all checks are `APPROVED`, the request status transitions to `HR_APPROVAL_PENDING`.

1. Campus HR Officers see the request in their clearance management queue.
2. Each campus HR reviews and approves for their campus.
3. Once **all** campuses' HR officers have approved, status moves to `HR_APPROVED`.

**API**: `PATCH /api/v1/clearance/requests/:id/hr-approve`
```json
{
  "isApprove": true,
  "notes": "All campus departments have confirmed clearance."
}
```

### Stage 4: Head HR Final Approval

1. Head HR sees requests with status `HR_APPROVED` in the **Final Clearance Approvals** page.
2. Reviews the request summary and:
   - **Approves** → Status becomes `COMPLETED`
   - **Rejects** → Status becomes `REJECTED` with mandatory reason

**Upon Final Approval, the system automatically:**
- Sets the employee's `employmentStatus` to `SUSPENDED`
- Sets the user's `isActive` to `false` (blocks future logins)
- Revokes all active `refreshToken` sessions
- Dispatches a `CLEARANCE_COMPLETED` system event
- Notifies all HR Officers

**API**: `PATCH /api/v1/clearance/requests/:id/final-approve`
```json
{
  "action": "APPROVE",
  "reason": "Final clearance granted."
}
```

---

## 5. Priority Order & Parallel Approval

### How Priority Works

Each `ClearanceUnit` has a `priorityOrder` field (integer, default `0`). When the campus has `isClearanceSequential: true`, the system enforces ordering:

| Scenario | Behaviour |
|----------|----------|
| **Library** (P0), **Sport** (P0) | ✅ Can approve **simultaneously** (same priority) |
| **Library** (P0), **IT** (P1) | ❌ IT is **blocked** until Library approves |
| **Library** (P0), **Sport** (P0), **IT** (P1) | IT waits for **both** Library AND Sport to finish |
| **Library** (P0) rejected, **Sport** (P0) | ✅ Sport can still approve (rejection doesn't block peers) |
| **Library** (P0) rejected, **IT** (P1) | ❌ IT is blocked because Library at P0 is still unresolved |

### Configuring Priority

1. Login as **Admin** (`EMP_ADMIN` / `Admin123!`)
2. Navigate to **Admin → Clearance Bodies**
3. Click **Edit** on any unit
4. Set the **Priority Order (Sequential)** field
5. Save

### Enabling/Disabling Sequential Mode

Sequential mode is a **per-campus** setting (`Campus.isClearanceSequential`). When disabled, all bodies can approve in any order regardless of priority.

---

## 6. Rejection & Resolution Flow

### How Rejection Works

When a clearance body rejects a check:

1. **Only the individual check** is marked `REJECTED` — the overall request stays `BODY_APPROVAL_PENDING`.
2. Other clearance bodies with the **same or lower priority** can continue approving.
3. The rejection reason is stored on the check and visible in the Detail Modal.
4. A red **"Issue Raised"** banner appears in the clearance detail view showing:
   - Which unit raised the issue
   - The specific reason

### Resolution Process

1. The employee resolves the issue offline (e.g., returns books, pays fines).
2. The **same clearance body** that rejected logs back into their dashboard.
3. The rejected check appears with a **Re-Approve** button (↻ icon).
4. Body clicks Re-Approve → check status transitions from `REJECTED` → `APPROVED`.
5. If this was the last non-approved check, the request automatically advances to `HR_APPROVAL_PENDING`.

### Important Rules

| Rule | Details |
|------|---------|
| Approved checks **cannot** be rejected | Once approved, the decision is final for that body |
| Rejected checks can be re-approved | Via the same approve endpoint — the guard accepts both `PENDING` and `REJECTED` |
| Rejection does not cascade | Other units are NOT affected |
| The request auto-recovers | Status resets to `BODY_APPROVAL_PENDING` when a re-approval occurs |

---

## 7. Database Schema

### ClearanceRequest

| Column | Type | Description |
|--------|------|-------------|
| `id` | Int (PK) | Auto-increment |
| `employeeId` | Int (FK) | Target employee |
| `reason` | String | Reason for clearance |
| `lastWorkingDay` | DateTime | Employee's last day |
| `status` | ClearanceStatus | Current workflow status |
| `campusId` | Int? (FK) | Employee's campus |
| `initiatedById` | Int? | Who started the process |
| `finalApprovedById` | Int? | Head HR who gave final approval |
| `finalApprovedAt` | DateTime? | When final approval was given |
| `rejectedAt` | DateTime? | When/if rejected |
| `rejectionReason` | String? | Latest rejection reason |

### ClearanceUnit

| Column | Type | Description |
|--------|------|-------------|
| `id` | Int (PK) | Auto-increment |
| `name` | String | System code (e.g., `LIBRARY`) |
| `fullName` | String? | Display name (e.g., `Central Library`) |
| `description` | String? | Unit responsibilities |
| `isActive` | Boolean | Whether this unit participates in clearance |
| `campusId` | Int? (FK) | Which campus this unit belongs to |
| `priorityOrder` | Int | Sequential order (0 = first, higher = later) |
| `isSystemGenerated` | Boolean | Cannot be renamed/deleted if true |

**Unique constraint**: `[campusId, name]` — no duplicate names per campus.

### ClearanceCheck

| Column | Type | Description |
|--------|------|-------------|
| `id` | Int (PK) | Auto-increment |
| `clearanceId` | Int (FK) | Parent request |
| `unitId` | Int (FK) | Which unit this check belongs to |
| `status` | ClearanceStatus | `PENDING`, `APPROVED`, or `REJECTED` |
| `approverId` | Int? | Who made the decision |
| `approvedAt` | DateTime? | When the decision was made |
| `comment` | String? | Approval note or rejection reason |

**Unique constraint**: `[clearanceId, unitId]` — one check per unit per request.

### ClearanceApproval

| Column | Type | Description |
|--------|------|-------------|
| `id` | Int (PK) | Auto-increment |
| `clearanceId` | Int (FK) | Parent request |
| `campusId` | Int (FK) | Which campus HR is approving for |
| `approvedById` | Int (FK) | The HR Officer user |
| `status` | ClearanceStatus | `APPROVED` or `REJECTED` |
| `approvedAt` | DateTime? | Decision timestamp |
| `notes` | String? | Approval or rejection notes |

**Unique constraint**: `[clearanceId, campusId]` — one approval per campus per request.

### ClearanceStatus Enum

```
PENDING                → Initial state for checks
APPROVED               → Check or request approved
REJECTED               → Check rejected or final rejection
IN_PROGRESS            → (Reserved for future use)
BODY_APPROVAL_PENDING  → Request: waiting for body approvals
BODY_APPROVED          → (Reserved for future use)
HR_APPROVAL_PENDING    → Request: all bodies approved, waiting for campus HR
HR_APPROVED            → Request: all campus HRs approved, waiting for Head HR
FINAL_APPROVED         → (Reserved for future use)
COMPLETED              → Request: Head HR approved, account deactivated
```

---

## 8. API Reference

All endpoints require `Authorization: Bearer <token>` header.  
Base URL: `/api/v1/clearance`

### Requests

| Method | Endpoint | Role Required | Description |
|--------|----------|--------------|-------------|
| `POST` | `/requests` | `HR_OFFICER` | Initiate clearance for an employee |
| `GET` | `/requests` | `HR_OFFICER`, `DEPARTMENT_HEAD`, `FINANCE_OFFICER` | List clearance requests (filterable by `?status=`) |
| `GET` | `/requests/:id` | `HR_OFFICER`, `DEPARTMENT_HEAD`, `FINANCE_OFFICER`, `CLEARANCE_BODY` | Get request details with all checks |
| `PATCH` | `/requests/:id/approve-check` | `HR_OFFICER`, `DEPARTMENT_HEAD`, `FINANCE_OFFICER`, `CLEARANCE_BODY` | Approve (or re-approve) a unit check |
| `PATCH` | `/requests/:id/reject-check` | `HR_OFFICER`, `DEPARTMENT_HEAD`, `FINANCE_OFFICER`, `CLEARANCE_BODY` | Reject a unit check (comment required) |
| `PATCH` | `/requests/:id/hr-approve` | `HR_OFFICER` | Campus-level HR approval |
| `PATCH` | `/requests/:id/final-approve` | `HEAD_HR` only | Head HR final approval/rejection |

### Units (Admin)

| Method | Endpoint | Role Required | Description |
|--------|----------|--------------|-------------|
| `GET` | `/units` | `ADMIN`, `HR_OFFICER` | List all clearance units |
| `POST` | `/units` | `ADMIN` | Create a new clearance unit + body account |
| `PATCH` | `/units/:unitId` | `ADMIN` | Update unit (name, priority, active status) |
| `DELETE` | `/units/:unitId` | `ADMIN` | Delete a non-system unit |
| `GET` | `/units/:unitId/pending` | `ADMIN`, `HR_OFFICER`, `DEPARTMENT_HEAD`, `CLEARANCE_BODY` | Pending checks for a specific unit |

### Request Payload Examples

**Initiate Clearance**
```json
POST /api/v1/clearance/requests
{
  "targetEmployeeId": "EMP_REGULAR",
  "reason": "Voluntary resignation",
  "lastWorkingDay": "2026-05-30"
}
```

**Approve Check**
```json
PATCH /api/v1/clearance/requests/42/approve-check
{
  "unitId": 7,
  "comment": "All equipment returned in good condition"
}
```

**Reject Check**
```json
PATCH /api/v1/clearance/requests/42/reject-check
{
  "unitId": 3,
  "comment": "Outstanding fine of 500 ETB — must be paid before clearance"
}
```

**Final Approve**
```json
PATCH /api/v1/clearance/requests/42/final-approve
{
  "action": "APPROVE",
  "reason": "All requirements fulfilled"
}
```

**Final Reject**
```json
PATCH /api/v1/clearance/requests/42/final-approve
{
  "action": "REJECT",
  "reason": "Missing documentation from Finance department"
}
```

---

## 9. Frontend Pages & Components

### Pages

| Page | Route | Role | Description |
|------|-------|------|-------------|
| **Clearance Management** | `/clearance` | `HR_OFFICER` (initiate), all (view) | Main clearance page with request list and initiate button |
| **Clearance Body Dashboard** | `/clearance-body` | `CLEARANCE_BODY` | Dedicated dashboard for bodies to approve/reject |
| **Final Clearance Approvals** | `/hr/clearance` | `HEAD_HR` | Head HR final sign-off page with stats |
| **Clearance Bodies Admin** | `/admin/clearance-bodies` | `ADMIN` | CRUD for clearance units |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `ClearanceRequestModal` | `features/clearance/ClearanceRequestModal.tsx` | HR Officer form: search employee by ID, verify, submit |
| `ClearanceDetailModal` | `features/clearance/ClearanceDetailModal.tsx` | Scrollable detail view grouped by campus with inline rejection forms |

### Detail Modal Features

- **Fixed height** (75vh) with scrollable content — no oversized dropdowns
- **Campus grouping**: Checks are organized under campus headers with map pin icons
- **Priority column**: Shows `P0`, `P1`, etc. for each unit
- **Rejection alert banner**: Red banner at top listing all rejected units with reasons
- **Inline rejection form**: Expanding text area within the table row (no browser popups)
- **Re-approve button**: Refresh icon (↻) on rejected checks to resolve and re-approve

---

## 10. Admin Configuration

### Creating a New Clearance Body

1. Login as **Admin**
2. Navigate to **Admin → Clearance Bodies**
3. Click **"Add New Unit"**
4. Fill in:
   - **Unit Code** (system name, e.g., `REGISTRAR`)
   - **Full Name** (e.g., `Office of the Registrar`)
   - **Description** (optional)
   - **Priority Order** (0 = first, higher = later)
   - **Login ID** (account for this body, e.g., `REG-01`)
   - **Login Password** (secure password)
5. Save → The system creates both the unit and a `CLEARANCE_BODY` user account

### Editing Priority Order

1. Click **Edit** on any unit in the table
2. Change the **Priority Order** field
3. Save → Takes effect on the **next** clearance request (does not retroactively affect in-progress requests)

### Activating / Deactivating Units

- Click **Deactivate** to exclude a unit from future clearance processes
- Click **Activate** to re-include it
- Deactivated units' existing pending checks are unaffected

---

## 11. Security & Access Control

### Authentication

- JWT-based with access + refresh token rotation
- `clearanceUnitId` is embedded in the JWT for `CLEARANCE_BODY` users
- Token includes: `userId`, `role`, `scope`, `campusId`, `clearanceUnitId`, `isHeadHR`

### Authorization Enforcement

| Control | Implementation |
|---------|---------------|
| **Initiation** | Controller checks `req.user.role === HR_OFFICER` |
| **Body View** | CLEARANCE_BODY can only query their own `clearanceUnitId` |
| **Check Approval** | Service calls `canApproveForUnit(userId, unitId)` |
| **Campus Isolation** | Campus-scoped users only see requests from their campus |
| **Head HR** | `authorizeHeadHR` middleware checks `isHeadHR: true` |
| **Final Deactivation** | Runs inside a Prisma transaction (atomic) |

### Session Revocation

Upon final clearance completion:
1. Employee's `User.isActive` is set to `false`
2. All `RefreshToken` records for the user are set to `revoked: true`
3. Any subsequent API call with the old access token is rejected at the `isActive` check

---

## 12. Test Accounts

| Role | Employee ID | Password | Purpose |
|------|-------------|----------|---------|
| **HR Officer** | `EMP_HR_TEST` | `HrOfficer123!` | Initiate clearance, campus HR approval |
| **Library Body** | `LIB-01` | `LibraryPass123!` | Approve/reject library checks |
| **Sport Body** | `SPO-01` | `SportPass123!` | Approve/reject sport checks |
| **IT Body** | `IT-01` | `ITPass123!` | Approve/reject IT checks |
| **Head HR** | `EMP0001` | `HeadHR123!` | Final approval/rejection |
| **Admin** | `EMP_ADMIN` | `Admin123!` | Manage clearance units |
| **Regular Employee** | `EMP_REGULAR` | `password123` | Target for clearance testing |
| **Sabbatical Employee** | `EMP_SABBATICAL` | `password123` | Alternative clearance target |

### Full Test Scenario

1. **Login** as `EMP_HR_TEST` → Navigate to Clearance → **Initiate Clearance** for `EMP_REGULAR`
2. **Login** as `LIB-01` → See the request → **Approve**
3. **Login** as `SPO-01` → See the request → **Reject** (with reason "Unreturned equipment")
4. *Employee resolves the issue offline*
5. **Login** as `SPO-01` again → See the rejected check → **Re-Approve** (↻ icon)
6. **Login** as `IT-01` → **Approve**
7. All bodies done → Status auto-transitions to `HR_APPROVAL_PENDING`
8. **Login** as `EMP_HR_TEST` → **Campus HR Approve**
9. Status transitions to `HR_APPROVED`
10. **Login** as `EMP0001` (Head HR) → **Final Approve**
11. Status becomes `COMPLETED` — **EMP_REGULAR can no longer login**

---

## 13. Troubleshooting

### "Can't reach database server"

**Cause**: Neon Postgres free tier suspends after ~5 minutes of inactivity.  
**Fix**: Restart the backend server (`Ctrl+C` → `npm run dev`). A keep-alive ping runs every 4 minutes to prevent future suspensions during active use. The connection string also has `connect_timeout=30` to handle cold starts gracefully.

### "Invalid credentials" on login

**Cause**: Passwords may have been reset by a seed script.  
**Fix**: Run the password reset script:
```bash
cd packages/backend
npx ts-node scripts/reset-test-passwords.ts
```

### Clearance body dashboard shows "No clearance unit assigned"

**Cause**: The logged-in user doesn't have a `clearanceUnitId` set.  
**Fix**: Check the database that the user record has the correct `clearanceUnitId` pointing to an active `ClearanceUnit`.

### Clearance body sees empty pending list

**Possible causes**:
1. The body's token doesn't contain `clearanceUnitId` → **Solution**: Log out and log back in to get a fresh token.
2. No active clearance requests exist → Check HR Officer's clearance page.
3. Role permissions → The body must have role `CLEARANCE_BODY` and the API must include their role in the authorization list.

### Sequential enforcement error

**Message**: "You cannot evaluate this check until all prior units have approved."  
**Cause**: The campus has `isClearanceSequential: true` and there are still `PENDING` checks at a lower priority level.  
**Fix**: Ensure all lower-priority bodies approve first. Bodies at the **same** priority level can approve in parallel.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                       │
│                                                                         │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │ ClearancePage │  │ ClearanceBody    │  │ HeadHRClearancePage        │ │
│  │ (HR Officer)  │  │ Dashboard (Body) │  │ (Head HR Final Approval)  │ │
│  └──────┬───────┘  └────────┬─────────┘  └────────────┬───────────────┘ │
│         │                   │                          │                 │
│         ▼                   ▼                          ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  clearanceApi (API Client)                       │   │
│  └──────────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │ HTTP (Vite proxy → localhost:3000)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express + Prisma)                       │
│                                                                         │
│  ┌────────────────┐  ┌──────────────────┐  ┌───────────────────────┐   │
│  │ auth.middleware │  │ clearance.routes  │  │ clearance.controller  │   │
│  │ (JWT + RBAC)   │  │ (Route Guards)    │  │ (Request Handling)    │   │
│  └────────────────┘  └──────────────────┘  └───────────┬───────────┘   │
│                                                         │               │
│                                             ┌───────────▼───────────┐   │
│                                             │ clearance.service     │   │
│                                             │ (Business Logic)      │   │
│                                             │  • initiateClearance  │   │
│                                             │  • approveCheck       │   │
│                                             │  • rejectCheck        │   │
│                                             │  • approveCampusHR    │   │
│                                             │  • finalApprove       │   │
│                                             └───────────┬───────────┘   │
│                                                         │               │
│                                             ┌───────────▼───────────┐   │
│                                             │  Prisma ORM           │   │
│                                             │  (PostgreSQL / Neon)   │   │
│                                             └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Reference

### Backend

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema (ClearanceRequest, ClearanceUnit, ClearanceCheck, ClearanceApproval) |
| `src/routes/clearance.routes.ts` | API route definitions with role-based guards |
| `src/controllers/clearance.controller.ts` | Request/response handling, input validation |
| `src/services/clearance.service.ts` | Core business logic (initiate, approve, reject, final approve) |
| `src/services/authorization.service.ts` | `canApproveForUnit()` — role-to-unit authorization |
| `src/schemas/clearance.schema.ts` | Zod validation schemas |
| `src/utils/token.ts` | JWT TokenPayload definition (includes `clearanceUnitId`) |
| `src/lib/prisma.ts` | Prisma client with Neon keep-alive |

### Frontend

| File | Purpose |
|------|---------|
| `src/api/clearance.ts` | API client functions + TypeScript interfaces |
| `src/pages/ClearancePage.tsx` | Main clearance management page (HR Officer) |
| `src/pages/ClearanceBodyDashboard.tsx` | Clearance body approval dashboard |
| `src/pages/HeadHRClearancePage.tsx` | Head HR final approval page |
| `src/pages/admin/ClearanceBodiesPage.tsx` | Admin unit management page |
| `src/features/clearance/ClearanceRequestModal.tsx` | Employee search + initiation form |
| `src/features/clearance/ClearanceDetailModal.tsx` | Scrollable, campus-grouped detail view |

---

*End of Document*

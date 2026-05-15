# HRMS Payroll Module — Technical & Operational Documentation

> **Version:** 1.0  
> **Last Updated:** May 9, 2026  
> **Module Owner:** HR Department / Finance Department  
> **Status:** Production-Ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [Workflow Summary](#2-workflow-summary)
3. [Roles & Responsibilities](#3-roles--responsibilities)
4. [Detailed Workflow Stages](#4-detailed-workflow-stages)
5. [Business Rules & Calculations](#5-business-rules--calculations)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [Frontend Pages & Components](#8-frontend-pages--components)
9. [Security & Access Control](#9-security--access-control)
10. [Integration with Other Modules](#10-integration-with-other-modules)
11. [Test Accounts](#11-test-accounts)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview

The Payroll Module handles monthly payroll report generation and cross-departmental data transfer between HR and Finance. It does **not** perform actual salary calculations or bank transfers — instead, it generates structured reports (Excel XLSX) that Finance uses for downstream processing, and penalty/deduction reports (Word DOCX) for HR recordkeeping.

### Key Design Principles

- **HR-Generated, Finance-Consumed**: HR Officers generate and send payroll reports; Finance Officers download and process them.
- **Campus-Scoped**: Both HR Officers and Finance Officers are campus-scoped — they only see data and reports for their assigned campus.
- **Report Persistence**: When HR "sends to Finance", the XLSX is saved to disk and a database record is created for Finance to retrieve later.
- **Clearance Integration**: Employees who exit mid-month (via completed clearance) are automatically included with prorated payable days.
- **Standard 30-Day Month**: Full months are normalized to 30 payable days regardless of actual calendar days (28–31).

---

## 2. Workflow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PAYROLL WORKFLOW                                │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ HR Officer   │───>│ Generate     │───>│ Preview & Download   │  │
│  │ Selects      │    │ Payroll Data │    │ Excel (.xlsx)        │  │
│  │ Month/Year   │    │              │    └──────────────────────┘  │
│  └──────────────┘    │              │                               │
│                      │              │───>┌──────────────────────┐  │
│                      └──────────────┘    │ Send to Finance      │  │
│                                          │ (Save to disk + DB)  │  │
│                                          └──────────┬───────────┘  │
│                                                     │              │
│                                                     ▼              │
│                                          ┌──────────────────────┐  │
│                                          │ Finance Officer      │  │
│                                          │ Downloads Report     │  │
│                                          │ from Finance Page    │  │
│                                          └──────────────────────┘  │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ HR Officer   │───>│ Generate     │───>│ Download Penalty     │  │
│  │ Selects      │    │ Penalty Data │    │ Report (.docx)       │  │
│  │ Month/Year   │    │              │    └──────────────────────┘  │
│  └──────────────┘    └──────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Report Types

| Report | Format | Generator | Consumer | Content |
|--------|--------|-----------|----------|---------|
| **Payroll Report** | Excel (.xlsx) | HR_OFFICER | FINANCE_OFFICER | All employees with gross salary and payable days |
| **Penalty Report** | Word (.docx) | HR_OFFICER | HR internal | Employees with partial-month deductions only |

---

## 3. Roles & Responsibilities

| Role | Capability | Module Access |
|------|-----------|---------------|
| **HR_OFFICER** | Generate payroll Excel, send to Finance, generate penalty DOCX | `/hr/payroll` |
| **FINANCE_OFFICER** | View and download all sent payroll reports (all campuses) | `/hr/finance` |
| **ADMIN** | View payroll data (read-only via data-transfer endpoint) | Data access only |
| **EMPLOYEE** | No access to payroll module | N/A |

---

## 4. Detailed Workflow Stages

### Stage 1: Period Selection (HR Officer)

1. HR Officer navigates to **Payroll & Penalty Reports** page (`/hr/payroll`).
2. Selects **Month** and **Year** from dropdown selectors.
3. Current month/year are pre-selected by default.

### Stage 2A: Generate & Download Payroll Excel

1. Clicks **"Preview & Download"** button.
2. Backend fetches all employees (active + exited-this-month) for the HR Officer's campus.
3. Calculates payable days for each employee (see Business Rules).
4. Builds an XLSX workbook with columns: Employee ID, Full Name, Position, Gross Salary, Payable Days, Status.
5. Returns the binary buffer as a file download.
6. Frontend uses `file-saver` (`saveAs`) to trigger browser download.
7. Success toast: "Download started — check your Downloads folder."

**API**: `POST /api/v1/payroll/generate`
```json
{ "month": 5, "year": 2026 }
```

### Stage 2B: Send Payroll to Finance

1. Clicks **"Send to Finance"** button.
2. Backend generates the same XLSX as Stage 2A.
3. Saves the file to `uploads/payroll/` on disk.
4. Creates a `PayrollReport` database record with month, year, filename, filePath, sentById, campusId.
5. Returns success with report ID and employee count.
6. Frontend shows success message and refreshes the "Reports Sent to Finance" list.

**API**: `POST /api/v1/payroll/send-to-finance`
```json
{ "month": 5, "year": 2026 }
```
**Response**:
```json
{
  "message": "Payroll report sent to Finance successfully (42 employees)",
  "reportId": 7,
  "filename": "Payroll_2026_05_1715270000000.xlsx",
  "count": 42
}
```

### Stage 3: Finance Downloads Report

1. Finance Officer navigates to **Finance Dashboard** (`/hr/finance`).
2. Sees a list of all payroll reports sent by HR Officers (all campuses, ordered by newest first).
3. Each card shows: period (month/year), sent date, filename.
4. Clicks **"Download XLSX"** to download the saved file.

**API**: `GET /api/v1/payroll/reports` (list) and `GET /api/v1/payroll/reports/:id/download` (file stream)

### Stage 4: Generate Penalty Report (HR Only)

1. HR Officer clicks **"Download Penalty DOCX"** on the payroll page.
2. Backend fetches the same payroll data but filters to employees with `payableDays < 30`.
3. Builds a DOCX document with a table: No., Employee ID, Full Name, Position, Reason, Deduction Days.
4. Reason is auto-determined: "Clearance / Exit" for exited employees, "New Hire (Partial)" for mid-month hires.
5. Returns the DOCX buffer for download.

**API**: `POST /api/v1/payroll/penalty`
```json
{ "month": 5, "year": 2026 }
```

---

## 5. Business Rules & Calculations

### Payable Days Calculation

| Scenario | Payable Days | Logic |
|----------|-------------|-------|
| **Full month active employee** | 30 | Standard month = 30 days, regardless of calendar (28/29/30/31) |
| **New hire (joined mid-month)** | `endOfMonth - hireDate + 1` | Calendar days from hire date to end of month |
| **Exited employee (cleared mid-month)** | `exitDate - startOfMonth + 1` | Calendar days from 1st to PayrollTransfer.effectiveDate |
| **Full month but calendar < 30** | 30 | If payableDays >= 28 AND equals actual days in month → normalize to 30 |

### Constants (from `config/constants.ts`)

```typescript
PAYROLL_CONSTANTS = {
  STANDARD_MONTH_DAYS: 30,      // Full month = 30
  MINIMUM_FULL_MONTH_DAYS: 28,  // Threshold for "full month" normalization
}
```

### Edge Cases

| Case | Handling |
|------|---------|
| Negative payable days | Capped to 0 |
| Payable days > calendar days | Capped to actual days in month |
| Employee hired AND exited same month | Exit logic takes precedence (user.isActive = false) |
| No campus context for HR user | Returns HTTP 403 |

### Penalty Report Filtering

Only employees where `payableDays < STANDARD_MONTH_DAYS (30)` are included in the penalty report. Deduction days = `30 - payableDays`.

---

## 6. Database Schema

### Employee (Payroll-Relevant Fields)

| Column | Type | Description |
|--------|------|-------------|
| `employeeId` | String (unique) | Human-readable ID (e.g., `BDU-00001`) |
| `name` | String | Full name |
| `position` | String | Job title |
| `grossSalary` | Float | Monthly gross salary (default 0) |
| `salaryType` | SalaryType enum | `MONTHLY` or `DAILY` |
| `hireDate` | DateTime | Date of joining — used for new-hire proration |
| `campusId` | Int? (FK) | Campus assignment — used for scoping |
| `deptLegacy` | String | Department name (legacy field mapped to `department` column) |

### PayrollTransfer

Links clearance completion to payroll exit processing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Int (PK) | Auto-increment |
| `employeeId` | Int (FK) | Employee who exited |
| `clearanceId` | Int (FK, unique) | One-to-one with ClearanceRequest |
| `reason` | String | e.g., "Clearance Completed" |
| `effectiveDate` | DateTime | Last payable date — used for proration |
| `status` | String | "PENDING", "COMPLETED", "CANCELLED" |
| `createdBy` | Int | User who triggered the transfer |
| `createdAt` | DateTime | Timestamp |

### PayrollReport

Records each report sent to Finance.

| Column | Type | Description |
|--------|------|-------------|
| `id` | Int (PK) | Auto-increment |
| `month` | Int | Report month (1–12) |
| `year` | Int | Report year |
| `filename` | String | Saved filename (e.g., `Payroll_2026_05_sent_1715...xlsx`) |
| `filePath` | String | Absolute path on disk |
| `sentById` | Int | HR Officer user ID who sent it |
| `campusId` | Int? | Campus scope (null = university-wide) |
| `createdAt` | DateTime | When the report was sent |

### SalaryType Enum

```prisma
enum SalaryType {
  MONTHLY
  DAILY
}
```

### Audit Action (Payroll-Related)

```
PAYROLL_TRANSFER_CREATE  — logged when clearance triggers a payroll transfer
```

---

## 7. API Reference

All endpoints require `Authorization: Bearer <token>` header.  
Base URL: `/api/v1/payroll`

### Endpoints

| Method | Endpoint | Role Required | Description |
|--------|----------|--------------|-------------|
| `GET` | `/data-transfer` | `ADMIN`, `FINANCE_OFFICER` | Raw payroll data (JSON) for a given month/year |
| `POST` | `/generate` | `HR_OFFICER` | Generate and download payroll Excel directly |
| `POST` | `/send-to-finance` | `HR_OFFICER` | Generate Excel, save to disk, create DB record |
| `GET` | `/reports` | `FINANCE_OFFICER`, `HR_OFFICER`, `ADMIN` | List all sent payroll reports |
| `GET` | `/reports/:id/download` | `FINANCE_OFFICER`, `HR_OFFICER`, `ADMIN` | Download a specific saved report file |
| `POST` | `/penalty` | `HR_OFFICER` | Generate and download penalty DOCX |

### Request/Response Examples

**GET /data-transfer?month=5&year=2026**
```json
{
  "period": { "month": 5, "year": 2026 },
  "count": 3,
  "data": [
    {
      "employeeId": "BDU-00001",
      "fullName": "Abebe Kebede",
      "department": "IT",
      "grossSalary": 15000,
      "salaryType": "MONTHLY",
      "payableDays": 30,
      "status": "ACTIVE",
      "notes": ""
    },
    {
      "employeeId": "BDU-00042",
      "fullName": "Sara Hailu",
      "grossSalary": 12000,
      "payableDays": 17,
      "status": "ACTIVE",
      "notes": "Partial Payment - New Hire"
    },
    {
      "employeeId": "BDU-00010",
      "fullName": "Dawit Mengistu",
      "grossSalary": 18000,
      "payableDays": 10,
      "status": "EXITED",
      "notes": "Partial Payment - Exited this month"
    }
  ]
}
```

**POST /generate** — Returns binary XLSX (Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

**POST /penalty** — Returns binary DOCX (Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`)

### Validation Schema

```typescript
// Query params for data-transfer
{ month: /^(0?[1-9]|1[0-2])$/, year: /^\d{4}$/ }

// Body params for generate/send-to-finance/penalty
{ month?: number (1-12), year?: number (2000-2100) }
// Both optional — defaults to current month/year
```

---

## 8. Frontend Pages & Components

### Pages

| Page | Route | Role | Description |
|------|-------|------|-------------|
| **PayrollPage** | `/hr/payroll` | `HR_OFFICER` | Period selector + generate Excel + send to Finance + generate penalty DOCX + report history |
| **FinancePage** | `/hr/finance` | `FINANCE_OFFICER` | Read-only list of sent reports with download buttons |

### PayrollPage Layout

```
┌─────────────────────────────────────────┐
│  Payroll & Penalty Reports              │
│  "Generate payroll for Finance..."      │
├─────────────────────────────────────────┤
│  Select Period                          │
│  [Month ▼]  [Year ▼]                   │
├─────────────┬───────────────────────────┤
│ Payroll     │ Penalty Report            │
│ Report      │ Word Document (.docx)     │
│ Excel       │                           │
│ (.xlsx)     │ [Download Penalty DOCX]   │
│             │                           │
│ [Preview &  │                           │
│  Download]  │                           │
│ [Send to    │                           │
│  Finance]   │                           │
├─────────────┴───────────────────────────┤
│  Reports Sent to Finance    [Refresh]   │
│  ┌─────────────────────────────────┐    │
│  │ May 2026 — Sent 09 May, 14:30  │    │
│  │ [Download]                      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### FinancePage Layout

```
┌─────────────────────────────────────────┐
│  Finance Dashboard          [Refresh]   │
│  "Download payroll reports sent by HR"  │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │ 📄 Payroll — May 2026          │    │
│  │    Sent on 09 May 2026, 14:30  │    │
│  │    Payroll_2026_05_sent_...xlsx │    │
│  │                [Download XLSX]  │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Key Frontend Dependencies

| Package | Purpose |
|---------|---------|
| `file-saver` | `saveAs()` for browser file downloads (bypasses popup blockers) |
| `@tanstack/react-query` | Data fetching with `useQuery` for report list |
| `date-fns` | Date formatting in report cards |
| `axios` | API client with `responseType: 'blob'` for binary downloads |

### Sidebar Navigation

- HR Officers see "Payroll" link under HR section → `/hr/payroll`
- Finance Officers see "Finance" link → `/hr/finance`

---

## 9. Security & Access Control

### Authorization Enforcement

| Control | Implementation |
|---------|---------------|
| **Generate Excel** | Controller checks `req.user.role === HR_OFFICER` |
| **Generate Penalty** | Controller checks `req.user.role === HR_OFFICER` |
| **Send to Finance** | Controller checks `req.user.role === HR_OFFICER` |
| **View data-transfer** | Route guard: `authorize([ADMIN, FINANCE_OFFICER])` |
| **List reports** | Route guard: `authorize([FINANCE_OFFICER, HR_OFFICER, ADMIN])` |
| **Download report** | Route guard: `authorize([FINANCE_OFFICER, HR_OFFICER, ADMIN])` |

### Campus Scoping

| Role | Scope |
|------|-------|
| `HR_OFFICER` | Sees only employees from their assigned campus |
| `ADMIN` | Sees only employees from their assigned campus |
| `FINANCE_OFFICER` | Sees reports from **all** campuses (no campus filter) |

Campus scoping is enforced via `getCampusScope(req)` and `getCampusIdFilter()` utilities which extract `campusId` from the JWT token.

### File Storage Security

- Reports are stored at `<backend>/uploads/payroll/`
- Files are **not** publicly accessible — served only through authenticated API endpoints
- File streaming uses `fs.createReadStream()` to avoid loading entire files into memory

---

## 10. Integration with Other Modules

### Clearance → Payroll (Automatic)

When a clearance is finally approved (Head HR signs off), the system automatically calls:

```typescript
triggerClearancePayrollTransfer(clearanceId, employeeId, approverId)
```

This creates a `PayrollTransfer` record with:
- `effectiveDate` = current date (the exit date)
- `status` = "PENDING"
- `reason` = "Clearance Completed"

The payroll service then picks up exited employees by querying `PayrollTransfer` records within the report month.

### Employee Module → Payroll

Payroll reads from the Employee model:
- `grossSalary` — the monthly salary amount
- `hireDate` — for new-hire proration
- `campusId` — for campus scoping
- `user.isActive` — to distinguish active vs exited employees

---

## 11. Test Accounts

| Role | Employee ID | Password | Purpose |
|------|-------------|----------|---------|
| **HR Officer** | `EMP_HR_TEST` | `HrOfficer123!` | Generate payroll, send to Finance |
| **Finance Officer** | `EMP_FINANCE` | `FinanceOfficer123!` | Download sent reports |
| **Admin** | `EMP_ADMIN` | `Admin123!` | View payroll data |

### Seed Scripts

```bash
# Create Finance Officer test account
cd packages/backend
npx ts-node scripts/seed-finance-user.ts

# Verify payroll data calculations
npx ts-node scripts/verify-payroll-data.ts
```

### Full Test Scenario

1. **Login** as `EMP_HR_TEST` → Navigate to `/hr/payroll`
2. Select **Month** = current month, **Year** = current year
3. Click **"Preview & Download"** → Verify XLSX downloads with correct data
4. Click **"Send to Finance"** → Verify success message with employee count
5. Verify the report appears in the **"Reports Sent to Finance"** section
6. **Login** as `EMP_FINANCE` → Navigate to `/hr/finance`
7. Verify the report appears in the Finance Dashboard
8. Click **"Download XLSX"** → Verify file downloads correctly
9. **Login** as `EMP_HR_TEST` → Click **"Download Penalty DOCX"**
10. Verify DOCX contains only employees with partial months

---

## 12. Troubleshooting

### "Failed to generate payroll report"

**Cause**: Missing campus context — the HR user may not have a `campusId` assigned.  
**Fix**: Verify the user record has a valid `campusId` in the database. Users with `scope: UNIVERSITY` but role `HR_OFFICER` need campus assignment.

### Excel file downloads as empty or corrupted

**Cause**: Browser may intercept the blob response.  
**Fix**: The frontend uses `file-saver` (`saveAs`) which bypasses popup blockers. Ensure the API call uses `responseType: 'blob'`.

### "No reports sent yet" on Finance page

**Cause**: HR Officer hasn't used "Send to Finance" yet — the "Preview & Download" button only downloads locally without saving to the server.  
**Fix**: HR Officer must click **"Send to Finance"** to persist the report for Finance access.

### Payable days showing 0 for an employee

**Cause**: Employee's `hireDate` may be after the end of the report month, or the `PayrollTransfer.effectiveDate` is before the start of the month.  
**Fix**: Check the employee's `hireDate` and any `PayrollTransfer` records for date accuracy.

### Report file not found on download

**Cause**: The file was deleted from disk but the DB record still exists.  
**Fix**: Re-generate and re-send the report for that period. Files are stored at `uploads/payroll/` relative to the backend working directory.

### Finance Officer sees 403 Forbidden

**Cause**: User role is not `FINANCE_OFFICER`.  
**Fix**: Verify the user has `role: FINANCE_OFFICER` in the database. Run the seed script if needed:
```bash
npx ts-node scripts/seed-finance-user.ts
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                       │
│                                                                         │
│  ┌────────────────┐              ┌─────────────────────────────────┐   │
│  │ PayrollPage    │              │ FinancePage                     │   │
│  │ (HR Officer)   │              │ (Finance Officer)               │   │
│  │ • Generate XLSX│              │ • List sent reports             │   │
│  │ • Send to Fin. │              │ • Download XLSX                 │   │
│  │ • Penalty DOCX │              │                                 │   │
│  └───────┬────────┘              └──────────┬──────────────────────┘   │
│          │                                   │                         │
│          ▼                                   ▼                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    payrollApi (API Client)                       │  │
│  │  • generateExcel()  • sendToFinance()  • listReports()          │  │
│  │  • downloadReport() • generatePenaltyDocx()                     │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────────┼─────────────────────────────────────┘
                                  │ HTTP (Axios, responseType: 'blob')
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express + Prisma)                       │
│                                                                         │
│  ┌────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │ auth.middleware │  │ payroll.routes    │  │ payroll.controller    │  │
│  │ (JWT + RBAC)   │  │ (Route Guards)    │  │ (Request Handling)    │  │
│  └────────────────┘  └──────────────────┘  └───────────┬───────────┘  │
│                                                         │              │
│                                             ┌───────────▼───────────┐  │
│                                             │ payroll.service       │  │
│                                             │ • getPayrollData()    │  │
│                                             │ • triggerClearance-   │  │
│                                             │   PayrollTransfer()   │  │
│                                             └───────────┬───────────┘  │
│                                                         │              │
│                                             ┌───────────▼───────────┐  │
│                                             │ payrollReport.service │  │
│                                             │ • generatePayroll-   │  │
│                                             │   Excel()             │  │
│                                             │ • sendPayrollTo-     │  │
│                                             │   Finance()           │  │
│                                             │ • generatePenalty-   │  │
│                                             │   Docx()              │  │
│                                             │ • listPayrollReports │  │
│                                             └───────────┬───────────┘  │
│                                                         │              │
│                                             ┌───────────▼───────────┐  │
│                                             │  Prisma ORM           │  │
│                                             │  (PostgreSQL / Neon)   │  │
│                                             └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Reference

### Backend

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database models: Employee, PayrollTransfer, PayrollReport |
| `src/routes/payroll.routes.ts` | API route definitions with role-based guards |
| `src/controllers/payroll.controller.ts` | Request/response handling, input validation, campus scoping |
| `src/services/payroll.service.ts` | Core business logic: employee fetching, payable days calculation |
| `src/services/payrollReport.service.ts` | Report generation: XLSX building (SheetJS), DOCX building (docx), file persistence |
| `src/schemas/payroll.schema.ts` | Zod validation schemas for query params |
| `src/config/constants.ts` | `PAYROLL_CONSTANTS` (STANDARD_MONTH_DAYS, MINIMUM_FULL_MONTH_DAYS) |
| `src/lib/campusScope.ts` | Campus scoping utilities (getCampusScope, getCampusIdFilter) |
| `scripts/verify-payroll-data.ts` | E2E verification script for payroll calculations |
| `scripts/seed-finance-user.ts` | Creates FINANCE_OFFICER test account |

### Frontend

| File | Purpose |
|------|---------|
| `src/api/payroll.ts` | API client functions + `PayrollReportRecord` TypeScript interface |
| `src/pages/PayrollPage.tsx` | HR Officer payroll management page (generate, send, penalty) |
| `src/pages/FinancePage.tsx` | Finance Officer report download dashboard |
| `src/routes/index.tsx` | Route registration: `/hr/payroll` and `/hr/finance` |
| `src/components/layout/Sidebar.tsx` | Navigation link: "Payroll" under HR section |

### Key Dependencies

| Package | Location | Purpose |
|---------|----------|---------|
| `xlsx` (SheetJS) | Backend | Excel workbook generation |
| `docx` | Backend | Word document generation |
| `date-fns` | Both | Date calculations and formatting |
| `file-saver` | Frontend | Browser file download trigger |

---

## Resolved Design Decisions

> [!NOTE]
> The following decisions were confirmed by the project owner on May 9, 2026.

| # | Question | Decision | Action Required |
|---|----------|----------|-----------------|
| 1 | Net Salary Calculation | **Gross salary + payable days only** — no net salary, no tax/pension deductions | None (current behavior is correct) |
| 2 | Salary Type "DAILY" | **Not needed** — remove `DAILY` from `SalaryType` enum | Schema migration: drop `DAILY` from enum |
| 3 | Report Versioning | **Yes** — new report for same month should supersede the old one | Implementation needed (see below) |
| 6 | Multi-Period Limit | **Yes** — limit how far back HR can generate reports (current month + last 3 months) | Backend validation needed |
| 7 | Pay Grade in Reports | **Yes** — include `payGrade` as a column in the payroll Excel output | Add column to XLSX builder |
| 8 | Finance Officer Scope | **Campus-scoped** — Finance Officers should only see reports for their assigned campus | Update `listPayrollReports` query |
| 4 | Tax Information field | **Remove it** — `taxInformation` JSON field on Employee is not needed | Schema migration: drop `taxInformation` column |
| 5 | Penalty Report Sharing | **Yes** — penalty DOCX should be persisted and shared like the payroll Excel | Implementation needed (see below) |

### Implementation Tasks from Decisions

> [!WARNING]
> The following changes are required based on the resolved decisions above:

**1. Remove `DAILY` from `SalaryType` enum**
- Create a Prisma migration to remove the `DAILY` value
- Verify no employees currently have `salaryType: DAILY` before migrating
- Update any frontend dropdowns that reference salary type

**2. Remove `taxInformation` field from Employee model**
- Create a Prisma migration to drop the `taxInformation` column
- Remove any references in controllers/services
- Verify no seed scripts populate this field

**3. Implement Report Versioning (Supersede)**
- When HR sends a report for a month/year/campus combination that already exists:
  - Mark the old `PayrollReport` record as superseded (add `isLatest: Boolean` field or `supersededAt: DateTime?`)
  - Delete or archive the old file from disk
  - Finance should only see the latest version by default
- Add a `@@unique([month, year, campusId])` constraint or handle via application logic

**4. Implement Penalty Report Sharing**
- Create a `PenaltyReport` model (similar to `PayrollReport`) with: month, year, filename, filePath, sentById, campusId
- Add a "Send Penalty to Finance" button on PayrollPage
- Add penalty reports to the Finance Dashboard alongside payroll reports
- Add API endpoints: `POST /payroll/send-penalty-to-finance`, `GET /payroll/penalty-reports`, `GET /payroll/penalty-reports/:id/download`

**5. Enforce Multi-Period Limit**
- Add validation in `generatePayroll`, `sendPayrollToFinance`, and `generatePenaltyDocx` endpoints
- Allowed range: current month and the **previous 3 months** only
- Reject requests outside this range with HTTP 400 and message: "Reports can only be generated for the current month and the previous 3 months"
- Example: In May 2026, valid months are Feb 2026 – May 2026

**6. Add Pay Grade to Payroll Excel**
- Add `payGrade` as a new column in the XLSX output (after Position, before Gross Salary)
- Update `PayrollRow` interface to include `'Pay Grade': string`
- Update the `fetchPayrollRows` function to read `emp.payGrade`
- Update column widths in `buildXlsxBuffer`

**7. Campus-Scope Finance Officers**
- Update `listPayrollReports` controller: apply `getCampusIdFilter()` for `FINANCE_OFFICER` role (currently skipped)
- Update `downloadPayrollReport`: verify the report's `campusId` matches the Finance Officer's campus
- Update `FinancePage` subtitle to indicate campus-scoped view

---

> [!NOTE]
> **All design questions have been resolved.** This document is ready for the implementation team. No further clarifications needed.

---

*End of Document*

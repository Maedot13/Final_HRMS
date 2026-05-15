# HRMS Payroll Module — Implementation Plan

This plan outlines the steps to implement the Payroll Module as described in the `PAYROLL_MODULE.md` documentation.

## Phase 1: Database & Backend Foundation

### 1.1 Update Prisma Schema
* Add `PayrollReport` model to `packages/backend/prisma/schema.prisma`.
* Add relations to `Campus` and `User`.
* Update `PayrollTransfer` if any fields are missing (e.g., `amount` or `salarySnapshot`).
* Run `npx prisma generate` and `npx prisma migrate dev`.

### 1.2 Implement Payroll Report Service
* Create `packages/backend/src/services/payrollReport.service.ts`.
* Implement logic to:
    * Fetch payroll data (reuse `payroll.service.ts`).
    * Generate XLSX buffer using `xlsx` or `exceljs`.
    * Save file to `uploads/payroll/`.
    * Create `PayrollReport` database records.

### 1.3 Update Controllers & Routes
* Add new methods to `packages/backend/src/controllers/payroll.controller.ts`:
    * `generatePayrollExcel`: Handle on-the-fly generation and download.
    * `sendToFinance`: Generate, save to disk, and notify Finance.
    * `listReports`: List all sent reports for a campus.
    * `downloadReport`: Stream the XLSX file from disk.
* Update `packages/backend/src/routes/payroll.routes.ts` with the new endpoints.

---

## Phase 2: Frontend Infrastructure

### 2.1 API Integration
* Update `packages/frontend/src/api/payroll.ts` to include:
    * `getPayrollData(month, year)`
    * `generatePayrollExcel(month, year)`
    * `sendToFinance(month, year)`
    * `getPayrollReports()`
    * `downloadReport(reportId)`

### 2.2 Route Configuration
* Add routes to `packages/frontend/src/routes/index.tsx`:
    * `/hr/payroll` (HR_OFFICER access)
    * `/hr/finance` (FINANCE_OFFICER access)

---

## Phase 3: UI Development

### 3.1 Payroll Page (`/hr/payroll`)
* **Components:**
    * `PeriodSelector`: Month/Year dropdowns.
    * `PayrollSummary`: Total employees, total gross salary.
    * `ActionButtons`: "Preview & Download", "Send to Finance".
    * `ReportHistory`: Table showing previously sent reports.

### 3.2 Finance Page (`/hr/finance`)
* **Components:**
    * `ReportList`: List of available reports for the finance officer's campus.
    * `DownloadLink`: Triggers the backend file stream.

---

## Phase 4: Integration & Testing

### 4.1 Clearance Integration
* Verify that when a Clearance Request is finalized, a `PayrollTransfer` is created (already partially in `payroll.service.ts`).
* Ensure `getPayrollData` correctly picks up these transfers.

### 4.2 End-to-End Testing
* Login as HR Officer → Generate Report → Verify XLSX content.
* Click "Send to Finance" → Verify DB record and file storage.
* Login as Finance Officer → Verify report appears in list → Download report.

---

## Key Dependencies to Install
* **Backend:** `xlsx` or `exceljs`, `date-fns` (already present).
* **Frontend:** `file-saver`, `xlsx`.

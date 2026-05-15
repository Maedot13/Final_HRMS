# HRMS Payroll Module — Technical & Operational Documentation

> **Version:** 1.0
> **Last Updated:** May 9, 2026
> **Module Owner:** HR Department / Finance Department
> **Status:** Production-Ready

---

## 1. Overview

The Payroll Module handles monthly payroll report generation and cross-departmental data transfer between HR and Finance. It does **not** perform actual salary calculations or bank transfers — instead, it generates structured payroll reports (Excel XLSX) that Finance uses for downstream processing.

### Key Design Principles

* **HR-Generated, Finance-Consumed**
* **Campus-Scoped Access**
* **Report Persistence**
* **Clearance Integration**
* **Standard 30-Day Month**

---

## 2. Workflow Summary

HR Officer selects month/year → Generates Payroll Excel → Downloads or Sends to Finance → Finance downloads report from dashboard.

### Report Types

| Report         | Format        | Generator  | Consumer        |
| -------------- | ------------- | ---------- | --------------- |
| Payroll Report | Excel (.xlsx) | HR_OFFICER | FINANCE_OFFICER |

---

## 3. Roles & Responsibilities

| Role            | Capability                              | Module Access    |
| --------------- | --------------------------------------- | ---------------- |
| HR_OFFICER      | Generate payroll Excel, send to Finance | `/hr/payroll`    |
| FINANCE_OFFICER | View and download payroll reports       | `/hr/finance`    |
| ADMIN           | View payroll data                       | Data access only |
| EMPLOYEE        | No access                               | N/A              |

---

## 4. Detailed Workflow Stages

### Stage 1: Period Selection

* HR Officer opens `/hr/payroll`
* Selects month and year
* Current period is selected by default

### Stage 2: Generate & Download Payroll Excel

* Click “Preview & Download”
* Backend fetches employees
* Calculates payable days
* Generates XLSX workbook
* Downloads file using `file-saver`

API:

```http
POST /api/v1/payroll/generate
```

### Stage 3: Send Payroll to Finance

* Click “Send to Finance”
* XLSX stored in `uploads/payroll/`
* `PayrollReport` record created
* Finance dashboard updated

API:

```http
POST /api/v1/payroll/send-to-finance
```

### Stage 4: Finance Downloads Report

API:

```http
GET /api/v1/payroll/reports
GET /api/v1/payroll/reports/:id/download
```

---

## 5. Business Rules & Calculations

### Payable Days

| Scenario             | Payable Days     |
| -------------------- | ---------------- |
| Full month employee  | 30               |
| New hire             | Prorated         |
| Exited employee      | Prorated         |
| Short calendar month | Normalized to 30 |

### Constants

```ts
PAYROLL_CONSTANTS = {
  STANDARD_MONTH_DAYS: 30,
  MINIMUM_FULL_MONTH_DAYS: 28,
}
```

---

## 6. Database Schema

### Main Models

* Employee
* PayrollTransfer
* PayrollReport

### SalaryType

```prisma
enum SalaryType {
  MONTHLY
  DAILY
}
```

---

## 7. API Reference

Base URL:

```http
/api/v1/payroll
```

| Method | Endpoint                | Description             |
| ------ | ----------------------- | ----------------------- |
| GET    | `/data-transfer`        | Payroll JSON data       |
| POST   | `/generate`             | Generate payroll Excel  |
| POST   | `/send-to-finance`      | Save payroll report     |
| GET    | `/reports`              | List payroll reports    |
| GET    | `/reports/:id/download` | Download payroll report |

---

## 8. Frontend Pages & Components

### Pages

| Page        | Route         |
| ----------- | ------------- |
| PayrollPage | `/hr/payroll` |
| FinancePage | `/hr/finance` |

### PayrollPage Features

* Period selector
* Preview & Download
* Send to Finance
* Report history

### Key Dependencies

| Package     | Purpose           |
| ----------- | ----------------- |
| file-saver  | Browser downloads |
| react-query | Data fetching     |
| axios       | API client        |
| xlsx        | Excel generation  |

---

## 9. Security & Access Control

### Authorization

| Action           | Role                    |
| ---------------- | ----------------------- |
| Generate payroll | HR_OFFICER              |
| Send payroll     | HR_OFFICER              |
| View reports     | FINANCE_OFFICER / ADMIN |
| Download reports | FINANCE_OFFICER / ADMIN |

### File Storage

* Stored in `uploads/payroll/`
* Protected through authenticated APIs

---

## 10. Integration with Other Modules

### Clearance → Payroll

Completed clearance automatically creates a `PayrollTransfer`.

### Employee → Payroll

Payroll uses:

* grossSalary
* hireDate
* campusId
* user.isActive

---

## 11. Test Accounts

| Role            | Purpose           |
| --------------- | ----------------- |
| HR Officer      | Generate payroll  |
| Finance Officer | Download reports  |
| Admin           | View payroll data |

### Test Flow

1. Login as HR Officer
2. Generate payroll
3. Send to Finance
4. Login as Finance Officer
5. Download payroll report

---

## 12. Troubleshooting

### Empty Excel File

Ensure:

```ts
responseType: 'blob'
```

### No Reports Found

HR must click:

```text
Send to Finance
```

### 403 Forbidden

Verify user role:

```text
FINANCE_OFFICER
```

---

## Architecture Summary

Frontend:

* PayrollPage
* FinancePage
* payrollApi

Backend:

* payroll.routes.ts
* payroll.controller.ts
* payroll.service.ts
* payrollReport.service.ts
* Prisma ORM

---

## File Reference

### Backend

* `payroll.routes.ts`
* `payroll.controller.ts`
* `payroll.service.ts`
* `payrollReport.service.ts`
* `schema.prisma`

### Frontend

* `PayrollPage.tsx`
* `FinancePage.tsx`
* `payroll.ts`

---

## Resolved Design Decisions

| Decision                     | Status    |
| ---------------------------- | --------- |
| Gross salary only            | Confirmed |
| Remove DAILY salary type     | Planned   |
| Report versioning            | Planned   |
| Multi-period limit           | Planned   |
| Add pay grade                | Planned   |
| Campus-scoped finance access | Planned   |

---

*End of Document*

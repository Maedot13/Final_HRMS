# HRMS Seeding Guide

## Seed Scripts Overview

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `npx prisma db seed` | Multi-campus backfill + clearance units | After migrations, or fresh DB setup |
| `npm run seed:dev` | Development test data | After main seed, for local testing |

## Full Setup (Development)

```bash
cd packages/backend

# 1. Run migrations (if not done)
npx prisma migrate deploy

# 2. Seed campus, backfill, clearance units
npx prisma db seed

# 3. Seed development test data
npm run seed:dev
```

## Test Accounts (from seed:dev)

All use password: **password123**

| Employee ID   | Role              | Use Case                           |
|---------------|-------------------|------------------------------------|
| EMP_SABBATICAL| EMPLOYEE          | Sabbatical-eligible (10 yrs)       |
| EMP_DEPT_HEAD | DEPARTMENT_HEAD   | Approve leave/sabbatical           |
| EMP_HR_TEST   | HR_OFFICER        | HR operations, job postings        |
| EMP_REGULAR   | EMPLOYEE          | Regular employee (5 yrs)           |
| EMP_ADMIN     | ADMIN             | Campus admin                       |

## Sabbatical Testing

- **EMP_SABBATICAL** has 10 years of service (≥ 7 required).
- **EMP_REGULAR** has 5 years and will receive an error if attempting sabbatical.
- Sabbatical requests require: `purpose`, `startDate`, `endDate`, `plan` (min 20 chars).

## Leave Testing

- Leave balances are seeded for EMP_SABBATICAL and EMP_DEPT_HEAD.
- EMP_DEPT_HEAD can approve leave for Engineering department employees.

## Clearance Testing

- Clearance units (HR, Finance, Department Head, etc.) are created by the main seed.
- Initiate clearance with `reason` and `lastWorkingDay`.

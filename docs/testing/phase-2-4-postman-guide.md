# Phase 2.4 Postman Guide (Core API)

This guide provides a comprehensive list of all endpoints implemented in Phase 2.4. You can use this to create a Postman Collection.

**Base URL**: `http://localhost:5000/api/v1`

## 1. Authentication (Prerequisite)
*You must login to get a JWT token for all other endpoints.*

### Login
- **Method**: `POST`
- **URL**: `/auth/login`
- **Body** (JSON):
  ```json
  {
    "employeeId": "EMP001",
    "password": "password123"
  }
  ```
- **Response**: Returns `{ token, user }`. **Copy the `token`**.
- **Auth Header**: For all subsequent requests, use `Bearer <token>` in the Authorization header.

---

## 2. Employee Profile

### Get Employee Details
- **Method**: `GET`
- **URL**: `/employees/:id` (e.g., `/employees/1`)
- **Permission**: Employee (own), Admin, HR

### Update Employee
- **Method**: `PATCH`
- **URL**: `/employees/:id`
- **Body** (JSON):
  ```json
  {
    "contactInfo": { "phone": "0911000000", "address": "Bahir Dar" }
  }
  ```

---

## 3. Leave Management

### Create Leave Request
- **Method**: `POST`
- **URL**: `/leave-requests`
- **Body** (JSON):
  ```json
  {
    "leaveType": "ANNUAL",
    "startDate": "2026-06-01T00:00:00Z",
    "endDate": "2026-06-05T00:00:00Z",
    "reason": "Family vacation"
  }
  ```

### Get My Requests
- **Method**: `GET`
- **URL**: `/leave-requests`

### Get Pending Requests (Approver)
- **Method**: `GET`
- **URL**: `/leave-requests/pending`
- **Permission**: Department Head, HR

### Approve Request
- **Method**: `PATCH`
- **URL**: `/leave-requests/:id/approve`
- **Body** (JSON): `{ "comment": "Approved enjoy" }`
- **Permission**: Department Head

### Reject Request
- **Method**: `PATCH`
- **URL**: `/leave-requests/:id/reject`
- **Body** (JSON): `{ "comment": "Too busy right now" }`

---

## 4. Sabbatical Management

### Request Sabbatical
- **Method**: `POST`
- **URL**: `/sabbatical-requests`
- **Body** (JSON):
  ```json
  {
    "purpose": "PhD Research",
    "startDate": "2026-09-01T00:00:00Z",
    "endDate": "2027-09-01T00:00:00Z",
    "plan": "Researching AI at Addis Ababa University...",
    "planDocumentUrl": "http://example.com/plan.pdf"
  }
  ```

### Approve Sabbatical
- **Method**: `PATCH`
- **URL**: `/sabbatical-requests/:id/approve`
- **Permission**: Department Head/HR

---

## 5. Clearance System

### Initiate Clearance
- **Method**: `POST`
- **URL**: `/clearance-requests`
- **Body** (JSON):
  ```json
  {
    "reason": "Resignation",
    "lastWorkingDay": "2026-03-01T00:00:00Z"
  }
  ```
- **Note**: This automatically creates `ClearanceCheck` items for all active units.

### Approve Specific Unit Check
- **Method**: `PATCH`
- **URL**: `/clearance-requests/:id/approve-check`
- **Body** (JSON): `{ "unitId": 1, "comment": "Books returned" }`
- **Permission**: Admin/HR/Dept Head (representing the unit)

### Reject Specific Unit Check
- **Method**: `PATCH`
- **URL**: `/clearance-requests/:id/reject-check`
- **Body** (JSON): `{ "unitId": 2, "comment": "Laptop not returned" }`

### Get Pending Checks for Unit
- **Method**: `GET`
- **URL**: `/clearance-units/:unitId/pending`

---

## 6. Payroll Data Transfer

### Get Monthly Payroll Data
- **Method**: `GET`
- **URL**: `/payroll/data-transfer?month=2&year=2026`
- **Permission**: HR Officer, Finance Officer, Admin
- **Response**:
  ```json
  {
    "period": { "month": 2, "year": 2026 },
    "data": [
      {
        "employeeId": "EMP001",
        "fullName": "Kebede",
        "grossSalary": 5000,
        "payableDays": 30,
        ...
      }
    ]
  }
  ```

# HRMS Postman Script & Testing Guide

This guide provides the exact JSON payloads and Postman scripts required to test the HRMS API from start to finish.

## 1. Environment Setup

Create a new Environment in Postman and add the following variables:
- `baseUrl`: `http://localhost:3000/api/v1`
- `accessToken`: (Leave empty, will be auto-filled by scripts)
- `refreshToken`: (Leave empty)
- `myEmployeeId`: (Your registration ID, e.g., `EMP001`)
- `leaveId`: (Will be auto-filled)
- `clearanceId`: (Will be auto-filled)

---

## 2. Authentication Flow

### POST Register
- **URL**: `{{baseUrl}}/auth/register`
- **Body (JSON)**:
```json
{
    "employeeId": "EMP001",
    "password": "Password123!",
    "name": "John Doe",
    "department": "Engineering",
    "role": "ADMIN"
}
```
- **Post-request Script**:
```javascript
const response = pm.response.json();
if (response.token) {
    pm.environment.set("accessToken", response.token);
    pm.environment.set("refreshToken", response.refreshToken);
}
```

### POST Login
- **URL**: `{{baseUrl}}/auth/login`
- **Body (JSON)**:
```json
{
    "employeeId": "EMP001",
    "password": "Password123!"
}
```
- **Post-request Script**:
```javascript
const response = pm.response.json();
if (response.token) {
    pm.environment.set("accessToken", response.token);
    pm.environment.set("refreshToken", response.refreshToken);
}
```

---

## 3. Leave Management (`/leave`)

### POST Create Leave
- **URL**: `{{baseUrl}}/leave/`
- **Body**:
```json
{
    "leaveType": "ANNUAL",
    "startDate": "2026-06-01T09:00:00.000Z",
    "endDate": "2026-06-15T17:00:00.000Z",
    "reason": "Family vacation"
}
```
- **Script**: `pm.environment.set("leaveId", pm.response.json().id);`

### GET My Leaves
- **URL**: `{{baseUrl}}/leave/` OR `{{baseUrl}}/leave/my`

### GET Pending Requests (Managers Only)
- **URL**: `{{baseUrl}}/leave/pending`

### PATCH Approve/Reject
- **Approve**: `PATCH {{baseUrl}}/leave/{{leaveId}}/approve`
- **Reject**: `PATCH {{baseUrl}}/leave/{{leaveId}}/reject`
- **Body**: `{"comment": "Final decision comment"}`

---

## 4. Sabbatical Workflow (`/sabbatical`)

### POST Apply
- **URL**: `{{baseUrl}}/sabbatical/`
- **Body**:
```json
{
    "purpose": "Research on AI",
    "startDate": "2027-01-01T00:00:00.000Z",
    "endDate": "2027-06-30T00:00:00.000Z",
    "plan": "Detailed research plan text (min 20 chars)..."
}
```

### GET List Requests
- **URL**: `{{baseUrl}}/sabbatical/`

### PATCH Approve/Reject
- **Approve**: `PATCH {{baseUrl}}/sabbatical/{{id}}/approve`
- **Reject**: `PATCH {{baseUrl}}/sabbatical/{{id}}/reject`
- **Body**: `{"comment": "Comment here"}`

---

## 5. Clearance Process (`/clearance`)

### POST Initiate Clearance
- **URL**: `{{baseUrl}}/clearance/requests`
- **Body**: `{"reason": "Resignation", "lastWorkingDay": "2026-02-28"}`

### GET Unit Pending Checks (Unit Heads)
- **URL**: `{{baseUrl}}/clearance/units/:unitId/pending`

### PATCH Unit Decision
- **Approve**: `PATCH {{baseUrl}}/clearance/requests/{{id}}/approve-check`
- **Reject**: `PATCH {{baseUrl}}/clearance/requests/{{id}}/reject-check`
- **Body**: `{"unitId": 1, "comment": "Okay"}`

---

## 6. Payroll Export (`/payroll`)

### GET Export
- **URL**: `{{baseUrl}}/payroll/data-transfer?month=2&year=2026`

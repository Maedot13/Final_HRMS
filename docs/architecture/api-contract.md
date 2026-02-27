# HRMS API Contract
## Bahir Dar University – Final Year Project

---

## 1. API Contract Purpose

### 1.1 Contract Overview
This document serves as a **stable agreement** between the frontend and backend development teams. It defines the API interface that both teams will implement, allowing independent development of both layers.

### 1.2 Contract Principles
1. **Stability**: Once agreed upon, this contract should remain stable
2. **Independence**: Frontend and backend can be developed in parallel
3. **Clarity**: All endpoints, requests, and responses are explicitly defined
4. **Versioning**: API changes are versioned to maintain compatibility

### 1.3 Contract Scope
This contract defines:
- API design principles
- Authentication strategy
- Endpoint definitions
- Request/response structures
- Error handling conventions
- Versioning strategy

This contract does NOT define:
- Implementation details
- Database schema
- Frontend component structure
- Backend framework choice

---

## 2. API Design Principles

### 2.1 RESTful Design
The API follows REST (Representational State Transfer) principles:
- Resources are identified by URIs
- HTTP methods indicate actions (GET, POST, PUT, PATCH, DELETE)
- Stateless communication
- Standard HTTP status codes

### 2.2 Resource Naming Conventions
- Use plural nouns for collections: `/employees`, `/leave-requests`
- Use kebab-case for multi-word resources: `/job-postings`, `/clearance-requests`
- Nested resources for relationships: `/employees/{id}/leave-requests`
- Avoid verbs in URIs (use HTTP methods instead)

### 2.3 HTTP Method Usage
- **GET**: Retrieve resource(s) - no side effects
- **POST**: Create new resource
- **PUT**: Replace entire resource
- **PATCH**: Update partial resource
- **DELETE**: Remove resource

### 2.4 Response Format
- All responses use JSON format
- Consistent response structure
- Include metadata when appropriate (pagination, timestamps)

---

## 3. Authentication Strategy

### 3.1 Authentication Method
**JWT (JSON Web Tokens)** for stateless authentication

### 3.2 Authentication Flow

**Login**:
```
POST /api/v1/auth/login
Request: { "email": "user@example.com", "password": "password" }
Response: { 
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 123, "name": "John Doe", "role": "EMPLOYEE", ... }
}
```

**Token Usage**:
- Include token in Authorization header: `Authorization: Bearer {token}`
- Token contains: user ID, role, expiration time
- Token is validated on every protected endpoint

**Token Expiration**:
- Access token lifetime: 1 hour (configurable)
- Refresh token lifetime: 7 days (configurable)
- Frontend must handle token refresh or re-login

### 3.3 Authorization
- Backend validates user role for each endpoint
- Backend enforces permission rules
- Unauthorized requests return 403 Forbidden

---

## 4. API Endpoint Definitions

### 4.1 Authentication Endpoints

#### POST /api/v1/auth/login
**Purpose**: Authenticate user and receive token

**Request**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response** (200 OK):
```json
{
  "token": "string",
  "refreshToken": "string",
  "user": {
    "id": "number",
    "email": "string",
    "name": "string",
    "role": "string",
    "employeeId": "string"
  }
}
```

#### POST /api/v1/auth/register
**Purpose**: Register new employee account

**Request**:
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "employeeId": "string",
  "department": "string"
}
```

**Response** (201 Created):
```json
{
  "id": "number",
  "email": "string",
  "name": "string",
  "role": "string"
}
```

#### POST /api/v1/auth/logout
**Purpose**: Invalidate user token

**Request**: No body (token in header)

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

#### POST /api/v1/auth/refresh
**Purpose**: Refresh access token

**Request**:
```json
{
  "refreshToken": "string"
}
```

**Response** (200 OK):
```json
{
  "token": "string",
  "refreshToken": "string"
}
```

---

### 4.2 Employee Profile Endpoints

#### GET /api/v1/employees/{id}
**Purpose**: Get employee profile

**Response** (200 OK):
```json
{
  "id": "number",
  "employeeId": "string",
  "name": "string",
  "email": "string",
  "department": "string",
  "position": "string",
  "hireDate": "string (ISO 8601)",
  "serviceYears": "number",
  "contactInfo": {
    "phone": "string",
    "address": "string",
    "emergencyContact": "string"
  }
}
```

#### PATCH /api/v1/employees/{id}
**Purpose**: Update employee profile

**Request**:
```json
{
  "contactInfo": {
    "phone": "string",
    "address": "string",
    "emergencyContact": "string"
  }
}
```

**Response** (200 OK): Updated employee object

#### GET /api/v1/employees
**Purpose**: Get all employees (HR Officer only)

**Query Parameters**:
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `department`: string (optional filter)

**Response** (200 OK):
```json
{
  "data": [/* array of employee objects */],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

---

### 4.3 Leave Management Endpoints

#### POST /api/v1/leave-requests
**Purpose**: Submit leave request

**Request**:
```json
{
  "leaveType": "string (ANNUAL|SICK|MATERNITY|PATERNITY|UNPAID)",
  "startDate": "string (ISO 8601)",
  "endDate": "string (ISO 8601)",
  "reason": "string",
  "attachment": "string (optional, file URL)"
}
```

**Response** (201 Created):
```json
{
  "id": "number",
  "employeeId": "number",
  "leaveType": "string",
  "startDate": "string",
  "endDate": "string",
  "days": "number",
  "reason": "string",
  "status": "SUBMITTED",
  "createdAt": "string"
}
```

#### GET /api/v1/leave-requests
**Purpose**: Get leave requests (filtered by role)

**Query Parameters**:
- `employeeId`: number (optional, for HR/DH)
- `status`: string (optional filter)
- `page`: number
- `limit`: number

**Response** (200 OK): Paginated list of leave requests

#### GET /api/v1/leave-requests/{id}
**Purpose**: Get specific leave request

**Response** (200 OK): Leave request object

#### PATCH /api/v1/leave-requests/{id}/approve
**Purpose**: Approve leave request (Department Head only)

**Request**:
```json
{
  "comment": "string (optional)"
}
```

**Response** (200 OK): Updated leave request with status "APPROVED"

#### PATCH /api/v1/leave-requests/{id}/reject
**Purpose**: Reject leave request (Department Head only)

**Request**:
```json
{
  "comment": "string (required)"
}
```

**Response** (200 OK): Updated leave request with status "REJECTED"

#### GET /api/v1/employees/{id}/leave-balance
**Purpose**: Get employee leave balance

**Response** (200 OK):
```json
{
  "employeeId": "number",
  "balances": {
    "ANNUAL": "number",
    "SICK": "number",
    "MATERNITY": "number",
    "PATERNITY": "number"
  },
  "year": "number"
}
```

---

### 4.4 Sabbatical Leave Endpoints

#### GET /api/v1/employees/{id}/sabbatical-eligibility
**Purpose**: Check sabbatical eligibility

**Response** (200 OK):
```json
{
  "employeeId": "number",
  "isEligible": "boolean",
  "serviceYears": "number",
  "requiredYears": 7,
  "message": "string"
}
```

#### POST /api/v1/sabbatical-requests
**Purpose**: Submit sabbatical request

**Request**:
```json
{
  "purpose": "string (RESEARCH|STUDY|OTHER)",
  "startDate": "string (ISO 8601)",
  "endDate": "string (ISO 8601)",
  "duration": "number (months)",
  "plan": "string",
  "planDocument": "string (file URL)"
}
```

**Response** (201 Created): Sabbatical request object

#### GET /api/v1/sabbatical-requests
**Purpose**: Get sabbatical requests (filtered by role)

**Response** (200 OK): Paginated list of sabbatical requests

#### PATCH /api/v1/sabbatical-requests/{id}/approve
**Purpose**: Approve sabbatical (Department Head only)

**Request**:
```json
{
  "comment": "string (optional)"
}
```

**Response** (200 OK): Updated sabbatical request

#### PATCH /api/v1/sabbatical-requests/{id}/reject
**Purpose**: Reject sabbatical (Department Head only)

**Request**:
```json
{
  "comment": "string (required)"
}
```

**Response** (200 OK): Updated sabbatical request

---

### 4.5 Clearance Management Endpoints

#### POST /api/v1/clearance-requests
**Purpose**: Submit clearance request

**Request**:
```json
{
  "reason": "string (RESIGNATION|TRANSFER|RETIREMENT|OTHER)",
  "lastWorkingDay": "string (ISO 8601)",
  "notes": "string (optional)"
}
```

**Response** (201 Created):
```json
{
  "id": "number",
  "employeeId": "number",
  "reason": "string",
  "lastWorkingDay": "string",
  "status": "PENDING",
  "departments": [
    {
      "department": "HR",
      "status": "PENDING",
      "approvedBy": null,
      "approvedAt": null,
      "comment": null
    },
    {
      "department": "FINANCE",
      "status": "PENDING",
      "approvedBy": null,
      "approvedAt": null,
      "comment": null
    },
    {
      "department": "IT",
      "status": "PENDING",
      "approvedBy": null,
      "approvedAt": null,
      "comment": null
    },
    {
      "department": "LIBRARY",
      "status": "PENDING",
      "approvedBy": null,
      "approvedAt": null,
      "comment": null
    },
    {
      "department": "DEPARTMENT_HEAD",
      "status": "PENDING",
      "approvedBy": null,
      "approvedAt": null,
      "comment": null
    }
  ],
  "createdAt": "string"
}
```

#### GET /api/v1/clearance-requests/{id}
**Purpose**: Get clearance request status

**Response** (200 OK): Clearance request object with department statuses

#### PATCH /api/v1/clearance-requests/{id}/approve-department
**Purpose**: Approve clearance for specific department

**Request**:
```json
{
  "department": "string (HR|FINANCE|IT|LIBRARY|DEPARTMENT_HEAD)",
  "comment": "string (optional)"
}
```

**Response** (200 OK): Updated clearance request

#### PATCH /api/v1/clearance-requests/{id}/reject-department
**Purpose**: Reject clearance for specific department

**Request**:
```json
{
  "department": "string",
  "comment": "string (required)"
}
```

**Response** (200 OK): Updated clearance request

---

### 4.6 Payroll Transfer Endpoints

#### POST /api/v1/payroll-transfers
**Purpose**: Initiate payroll transfer (HR Officer only)

**Request**:
```json
{
  "employeeId": "number",
  "clearanceId": "number",
  "reason": "string",
  "effectiveDate": "string (ISO 8601)",
  "notes": "string (optional)"
}
```

**Response** (201 Created):
```json
{
  "id": "number",
  "employeeId": "number",
  "clearanceId": "number",
  "reason": "string",
  "effectiveDate": "string",
  "status": "SENT_TO_FINANCE",
  "createdAt": "string"
}
```

**Business Rule**: Backend validates that clearance is complete before allowing transfer

#### GET /api/v1/payroll-transfers
**Purpose**: Get payroll transfers (HR and Finance only)

**Response** (200 OK): Paginated list of payroll transfers

#### GET /api/v1/payroll-transfers/{id}
**Purpose**: Get specific payroll transfer

**Response** (200 OK): Payroll transfer object

---

### 4.7 Recruitment Endpoints

#### POST /api/v1/job-postings
**Purpose**: Create job posting (HR Officer only)

**Request**:
```json
{
  "title": "string",
  "description": "string",
  "requirements": "string",
  "department": "string",
  "position": "string",
  "deadline": "string (ISO 8601)"
}
```

**Response** (201 Created): Job posting object

#### GET /api/v1/job-postings
**Purpose**: Get all job postings

**Query Parameters**:
- `status`: string (OPEN|CLOSED)
- `department`: string

**Response** (200 OK): List of job postings

#### GET /api/v1/job-postings/{id}
**Purpose**: Get specific job posting

**Response** (200 OK): Job posting object

#### POST /api/v1/job-postings/{id}/applications
**Purpose**: Apply for job (Employee only)

**Request**:
```json
{
  "coverLetter": "string",
  "cvUrl": "string (file URL)"
}
```

**Response** (201 Created):
```json
{
  "id": "number",
  "jobPostingId": "number",
  "employeeId": "number",
  "coverLetter": "string",
  "cvUrl": "string",
  "status": "SUBMITTED",
  "createdAt": "string"
}
```

#### GET /api/v1/job-postings/{id}/applications
**Purpose**: Get applications for job (Recruitment Committee only)

**Response** (200 OK): List of applications

#### PATCH /api/v1/applications/{id}/status
**Purpose**: Update application status (Recruitment Committee only)

**Request**:
```json
{
  "status": "string (UNDER_REVIEW|SHORTLISTED|REJECTED)",
  "comment": "string (optional)"
}
```

**Response** (200 OK): Updated application

---

### 4.8 Notification Endpoints

#### GET /api/v1/notifications
**Purpose**: Get user notifications

**Query Parameters**:
- `unreadOnly`: boolean (default: false)
- `page`: number
- `limit`: number

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "number",
      "userId": "number",
      "type": "string (LEAVE_APPROVED|LEAVE_REJECTED|...)",
      "title": "string",
      "message": "string",
      "relatedId": "number (optional)",
      "relatedType": "string (optional)",
      "isRead": "boolean",
      "createdAt": "string"
    }
  ],
  "unreadCount": "number",
  "pagination": { /* pagination object */ }
}
```

#### PATCH /api/v1/notifications/{id}/read
**Purpose**: Mark notification as read

**Response** (200 OK): Updated notification

#### PATCH /api/v1/notifications/read-all
**Purpose**: Mark all notifications as read

**Response** (200 OK):
```json
{
  "message": "All notifications marked as read",
  "count": "number"
}
```

---

### 4.9 Report Endpoints

#### GET /api/v1/reports/leave-summary
**Purpose**: Generate leave summary report (HR Officer only)

**Query Parameters**:
- `startDate`: string (ISO 8601)
- `endDate`: string (ISO 8601)
- `department`: string (optional)

**Response** (200 OK): Report data object

#### GET /api/v1/reports/sabbatical-summary
**Purpose**: Generate sabbatical summary report (HR Officer only)

**Query Parameters**: Similar to leave summary

**Response** (200 OK): Report data object

#### GET /api/v1/reports/clearance-summary
**Purpose**: Generate clearance summary report (HR Officer only)

**Response** (200 OK): Report data object

#### GET /api/v1/reports/recruitment-summary
**Purpose**: Generate recruitment summary report (HR Officer only)

**Response** (200 OK): Report data object

---

### 4.10 User Management Endpoints

#### GET /api/v1/users
**Purpose**: Get all users (Administrator only)

**Response** (200 OK): Paginated list of users

#### POST /api/v1/users
**Purpose**: Create new user (Administrator only)

**Request**:
```json
{
  "email": "string",
  "name": "string",
  "role": "string",
  "employeeId": "string"
}
```

**Response** (201 Created): User object with temporary password

#### PATCH /api/v1/users/{id}
**Purpose**: Update user (Administrator only)

**Request**:
```json
{
  "role": "string (optional)",
  "isActive": "boolean (optional)"
}
```

**Response** (200 OK): Updated user object

#### DELETE /api/v1/users/{id}
**Purpose**: Deactivate user (Administrator only)

**Response** (200 OK):
```json
{
  "message": "User deactivated successfully"
}
```

---

## 5. Error Handling Conventions

### 5.1 HTTP Status Codes

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 200 OK | Success | Successful GET, PATCH, DELETE |
| 201 Created | Resource created | Successful POST |
| 400 Bad Request | Invalid input | Validation errors |
| 401 Unauthorized | Not authenticated | Missing or invalid token |
| 403 Forbidden | Not authorized | Insufficient permissions |
| 404 Not Found | Resource not found | Invalid resource ID |
| 409 Conflict | Business rule violation | Duplicate, insufficient balance, etc. |
| 500 Internal Server Error | Server error | Unexpected errors |

### 5.2 Error Response Format

**Standard Error Response**:
```json
{
  "error": {
    "code": "string (ERROR_CODE)",
    "message": "string (human-readable message)",
    "details": "object (optional, additional context)",
    "timestamp": "string (ISO 8601)"
  }
}
```

**Validation Error Response** (400):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "email": "Invalid email format",
        "startDate": "Start date must be in the future"
      }
    },
    "timestamp": "2024-01-30T10:00:00Z"
  }
}
```

**Business Rule Error Response** (409):
```json
{
  "error": {
    "code": "INSUFFICIENT_LEAVE_BALANCE",
    "message": "Insufficient leave balance",
    "details": {
      "requested": 10,
      "available": 5,
      "leaveType": "ANNUAL"
    },
    "timestamp": "2024-01-30T10:00:00Z"
  }
}
```

### 5.3 Common Error Codes

**Authentication Errors**:
- `INVALID_CREDENTIALS`: Login failed
- `TOKEN_EXPIRED`: JWT token expired
- `TOKEN_INVALID`: JWT token malformed

**Authorization Errors**:
- `INSUFFICIENT_PERMISSIONS`: User lacks required role
- `RESOURCE_FORBIDDEN`: User cannot access resource

**Validation Errors**:
- `VALIDATION_ERROR`: Input validation failed
- `MISSING_REQUIRED_FIELD`: Required field missing

**Business Rule Errors**:
- `INSUFFICIENT_LEAVE_BALANCE`: Not enough leave days
- `SABBATICAL_NOT_ELIGIBLE`: Service years < 7
- `CLEARANCE_INCOMPLETE`: Clearance not fully approved
- `APPLICATION_DEADLINE_PASSED`: Job application deadline passed
- `DUPLICATE_REQUEST`: Request already exists

**Resource Errors**:
- `RESOURCE_NOT_FOUND`: Resource ID not found
- `RESOURCE_ALREADY_EXISTS`: Duplicate resource

---

## 6. Versioning and Compatibility

### 6.1 API Versioning Strategy
- **Version in URL**: `/api/v1/...`
- **Current Version**: v1
- **Backward Compatibility**: Maintain v1 for at least 6 months after v2 release

### 6.2 Breaking Changes
Breaking changes require a new API version. Examples:
- Removing an endpoint
- Changing response structure
- Changing required fields
- Changing data types

### 6.3 Non-Breaking Changes
Non-breaking changes can be added to existing version:
- Adding new endpoints
- Adding optional fields to requests
- Adding new fields to responses
- Adding new query parameters (optional)

### 6.4 Deprecation Policy
1. Announce deprecation 3 months in advance
2. Mark deprecated endpoints in documentation
3. Include deprecation warning in response headers
4. Provide migration guide to new version

---

## 7. Request/Response Headers

### 7.1 Standard Request Headers
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

### 7.2 Standard Response Headers
```
Content-Type: application/json
X-Request-ID: {unique-request-id}
X-RateLimit-Limit: {limit}
X-RateLimit-Remaining: {remaining}
```

---

## 8. Pagination Standard

### 8.1 Pagination Parameters
**Query Parameters**:
- `page`: Page number (1-indexed, default: 1)
- `limit`: Items per page (default: 20, max: 100)

### 8.2 Pagination Response
```json
{
  "data": [/* array of items */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 9. File Upload Strategy

### 9.1 File Upload Flow
1. Frontend requests upload URL from backend
2. Backend generates signed URL (if using cloud storage) or upload endpoint
3. Frontend uploads file directly to storage
4. Frontend sends file URL to backend in subsequent request

### 9.2 File Upload Endpoints

#### POST /api/v1/uploads/request
**Purpose**: Request file upload URL

**Request**:
```json
{
  "fileName": "string",
  "fileType": "string (MIME type)",
  "purpose": "string (CV|DOCUMENT|PHOTO)"
}
```

**Response** (200 OK):
```json
{
  "uploadUrl": "string (presigned URL or upload endpoint)",
  "fileUrl": "string (final URL after upload)",
  "expiresAt": "string (ISO 8601)"
}
```

---

## 10. Contract Compliance

### 10.1 Frontend Responsibilities
- Send requests in specified format
- Include required headers (Authorization, Content-Type)
- Handle all defined error responses
- Respect rate limits
- Display error messages appropriately

### 10.2 Backend Responsibilities
- Implement all defined endpoints
- Return responses in specified format
- Use correct HTTP status codes
- Validate all inputs
- Enforce business rules
- Provide clear error messages

### 10.3 Contract Changes
- Changes require agreement from both teams
- Document all changes with version notes
- Communicate breaking changes in advance
- Provide migration path for breaking changes

---

**END OF API CONTRACT**

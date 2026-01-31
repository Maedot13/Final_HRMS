# HRMS Backend Development Plan (Phase 2)
## Bahir Dar University – Final Year Project

---

## 1. Backend Plan Overview

### 1.1 Phase 2 Context
This document defines **Phase 2** of the HRMS project: **Backend Implementation**.

**Timeline**: After frontend completion (Phase 1)

**Objective**: Build a secure, robust backend API that enforces all business rules and serves as the single source of truth for the HRMS.

### 1.2 Backend Goals
1. Implement RESTful API according to API contract
2. Enforce all business rules and workflow logic
3. Provide secure authentication and authorization
4. Ensure data integrity and persistence
5. Deliver production-ready, scalable backend

### 1.3 Backend Scope
**In Scope**:
- RESTful API implementation
- Database design and implementation
- Business logic enforcement
- Authentication and authorization
- Data validation and sanitization
- Workflow state management
- Security implementation
- API documentation

**Out of Scope**:
- User interface (frontend responsibility)
- Client-side validation (frontend responsibility)
- Frontend routing (frontend responsibility)

---

## 2. Backend Responsibilities and Authority

### 2.1 Backend Responsibilities

**Business Logic Enforcement**:
- Validate all business rules
- Enforce workflow state transitions
- Calculate derived values (e.g., leave balance, service years)
- Apply approval logic
- Manage multi-step processes

**Authorization and Authentication**:
- Authenticate users (validate credentials)
- Generate and validate JWT tokens
- Enforce role-based access control
- Validate permissions for every action
- Prevent unauthorized access

**Data Validation**:
- Validate all incoming data
- Sanitize inputs to prevent injection attacks
- Enforce data type constraints
- Validate data relationships
- Reject invalid requests

**Data Persistence**:
- Store all application data
- Maintain data integrity
- Manage transactions
- Implement database constraints
- Handle concurrent access

**Workflow State Management**:
- Control workflow state transitions
- Enforce approval sequences
- Trigger notifications
- Maintain audit trails

### 2.2 Backend Authority

> [!IMPORTANT]
> **Critical Principle**: The backend has FINAL authority over all business decisions.

**Backend Authority Includes**:
- Approving or rejecting all requests
- Determining eligibility (e.g., sabbatical)
- Validating balances (e.g., leave balance)
- Enforcing deadlines (e.g., job application)
- Controlling access to resources
- Making all authorization decisions

**Backend Overrides Frontend**:
- Frontend validation is for UX only
- Backend re-validates all frontend input
- Backend can reject requests frontend approved (UI-wise)
- Backend state is the source of truth
- Frontend must reflect backend decisions

### 2.3 Backend Security Principles

**Principle 1: Never Trust Frontend Input**
- Validate all data from frontend
- Sanitize all inputs
- Assume frontend can be bypassed
- Enforce all rules on backend

**Principle 2: Enforce Authorization on Every Request**
- Validate JWT token on every protected endpoint
- Check user role for every action
- Verify user owns resource (where applicable)
- Return 403 Forbidden for unauthorized actions

**Principle 3: Fail Securely**
- Default to deny access
- Log security events
- Return minimal error information
- Protect sensitive data in responses

---

## 3. Backend Technology Stack

### 3.1 Confirmed Technology Stack

**Backend Stack**: Node.js + Express + TypeScript + Prisma + PostgreSQL

**Runtime & Framework**:
- **Node.js** (v18 or higher) - Server-side JavaScript runtime for handling RESTful APIs, authentication, and database communication
- **Express.js** (v4.x) - Minimalist web framework for building RESTful APIs
- **TypeScript** (v5.x) - Type-safe JavaScript for better code quality and maintainability

**Database & ORM**:
- **PostgreSQL** (v14 or higher) - Primary relational database management system for storing employee records and administrative data
- **Prisma** (v5.x) - Modern ORM for type-safe database access, schema management, and migrations

**Authentication & Security**:
- **jsonwebtoken** - JWT token generation and validation
- **bcrypt** - Secure password hashing
- **helmet** - HTTP security headers
- **cors** - Cross-origin resource sharing configuration
- **express-rate-limit** - API rate limiting to prevent abuse

**Validation & Middleware**:
- **Zod** (recommended) or **Joi** - Request body validation with TypeScript support
- **express-validator** - Alternative validation middleware
- **morgan** - HTTP request logging

**Utilities**:
- **dotenv** - Environment variable management
- **winston** or **pino** - Structured logging
- **date-fns** - Date manipulation (shared with frontend)

**Development Tools**:
- **ts-node-dev** - TypeScript development server with auto-reload
- **nodemon** - Alternative development server
- **Prisma Studio** - Database GUI for development
- **ESLint** - Code linting for TypeScript
- **Prettier** - Code formatting

**Testing**:
- **Jest** - Unit and integration testing framework
- **Supertest** - HTTP assertion library for API testing
- **@faker-js/faker** - Generate fake data for testing

**API Documentation**:
- **Swagger/OpenAPI** - API documentation
- **swagger-ui-express** - Serve Swagger UI

### 3.2 Backend Capabilities

The Node.js + Express backend provides:
- ✅ RESTful API endpoints (as defined in API contract)
- ✅ JWT-based authentication
- ✅ Role-based authorization middleware
- ✅ Input validation and sanitization
- ✅ Database transactions (via Prisma)
- ✅ Comprehensive error handling and logging
- ✅ API documentation (Swagger/OpenAPI)
- ✅ Type safety (TypeScript + Prisma)
- ✅ Scalable architecture

---

## 4. Database Design

### 4.1 Core Entities

**Users**:
- id, email, password_hash, role, is_active, created_at, updated_at

**Employees**:
- id, user_id (FK), employee_id, name, department, position, hire_date, service_years, contact_info

**LeaveRequests**:
- id, employee_id (FK), leave_type, start_date, end_date, days, reason, attachment_url, status, approver_id (FK), approver_comment, created_at, updated_at

**LeaveBalances**:
- id, employee_id (FK), year, annual_balance, sick_balance, maternity_balance, paternity_balance

**SabbaticalRequests**:
- id, employee_id (FK), purpose, start_date, end_date, duration_months, plan, plan_document_url, status, approver_id (FK), approver_comment, created_at, updated_at

**ClearanceRequests**:
- id, employee_id (FK), reason, last_working_day, status, created_at, updated_at

**ClearanceDepartments**:
- id, clearance_id (FK), department, status, approver_id (FK), approved_at, comment

**PayrollTransfers**:
- id, employee_id (FK), clearance_id (FK), reason, effective_date, status, created_by (FK), created_at

**JobPostings**:
- id, title, description, requirements, department, position, deadline, status, created_by (FK), created_at

**JobApplications**:
- id, job_posting_id (FK), employee_id (FK), cover_letter, cv_url, status, reviewed_by (FK), review_comment, created_at, updated_at

**Notifications**:
- id, user_id (FK), type, title, message, related_id, related_type, is_read, created_at

### 4.2 Database Relationships

```
Users 1:1 Employees
Employees 1:N LeaveRequests
Employees 1:N LeaveBalances
Employees 1:N SabbaticalRequests
Employees 1:N ClearanceRequests
ClearanceRequests 1:N ClearanceDepartments
Employees 1:N PayrollTransfers
ClearanceRequests 1:N PayrollTransfers
Users 1:N JobPostings (created_by)
JobPostings 1:N JobApplications
Employees 1:N JobApplications
Users 1:N Notifications
```

### 4.3 Database Constraints

**Integrity Constraints**:
- Foreign key constraints
- Unique constraints (e.g., employee_id, email)
- Check constraints (e.g., start_date < end_date)
- Not null constraints for required fields

**Business Rule Constraints**:
- Leave balance cannot be negative
- Sabbatical duration <= 12 months
- Job application deadline must be in future
- Clearance requires all departments approved

---

## 5. Business Rules Implementation

### 5.1 Leave Management Rules

**Rule 1: Leave Balance Validation**
```
WHEN employee submits leave request
THEN backend MUST:
  1. Calculate total days requested
  2. Check leave balance for leave type
  3. REJECT if balance insufficient
  4. ACCEPT if balance sufficient
```

**Rule 2: Leave Approval Authority**
```
WHEN leave request is submitted
THEN backend MUST:
  1. Verify approver is Department Head
  2. Verify approver has authority over employee
  3. REJECT if unauthorized
  4. UPDATE status if authorized
```

**Rule 3: Leave Balance Update**
```
WHEN leave request is approved
THEN backend MUST:
  1. Deduct days from leave balance
  2. Update balance atomically (transaction)
  3. Trigger notification to employee
```

### 5.2 Sabbatical Management Rules

**Rule 1: Sabbatical Eligibility**
```
WHEN employee requests sabbatical
THEN backend MUST:
  1. Calculate service years (current_date - hire_date)
  2. REJECT if service_years < 7
  3. ACCEPT if service_years >= 7
```

**Rule 2: Sabbatical Duration Limit**
```
WHEN sabbatical request is submitted
THEN backend MUST:
  1. Validate duration <= 12 months
  2. REJECT if duration > 12 months
```

**Rule 3: Sabbatical Approval Sequence**
```
WHEN sabbatical is submitted
THEN backend MUST:
  1. HR Officer verifies eligibility (read-only check)
  2. Department Head approves/rejects
  3. Update status accordingly
```

### 5.3 Clearance Management Rules

**Rule 1: Multi-Department Approval**
```
WHEN clearance request is submitted
THEN backend MUST:
  1. Create clearance record
  2. Create 5 department approval records (HR, Finance, IT, Library, Dept Head)
  3. Set all to PENDING status
```

**Rule 2: Department Approval Authority**
```
WHEN department approves clearance
THEN backend MUST:
  1. Verify approver has authority for that department
  2. Update only that department's status
  3. Check if all departments approved
  4. Update overall clearance status if complete
```

**Rule 3: Clearance Completion**
```
WHEN all departments approve
THEN backend MUST:
  1. Set clearance status to COMPLETE
  2. Trigger notification to employee
  3. Enable payroll transfer
```

### 5.4 Payroll Transfer Rules

**Rule 1: Clearance Validation**
```
WHEN HR initiates payroll transfer
THEN backend MUST:
  1. Verify clearance exists for employee
  2. Verify clearance status is COMPLETE
  3. REJECT if clearance incomplete
  4. ACCEPT if clearance complete
```

**Rule 2: Authorization**
```
WHEN payroll transfer is initiated
THEN backend MUST:
  1. Verify user role is HR_OFFICER
  2. REJECT if not HR Officer
```

### 5.5 Recruitment Rules

**Rule 1: Application Deadline**
```
WHEN employee applies for job
THEN backend MUST:
  1. Check current_date <= job_posting.deadline
  2. REJECT if deadline passed
  3. ACCEPT if deadline not passed
```

**Rule 2: Duplicate Application Prevention**
```
WHEN employee applies for job
THEN backend MUST:
  1. Check if employee already applied
  2. REJECT if duplicate application
  3. ACCEPT if first application
```

**Rule 3: Application Review Authority**
```
WHEN application status is updated
THEN backend MUST:
  1. Verify user role is RECRUITMENT_COMMITTEE
  2. REJECT if unauthorized
```

---

## 6. Authentication and Authorization

### 6.1 Authentication Implementation

**User Registration**:
```
1. Validate input (email format, password strength)
2. Check if email already exists
3. Hash password (bcrypt, scrypt, or argon2)
4. Create user record
5. Create employee record
6. Return user object (without password)
```

**User Login**:
```
1. Validate input
2. Find user by email
3. Verify password hash
4. Generate JWT token (include user_id, role, exp)
5. Return token + user object
```

**Token Validation** (on every protected endpoint):
```
1. Extract token from Authorization header
2. Verify token signature
3. Check token expiration
4. Extract user_id and role from token
5. Attach user info to request context
6. Proceed to endpoint handler
```

### 6.2 Authorization Implementation

**Role-Based Access Control**:
```
DEFINE permissions for each endpoint:
  - POST /leave-requests: [EMPLOYEE]
  - PATCH /leave-requests/:id/approve: [DEPARTMENT_HEAD]
  - GET /employees: [HR_OFFICER, ADMIN]
  - POST /payroll-transfers: [HR_OFFICER]
  - PATCH /applications/:id/status: [RECRUITMENT_COMMITTEE]
  - POST /users: [ADMIN]
  
WHEN endpoint is accessed:
  1. Check user role from JWT token
  2. Verify role has permission for endpoint
  3. REJECT with 403 if unauthorized
  4. PROCEED if authorized
```

**Resource Ownership Validation**:
```
WHEN user accesses their own resource:
  1. Extract resource_id from URL
  2. Fetch resource from database
  3. Verify resource.employee_id == user.employee_id
  4. REJECT with 403 if not owner (unless admin/HR)
  5. PROCEED if owner or authorized role
```

---

## 7. API Endpoint Implementation

### 7.1 Endpoint Implementation Pattern

**Standard Endpoint Flow**:
```
1. Authenticate request (validate JWT)
2. Authorize request (check role permissions)
3. Validate input (schema validation)
4. Enforce business rules
5. Execute database operations (in transaction if needed)
6. Trigger side effects (notifications, etc.)
7. Return response
8. Handle errors
```

**Example: POST /api/v1/leave-requests**
```
1. Authenticate: Validate JWT token
2. Authorize: Verify role is EMPLOYEE
3. Validate: Check request body schema
4. Business Rule: Validate leave balance
5. Database: Insert leave request record
6. Side Effect: Create notification for Department Head
7. Response: Return created leave request (201)
8. Error Handling: Return appropriate error if any step fails
```

### 7.2 Transaction Management

**Use Transactions For**:
- Leave approval (update request + update balance)
- Clearance completion (update clearance + create notification)
- Payroll transfer (create transfer + update clearance)
- Any multi-table operation

**Transaction Pattern**:
```
BEGIN TRANSACTION
  1. Update primary record
  2. Update related records
  3. Create audit log
  4. Create notification
COMMIT TRANSACTION
ON ERROR:
  ROLLBACK TRANSACTION
  Return error response
```

### 7.3 Notification Triggers

**Trigger Notifications When**:
- Leave request approved/rejected → Notify employee
- Sabbatical request approved/rejected → Notify employee
- Clearance department approved → Notify employee
- Clearance completed → Notify employee and HR
- Payroll transfer created → Notify Finance Officer
- New job posting created → Notify all employees
- Application status changed → Notify applicant

**Notification Creation**:
```
WHEN event occurs:
  1. Determine notification recipients
  2. Create notification record(s)
  3. Set notification type and message
  4. Link to related resource (optional)
  5. Mark as unread
```

---

## 8. Data Validation and Sanitization

### 8.1 Input Validation

**Validation Layers**:
1. **Schema Validation**: Data type, required fields, format
2. **Business Validation**: Business rules, constraints
3. **Authorization Validation**: User permissions

**Validation Tools**:
- Use validation library (Joi, Zod, Pydantic, etc.)
- Define schemas for all request bodies
- Validate before processing

**Example Validation Schema (Leave Request)**:
```
{
  leaveType: required, enum(ANNUAL, SICK, MATERNITY, PATERNITY, UNPAID),
  startDate: required, date, future,
  endDate: required, date, after(startDate),
  reason: required, string, maxLength(500),
  attachment: optional, url
}
```

### 8.2 Input Sanitization

**Sanitize All Text Inputs**:
- Trim whitespace
- Remove HTML tags (if not expected)
- Escape special characters
- Prevent SQL injection (use parameterized queries)
- Prevent XSS (escape output)

**File Upload Validation**:
- Validate file type (MIME type)
- Validate file size (max 10MB)
- Scan for malware (if possible)
- Store in secure location
- Generate unique file names

---

## 9. Error Handling and Logging

### 9.1 Error Response Format

**Follow API Contract** (see api-contract.md):
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* optional */ },
    "timestamp": "ISO 8601 timestamp"
  }
}
```

### 9.2 Error Types and Status Codes

| Error Type | Status Code | Example |
|------------|-------------|---------|
| Validation Error | 400 | Invalid email format |
| Authentication Error | 401 | Invalid credentials |
| Authorization Error | 403 | Insufficient permissions |
| Not Found | 404 | Resource not found |
| Business Rule Error | 409 | Insufficient leave balance |
| Server Error | 500 | Database connection failed |

### 9.3 Logging Strategy

**Log Levels**:
- **ERROR**: Errors that need immediate attention
- **WARN**: Potential issues (e.g., failed login attempts)
- **INFO**: Important events (e.g., user login, approval)
- **DEBUG**: Detailed information for debugging

**What to Log**:
- All errors with stack traces
- Authentication events (login, logout, failed attempts)
- Authorization failures
- Business rule violations
- Database errors
- API requests (method, path, user, timestamp)

**What NOT to Log**:
- Passwords or sensitive credentials
- Full JWT tokens
- Personally identifiable information (PII) in plain text

---

## 10. Security Implementation

### 10.1 Password Security
- Hash passwords with bcrypt, scrypt, or argon2
- Use salt (automatic with bcrypt)
- Never store plain text passwords
- Enforce password strength requirements

### 10.2 JWT Security
- Use strong secret key (256-bit minimum)
- Set appropriate expiration (1 hour for access token)
- Include minimal claims (user_id, role, exp)
- Validate signature on every request
- Implement token refresh mechanism

### 10.3 SQL Injection Prevention
- Use parameterized queries (prepared statements)
- Use ORM (Prisma, TypeORM, SQLAlchemy, etc.)
- Never concatenate user input into SQL queries
- Validate and sanitize all inputs

### 10.4 XSS Prevention
- Escape output when rendering (frontend responsibility)
- Sanitize rich text inputs
- Set appropriate Content-Type headers
- Use Content Security Policy (CSP) headers

### 10.5 CSRF Prevention
- Use SameSite cookie attribute
- Implement CSRF tokens for state-changing operations
- Validate Origin/Referer headers

### 10.6 Rate Limiting
- Implement rate limiting on authentication endpoints
- Limit requests per user per time window
- Prevent brute force attacks
- Return 429 Too Many Requests when exceeded

---

## 11. Backend Completion Criteria

### 11.1 Functional Completeness
- [ ] All API endpoints implemented (as per API contract)
- [ ] All business rules enforced
- [ ] All workflows functional
- [ ] Authentication and authorization working
- [ ] Database schema implemented with constraints

### 11.2 Security Standards
- [ ] Password hashing implemented
- [ ] JWT authentication working
- [ ] Role-based authorization enforced
- [ ] Input validation and sanitization implemented
- [ ] SQL injection prevention verified
- [ ] Rate limiting implemented

### 11.3 Data Integrity
- [ ] Database constraints enforced
- [ ] Transactions used for multi-step operations
- [ ] Concurrent access handled correctly
- [ ] Data validation comprehensive

### 11.4 Code Quality
- [ ] Code follows style guide
- [ ] Error handling comprehensive
- [ ] Logging implemented
- [ ] Code documented
- [ ] No security vulnerabilities

### 11.5 Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] Database tests for data integrity
- [ ] Security tests for vulnerabilities

### 11.6 Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema documentation
- [ ] Deployment guide
- [ ] Environment configuration guide

---

## 12. Backend Implementation Roadmap

### Phase 2.1: Setup and Foundation
- Choose technology stack
- Set up project structure
- Configure database connection
- Set up development environment
- Configure linting and formatting

### Phase 2.2: Database Implementation
- Design database schema
- Create migration scripts
- Implement database models
- Add database constraints
- Seed initial data

### Phase 2.3: Authentication
- Implement user registration
- Implement user login
- Implement JWT generation
- Implement JWT validation middleware
- Implement logout

### Phase 2.4: Core API Endpoints
- Implement employee profile endpoints
- Implement leave management endpoints
- Implement sabbatical endpoints
- Implement clearance endpoints
- Implement payroll transfer endpoints

### Phase 2.5: Additional Modules
- Implement recruitment endpoints
- Implement notification endpoints
- Implement report endpoints
- Implement user management endpoints

### Phase 2.6: Business Rules
- Implement leave balance validation
- Implement sabbatical eligibility check
- Implement clearance completion logic
- Implement payroll transfer validation
- Implement application deadline validation

### Phase 2.7: Security Hardening
- Implement rate limiting
- Add security headers
- Implement CSRF protection
- Security audit
- Penetration testing

### Phase 2.8: Testing
- Write unit tests
- Write integration tests
- Write security tests
- Test all workflows
- Fix bugs

### Phase 2.9: Documentation
- Generate API documentation
- Document database schema
- Write deployment guide
- Write environment setup guide

### Phase 2.10: Deployment Preparation
- Configure production environment
- Set up database backups
- Configure logging and monitoring
- Prepare deployment scripts
- Final testing

---

## 13. Backend-Specific Risks

### 13.1 Risk: Database Performance
**Description**: Database queries may be slow with large data sets

**Mitigation**:
- Add database indexes on frequently queried columns
- Optimize queries
- Implement pagination
- Use database query profiling

### 13.2 Risk: Concurrent Access Issues
**Description**: Multiple users modifying same data simultaneously

**Mitigation**:
- Use database transactions
- Implement optimistic locking
- Use row-level locking where needed
- Test concurrent scenarios

### 13.3 Risk: Security Vulnerabilities
**Description**: Security flaws may be exploited

**Mitigation**:
- Follow security best practices
- Regular security audits
- Keep dependencies updated
- Use security scanning tools

---

**END OF BACKEND PLAN**

# HRMS System Architecture Plan
## Bahir Dar University – Final Year Project

---

## 1. System Overview

### 1.1 Project Context
- **Institution**: Bahir Dar University, Bahir Dar Institute of Technology
- **Project Type**: BSc Computer Science Final Year Project
- **Team Size**: 3 members
- **Project Level**: Production-ready system intended for university deployment
- **Deployment Environment**: University intranet

### 1.2 System Purpose
The Human Resource Management System (HRMS) is designed to digitize and control HR approval workflows at Bahir Dar University. The system provides a comprehensive platform for managing:
- Leave management
- Sabbatical leave requests
- Employee clearance processes
- Payroll name transfers
- Internal recruitment

### 1.3 System Scope
The HRMS is a full-stack web application that serves multiple user roles within the university's HR ecosystem. The system enforces business rules, manages approval workflows, and maintains data integrity across all HR processes.

---

## 2. Client-Server Architecture

### 2.1 Architecture Pattern
The HRMS follows a **Client-Server architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  (React-based Single Page Application)                      │
│                                                              │
│  • User Interface Presentation                              │
│  • Client-side Validation (UX only)                         │
│  • State Management                                          │
│  • API Communication                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS / REST API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                        SERVER LAYER                          │
│  (Backend API Server)                                        │
│                                                              │
│  • Business Logic Enforcement                                │
│  • Authorization & Authentication                            │
│  • Data Validation                                           │
│  • Workflow State Management                                 │
│  • Database Operations                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Database Protocol
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                      DATABASE LAYER                          │
│  (Relational Database)                                       │
│                                                              │
│  • Data Persistence                                          │
│  • Data Integrity Constraints                                │
│  • Transaction Management                                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Communication Protocol
- **Protocol**: HTTPS
- **API Style**: RESTful API
- **Data Format**: JSON
- **Authentication**: JWT (JSON Web Tokens)

### 2.3 Deployment Context
- **Network**: University intranet (internal network only)
- **Access**: Restricted to university employees and authorized personnel
- **Availability**: Business hours with potential 24/7 access
- **Scalability**: Designed to support university-wide deployment

---

## 3. Technology Stack Overview

### 3.1 Frontend Technology Stack

**Confirmed Stack**: React + Node.js + PostgreSQL

**Core Framework**:
- **React 18.x** with **TypeScript** - Dynamic and responsive web interface
- **React Router 6.x** - Client-side routing
- **React Context API** - State management (with option to migrate to Redux Toolkit if needed)

**Build Tool**:
- **Vite** (recommended) - Fast development server and optimized builds
- Alternative: Create React App

**UI Framework**:
- **Material-UI (MUI)** (recommended) - Comprehensive React component library
- Alternative: Ant Design or Tailwind CSS

**HTTP Client**:
- **Axios** - HTTP requests with interceptors for authentication

**Form Management**:
- **React Hook Form** - Performant form state management
- **Yup** - Schema-based form validation

**Additional Libraries**:
- **date-fns** - Date manipulation and formatting
- **react-dropzone** - File upload UI
- **react-toastify** - Toast notifications
- **React Icons** - Icon library

**Development Tools**:
- **TypeScript** - Type safety
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Cypress** - End-to-end testing

### 3.2 Backend Technology Stack

**Confirmed Stack**: Node.js + PostgreSQL

**Runtime & Framework**:
- **Node.js** (v18 or higher) - Server-side JavaScript runtime
- **Express.js** - Web framework for RESTful APIs
- **TypeScript** - Type safety for backend code

**Database**:
- **PostgreSQL** (v14 or higher) - Primary relational database management system
- **Prisma** (recommended ORM) - Type-safe database client and schema management
- Alternative ORMs: TypeORM, Sequelize

**Authentication & Security**:
- **jsonwebtoken** - JWT token generation and validation
- **bcrypt** - Password hashing
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting

**Validation & Utilities**:
- **Zod** or **Joi** - Request validation
- **dotenv** - Environment variable management
- **winston** or **pino** - Logging

**Development Tools**:
- **ts-node-dev** - TypeScript development server with hot reload
- **Jest** - Unit and integration testing
- **Supertest** - API endpoint testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

**Required Capabilities**:
- RESTful API endpoints
- JWT-based authentication
- Role-based authorization
- Business rule enforcement
- Data persistence and transactions
- Input validation and sanitization

---

## 4. Core Architectural Principles

### 4.1 Backend as Single Source of Truth

**Principle**: The backend is the authoritative source for all business logic, data validation, and state management.

**Implications**:
1. **Frontend Responsibilities**:
   - Present data received from backend
   - Provide user-friendly interface
   - Perform client-side validation for UX only (not security)
   - Reflect backend state accurately
   - Submit user actions to backend for processing

2. **Backend Responsibilities**:
   - Validate all incoming data
   - Enforce all business rules
   - Make all authorization decisions
   - Control workflow state transitions
   - Maintain data integrity
   - Persist all data

3. **Authority Boundaries**:
   - Frontend CANNOT override backend decisions
   - Frontend CANNOT enforce business rules
   - Frontend CANNOT make authorization decisions
   - Frontend MUST trust backend responses
   - Backend MUST validate all frontend input

### 4.2 Separation of Concerns

**Frontend Concerns**:
- User interface presentation
- User experience optimization
- Client-side routing
- Form input collection
- Display state management
- API request orchestration

**Backend Concerns**:
- Business logic implementation
- Data validation and sanitization
- Authentication and authorization
- Workflow state management
- Database operations
- Security enforcement

### 4.3 Stateless Communication

**Principle**: Each API request contains all necessary information for the backend to process it.

**Implementation**:
- JWT tokens carry user identity and role
- No server-side session storage required
- Backend validates token on each request
- Frontend includes token in all authenticated requests

### 4.4 Security-First Design

**Principle**: Security is enforced at the backend layer, not the frontend.

**Implementation**:
- Frontend UI restrictions are for UX only
- Backend validates all permissions
- Backend enforces all access controls
- Backend sanitizes all inputs
- Backend prevents unauthorized actions

---

## 5. System Actors and Roles

### 5.1 Actor Definitions

| Actor | Code | Primary Responsibilities |
|-------|------|-------------------------|
| Employee | EMP | Request services, update profile, apply for jobs |
| HR Officer | HRO | Manage HR records, approvals, payroll transfer |
| Department Head | DH | Verify employees, approve requests |
| Finance Officer | FO | View payroll name transfers |
| Recruitment Committee | RC | Review job applications |
| Administrator | ADM | Manage users and roles |

### 5.2 Role-Based Access Control (RBAC)

**Principle**: Access to system features is determined by user role.

**Implementation**:
- Each user has exactly one primary role
- Roles determine accessible features
- Backend enforces role-based permissions
- Frontend adapts UI based on role

---

## 6. System Modules

### 6.1 Core Modules
1. **Authentication & Authorization**: User login, registration, role management
2. **Dashboard System**: Role-specific dashboards and overview
3. **Employee Profile Management**: Personal information management
4. **Leave Management**: Leave requests and approvals
5. **Sabbatical Leave Management**: Sabbatical requests and eligibility
6. **Employee Clearance Management**: Multi-department clearance workflow
7. **Payroll Name Transfer**: Payroll transfer to finance
8. **Internal Recruitment**: Job postings and applications
9. **Notifications & Alerts**: Real-time notifications
10. **Reports & Records**: HR reports and employee records
11. **User & Role Management**: System administration

### 6.2 Module Interactions

```
┌─────────────────┐
│  Authentication │──────┐
└─────────────────┘      │
                         │ Provides Identity
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Authorization Layer                    │
│         (Validates permissions for all modules)          │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Leave     │  │ Sabbatical  │  │  Clearance  │
│ Management  │  │ Management  │  │ Management  │
└─────────────┘  └─────────────┘  └──────┬──────┘
                                          │
                                          │ Blocks if incomplete
                                          ▼
                                  ┌─────────────┐
                                  │   Payroll   │
                                  │  Transfer   │
                                  └─────────────┘
```

---

## 7. Data Flow Architecture

### 7.1 Request-Response Flow

**Typical User Action Flow**:
```
1. User interacts with Frontend UI
   ↓
2. Frontend validates input (UX only)
   ↓
3. Frontend sends API request to Backend
   ↓
4. Backend authenticates request (validates JWT)
   ↓
5. Backend authorizes action (checks role permissions)
   ↓
6. Backend validates business rules
   ↓
7. Backend processes request (updates database)
   ↓
8. Backend returns response to Frontend
   ↓
9. Frontend updates UI based on response
```

### 7.2 Authentication Flow
```
1. User submits credentials (Frontend)
   ↓
2. Backend validates credentials
   ↓
3. Backend generates JWT token
   ↓
4. Frontend stores token
   ↓
5. Frontend includes token in all subsequent requests
   ↓
6. Backend validates token on each request
```

### 7.3 Approval Workflow Flow
```
1. Employee submits request (Frontend → Backend)
   ↓
2. Backend validates and stores request
   ↓
3. Backend notifies approver
   ↓
4. Approver views request (Frontend ← Backend)
   ↓
5. Approver approves/rejects (Frontend → Backend)
   ↓
6. Backend validates approver authority
   ↓
7. Backend updates request state
   ↓
8. Backend notifies employee
   ↓
9. Frontend reflects updated state
```

---

## 8. Development Phases

### 8.1 Phase 1: Frontend Implementation
**Timeline**: Weeks 1-10
**Objective**: Build complete frontend application with mock API

**Deliverables**:
- Complete UI for all modules
- Client-side routing
- State management
- Mock API integration
- Responsive design
- Accessibility compliance

**Completion Criteria**:
- All pages and components implemented
- All workflows navigable
- Mock data demonstrates all features
- UI/UX polished and tested
- Documentation complete

### 8.2 Phase 2: Backend Implementation
**Timeline**: After frontend completion
**Objective**: Build backend API and database

**Deliverables**:
- RESTful API endpoints
- Database schema
- Business logic implementation
- Authentication and authorization
- Data validation
- API documentation

**Completion Criteria**:
- All API endpoints implemented
- Business rules enforced
- Security measures in place
- Database optimized
- API tested and documented

### 8.3 Phase 3: Integration
**Timeline**: After backend completion
**Objective**: Connect frontend to backend and test

**Deliverables**:
- Frontend-backend integration
- End-to-end testing
- Bug fixes
- Performance optimization
- Deployment preparation

**Completion Criteria**:
- All workflows functional
- All tests passing
- System deployed to staging
- User acceptance testing complete
- Production deployment ready

---

## 9. Non-Functional Requirements

### 9.1 Performance
- Page load time: < 3 seconds
- API response time: < 500ms for most requests
- Support concurrent users: 100+ simultaneous users

### 9.2 Security
- HTTPS encryption for all communication
- JWT-based authentication
- Role-based authorization
- Input validation and sanitization
- Protection against common vulnerabilities (XSS, CSRF, SQL injection)

### 9.3 Usability
- Intuitive navigation
- Responsive design (desktop, tablet, mobile)
- Accessibility (WCAG 2.1 AA compliance)
- Clear error messages
- Consistent UI patterns

### 9.4 Reliability
- System uptime: 99% during business hours
- Data backup and recovery
- Error logging and monitoring
- Graceful error handling

### 9.5 Maintainability
- Clean, documented code
- Modular architecture
- Comprehensive testing
- Version control
- Deployment automation

---

## 10. Deployment Architecture

### 10.1 Deployment Environment
**Network**: University intranet (internal network)

**Infrastructure**:
```
┌─────────────────────────────────────────────────────────┐
│                   University Network                     │
│                                                          │
│  ┌────────────┐      ┌────────────┐      ┌──────────┐  │
│  │   Client   │─────▶│   Web      │─────▶│ Database │  │
│  │  Browsers  │      │   Server   │      │  Server  │  │
│  └────────────┘      └────────────┘      └──────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Components**:
- **Web Server**: Hosts frontend static files and backend API
- **Database Server**: Stores all application data
- **Client Browsers**: University employee workstations

### 10.2 Environment Separation
- **Development**: Local development environment
- **Testing**: Staging server for testing
- **Production**: Live university intranet deployment

---

## 11. Success Criteria

### 11.1 Technical Success
- System meets all functional requirements
- All use cases implemented and tested
- Performance targets achieved
- Security requirements satisfied
- Code quality standards met

### 11.2 Academic Success
- Project defense successfully completed
- Documentation comprehensive and professional
- System demonstrates technical competence
- Project meets BSc final year standards

### 11.3 Deployment Success
- System deployed to university intranet
- Users trained and onboarded
- System accepted by HR department
- Positive user feedback

---

**END OF ARCHITECTURE PLAN**

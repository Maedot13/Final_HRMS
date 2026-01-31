# HRMS Frontend Development Plan (Phase 1)
## Bahir Dar University – Final Year Project

---

## 1. Frontend Plan Overview

### 1.1 Phase 1 Context
This document defines **Phase 1** of the HRMS project: **Frontend Implementation**.

**Timeline**: Weeks 1-10 (to be implemented FIRST, before backend)

**Objective**: Build a complete, production-ready frontend application that demonstrates all system features using mock data.

### 1.2 Frontend Goals
1. Implement all user interfaces for all modules
2. Create intuitive, accessible, and responsive UI
3. Demonstrate all workflows with mock data
4. Prepare for seamless backend integration
5. Deliver academically defensible frontend architecture

### 1.3 Frontend Scope
**In Scope**:
- All UI pages and components
- Client-side routing and navigation
- Form input collection and client-side validation (UX only)
- State management for UI display
- Mock API integration
- Responsive design
- Accessibility features

**Out of Scope**:
- Business logic enforcement (backend responsibility)
- Data persistence (backend responsibility)
- Authorization decisions (backend responsibility)
- Real API implementation (Phase 2)

---

## 2. Frontend Responsibilities and Limitations

### 2.1 Frontend Responsibilities

**User Interface Presentation**:
- Display data received from API (mock or real)
- Provide intuitive navigation
- Render appropriate UI based on user role
- Show loading states during data fetching
- Display error messages from backend

**User Experience Optimization**:
- Client-side validation for immediate feedback (UX only, not security)
- Disable invalid actions (e.g., submit button when form incomplete)
- Show helpful warnings (e.g., insufficient leave balance)
- Provide visual feedback for user actions
- Optimize performance and responsiveness

**Data Collection**:
- Collect user input through forms
- Validate format (e.g., email format, date format)
- Submit data to backend API
- Handle API responses

**State Management**:
- Manage UI display state (modals, dropdowns, etc.)
- Cache API responses for performance
- Manage authentication state (token storage)
- Synchronize UI with backend state

### 2.2 Frontend Limitations

> [!IMPORTANT]
> **Critical Principle**: The frontend does NOT enforce business rules or make authorization decisions.

**Frontend CANNOT**:
- Enforce business rules (e.g., sabbatical eligibility)
- Make authorization decisions (e.g., who can approve)
- Validate leave balance (beyond showing warnings)
- Control workflow state transitions
- Persist data
- Override backend decisions

**Frontend MUST**:
- Trust backend responses
- Reflect backend state accurately
- Submit all actions to backend for validation
- Display backend error messages
- Respect backend authorization decisions

### 2.3 Client-Side Validation Strategy

**Purpose**: Improve user experience, NOT security

**Validation Types**:
1. **Format Validation**: Email format, phone format, date format
2. **Required Field Validation**: Ensure fields are not empty
3. **Range Validation**: Date ranges, numeric ranges
4. **Pattern Validation**: Password strength, employee ID format

**Important Notes**:
- All client-side validation is for UX only
- Backend MUST re-validate all inputs
- Frontend validation can be bypassed (by design)
- Frontend shows warnings, backend enforces rules

**Example**:
```javascript
// Frontend: Show warning if leave balance insufficient
if (requestedDays > availableBalance) {
  showWarning("Insufficient leave balance");
  disableSubmitButton(); // UX optimization
}
// Backend: Enforce rule and reject if insufficient
```

---

## 3. Frontend Technology Stack

### 3.1 Core Technologies
- **React**: 18.x with TypeScript
- **React Router**: 6.x for routing
- **State Management**: React Context API (with option to migrate to Redux Toolkit if needed)

### 3.2 UI Framework
**Recommended**: Material-UI (MUI) or Ant Design

**Alternative**: Custom components with Tailwind CSS

**Rationale**: Pre-built components accelerate development and ensure consistency

### 3.3 HTTP Client
- **Axios**: For API communication with interceptors

### 3.4 Form Management
- **React Hook Form**: Efficient form state management
- **Yup**: Schema-based validation

### 3.5 Additional Libraries
- **date-fns** or **Day.js**: Date manipulation
- **react-dropzone**: File upload UI
- **react-toastify** or **notistack**: Toast notifications
- **React Icons**: Icon library

### 3.6 Development Tools
- **Build Tool**: Vite (recommended) or Create React App
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest, React Testing Library, Cypress (E2E)
- **Version Control**: Git

---

## 4. Frontend Modules and Pages

### 4.1 Module 1: Authentication & Authorization

**Components**:
- `LoginPage`: Login form with email/password
- `RegisterPage`: Employee registration form
- `ForgotPasswordPage`: Password recovery UI (UI only)
- `AuthProvider`: Context for authentication state
- `ProtectedRoute`: Route guard component
- `RoleGuard`: Role-based component visibility

**Features**:
- Email/username + password authentication
- Role-based dashboard routing after login
- Session management (token storage)
- Logout functionality
- "Remember me" option
- Password recovery link (UI only, no email sent)

**Routes**:
- `/login` → LoginPage
- `/register` → RegisterPage
- `/forgot-password` → ForgotPasswordPage

**Mock API Behavior**:
- Accept any credentials for testing
- Return mock user with specified role
- Generate mock JWT token

---

### 4.2 Module 2: Dashboard System

**Components**:
- `EmployeeDashboard`: Employee overview and quick actions
- `HROfficerDashboard`: HR metrics and pending tasks
- `DepartmentHeadDashboard`: Approval queue and team overview
- `FinanceOfficerDashboard`: Payroll transfer view
- `RecruitmentDashboard`: Application review queue
- `AdminDashboard`: System management overview

**Features**:
- Role-specific widgets and metrics
- Quick action buttons (e.g., "Submit Leave Request")
- Pending approvals count
- Recent notifications preview
- Leave balance display (for employees)
- Statistics cards with mock data

**Routes**:
- `/employee/dashboard` → EmployeeDashboard
- `/hr/dashboard` → HROfficerDashboard
- `/dept-head/dashboard` → DepartmentHeadDashboard
- `/finance/dashboard` → FinanceOfficerDashboard
- `/recruitment/dashboard` → RecruitmentDashboard
- `/admin/dashboard` → AdminDashboard

---

### 4.3 Module 3: Employee Profile Management

**Components**:
- `ProfilePage`: View/edit personal information
- `ProfileForm`: Editable form fields
- `EmployeeRecordsList`: HR view of all employees (HRO only)
- `EmployeeDetailView`: Detailed employee record (HRO only)

**Features**:
- Update contact information
- Update emergency contacts
- Upload profile photo
- View employment history (read-only)
- View service years (read-only)
- HR can view/edit all employee records

**Routes**:
- `/employee/profile` → ProfilePage (Employee view)
- `/hr/employees` → EmployeeRecordsList (HR view)
- `/hr/employees/:id` → EmployeeDetailView (HR view)

---

### 4.4 Module 4: Leave Management

**Components**:
- `LeaveRequestForm`: Submit new leave request
- `LeaveRequestsList`: View submitted requests
- `LeaveApprovalQueue`: Department Head approval interface
- `LeaveBalanceCard`: Display leave balances
- `LeaveHistoryTable`: Past leave records
- `LeaveStatusBadge`: Status indicator component

**Features**:
- Select leave type (annual, sick, maternity, paternity, unpaid)
- Date range picker
- Reason text area
- Attachment upload
- Real-time balance display (from mock API)
- Approval/rejection interface with comments
- Status tracking (Draft, Submitted, Approved, Rejected)

**Client-Side Validation**:
- Disable submit if balance insufficient (UX warning)
- Show warning for overlapping dates
- Require reason field
- Validate date range (start before end)

**Routes**:
- `/employee/leave/request` → LeaveRequestForm
- `/employee/leave/history` → LeaveRequestsList
- `/dept-head/leave/approvals` → LeaveApprovalQueue

**Mock API Behavior**:
- Return mock leave balance
- Accept leave requests
- Update status on approval/rejection
- Trigger mock notifications

---

### 4.5 Module 5: Sabbatical Leave Management

**Components**:
- `SabbaticalRequestForm`: Submit sabbatical request
- `SabbaticalEligibilityChecker`: Display eligibility status
- `SabbaticalApprovalQueue`: Department Head approval interface
- `SabbaticalRequestsList`: View sabbatical requests
- `SabbaticalEligibilityCard`: Eligibility display component

**Features**:
- Eligibility check display (≥ 7 years service)
- Sabbatical purpose selection
- Duration picker (max 1 year)
- Research/study plan upload
- Approval workflow
- Status tracking

**Client-Side Behavior**:
- Display eligibility status prominently
- Show service years clearly
- Disable form if not eligible (based on mock API response)
- Show helpful message if ineligible

**Routes**:
- `/employee/sabbatical/request` → SabbaticalRequestForm
- `/employee/sabbatical/history` → SabbaticalRequestsList
- `/hr/sabbatical/verify` → SabbaticalEligibilityChecker (HR view)
- `/dept-head/sabbatical/approvals` → SabbaticalApprovalQueue

**Mock API Behavior**:
- Return eligibility status based on service years
- Accept sabbatical requests if eligible
- Reject if not eligible (backend rule simulation)

---

### 4.6 Module 6: Employee Clearance Management

**Components**:
- `ClearanceRequestForm`: Initiate clearance request
- `ClearanceStatusTracker`: Visual progress indicator
- `ClearanceApprovalInterface`: Department-specific approval
- `ClearanceDepartmentChecklist`: Multi-department status display
- `ClearanceProgressTracker`: Visual progress bar

**Features**:
- Reason for clearance (resignation, transfer, retirement, other)
- Multi-department approval tracking
- Department-wise status (Pending, Approved, Rejected)
- Comments from each department
- Overall clearance status
- Download clearance certificate (when complete)

**Departments Requiring Approval**:
1. HR Department
2. Finance Department
3. IT Department
4. Library
5. Department Head

**Client-Side Display**:
- Visual progress tracker (5 departments)
- Color-coded status per department:
  - Pending: Yellow
  - Approved: Green
  - Rejected: Red
- Clearance completion percentage
- Show which departments are pending

**Routes**:
- `/employee/clearance/request` → ClearanceRequestForm
- `/employee/clearance/status` → ClearanceStatusTracker
- `/hr/clearance/process` → ClearanceApprovalInterface (HR view)
- `/dept-head/clearance/approvals` → ClearanceApprovalInterface (DH view)

---

### 4.7 Module 7: Payroll Name Transfer

**Components**:
- `PayrollTransferForm`: HR initiates transfer (HRO only)
- `PayrollTransferList`: Finance views transfers (FO view)
- `PayrollTransferStatus`: Track transfer status

**Features**:
- Select employee (with clearance validation)
- Transfer reason
- Effective date
- Send to Finance
- Finance acknowledgment view
- Transfer history

**Client-Side Validation**:
- Only show employees with complete clearance in dropdown
- Disable transfer button if clearance incomplete
- Show clearance status for selected employee

**Routes**:
- `/hr/payroll/transfer` → PayrollTransferForm (HR view)
- `/hr/payroll/history` → PayrollTransferList (HR view)
- `/finance/payroll/transfers` → PayrollTransferList (Finance read-only view)

**Mock API Behavior**:
- Return list of employees with clearance status
- Filter employees with complete clearance
- Accept transfer requests
- Notify Finance Officer

---

### 4.8 Module 8: Internal Recruitment

**Components**:
- `JobPostingForm`: Create job posting (HRO only)
- `JobPostingsList`: View all postings
- `JobPostingDetail`: View job details
- `JobApplicationForm`: Apply for job (EMP only)
- `ApplicationReviewInterface`: Review applications (RC only)
- `ApplicationsList`: Track own applications (EMP)
- `JobPostingCard`: Job posting display card
- `ApplicationCard`: Application display card

**Features**:
- Job title, description, requirements
- Application deadline
- Department/position details
- Application form with CV upload
- Cover letter text area
- Application status tracking
- Shortlisting interface
- Interview scheduling (UI only)

**Workflow**:
1. HR posts job
2. Employees view and apply
3. Recruitment Committee reviews applications
4. Status updates (Submitted, Under Review, Shortlisted, Rejected)

**Client-Side Validation**:
- Disable "Apply" button if deadline passed
- Show application deadline countdown
- Validate CV file upload
- Require cover letter

**Routes**:
- `/hr/jobs/create` → JobPostingForm (HR)
- `/hr/jobs/manage` → JobPostingsList (HR with edit)
- `/employee/jobs` → JobPostingsList (Employee view)
- `/employee/jobs/:id` → JobPostingDetail
- `/employee/jobs/:id/apply` → JobApplicationForm
- `/employee/applications` → ApplicationsList
- `/recruitment/applications` → ApplicationReviewInterface (RC)

---

### 4.9 Module 9: Notifications & Alerts

**Components**:
- `NotificationBell`: Header notification icon with badge
- `NotificationDropdown`: Recent notifications list
- `NotificationCenter`: Full notifications page
- `NotificationItem`: Individual notification card
- `NotificationFilter`: Filter notifications by type

**Features**:
- Real-time notification badge (unread count)
- Notification types:
  - Leave approved/rejected
  - Sabbatical approved/rejected
  - Clearance department approval
  - Payroll transfer completed
  - New job posting
  - Application status change
- Mark as read/unread
- Notification filtering
- Click to navigate to related item
- Auto-refresh (simulated with mock data)

**Routes**:
- `/notifications` → NotificationCenter (all roles)

**Mock API Behavior**:
- Generate mock notifications based on actions
- Update unread count
- Mark notifications as read

---

### 4.10 Module 10: Reports & Records

**Components**:
- `ReportsPage`: Generate HR reports (HRO only)
- `RecordViewer`: View employee records
- `ReportFilters`: Date range, department, type filters
- `ReportExport`: Export to PDF/Excel (UI button)

**Report Types**:
- Leave summary report
- Sabbatical requests report
- Clearance status report
- Recruitment report
- Employee directory

**Features**:
- Filter by date range
- Filter by department
- Filter by status
- Preview report
- Export button (triggers download of mock data)

**Routes**:
- `/hr/reports` → ReportsPage (HR only)

---

### 4.11 Module 11: User & Role Management

**Components**:
- `UserManagementPage`: List all users (ADM only)
- `UserForm`: Create/edit user
- `RoleAssignment`: Assign/change roles
- `UserStatusToggle`: Activate/deactivate users

**Features**:
- Create new user accounts
- Assign roles
- Deactivate users
- Reset passwords (trigger email UI)
- View user activity log

**Routes**:
- `/admin/users` → UserManagementPage
- `/admin/users/create` → UserForm
- `/admin/users/:id/edit` → UserForm

---

## 5. UI Component Architecture

### 5.1 Component Hierarchy

```
App
├── AuthProvider
│   ├── Router
│   │   ├── PublicLayout
│   │   │   ├── LoginPage
│   │   │   ├── RegisterPage
│   │   │   └── ForgotPasswordPage
│   │   │
│   │   └── ProtectedLayout
│   │       ├── Header
│   │       │   ├── Logo
│   │       │   ├── NavigationMenu
│   │       │   ├── NotificationBell
│   │       │   └── UserMenu
│   │       │
│   │       ├── Sidebar (role-specific)
│   │       │   └── NavigationLinks
│   │       │
│   │       ├── MainContent
│   │       │   └── [Role-specific pages]
│   │       │
│   │       └── Footer
│   │
│   └── NotificationProvider
```

### 5.2 Shared Components

**Layout Components**:
- `Header`, `Sidebar`, `Footer`, `PageContainer`, `Card`, `Modal`, `Drawer`

**Form Components**:
- `Input`, `TextArea`, `Select`, `DatePicker`, `DateRangePicker`, `FileUpload`, `Checkbox`, `Radio`, `FormGroup`, `FormError`

**Data Display Components**:
- `Table`, `Pagination`, `Badge`, `Tag`, `Avatar`, `ProgressBar`, `StatusIndicator`, `EmptyState`

**Feedback Components**:
- `Alert`, `Toast`, `ConfirmDialog`, `LoadingSpinner`, `Skeleton`

**Navigation Components**:
- `Breadcrumb`, `Tabs`, `Stepper`

**Action Components**:
- `Button`, `IconButton`, `DropdownMenu`, `Tooltip`

---

## 6. State Management Strategy

### 6.1 Context Providers

**AuthContext**:
- Current user data
- User role
- Authentication status
- Login/logout functions
- Token management

**NotificationContext**:
- Notifications array
- Unread count
- Mark as read function
- Fetch notifications function

**ThemeContext** (optional):
- Theme mode (light/dark)
- Toggle theme function

### 6.2 Custom Hooks

```javascript
// useAuth: Access authentication state
const { user, role, isAuthenticated, login, logout } = useAuth();

// useNotifications: Access notifications
const { notifications, unreadCount, markAsRead } = useNotifications();

// usePermissions: Check role-based permissions
const { canApproveLeave, canManageUsers } = usePermissions(role);

// useLeaveBalance: Fetch leave balance
const { balance, loading, error, refreshBalance } = useLeaveBalance(employeeId);

// useSabbaticalEligibility: Check eligibility
const { isEligible, serviceYears, loading } = useSabbaticalEligibility(employeeId);

// useClearanceStatus: Track clearance status
const { departments, isComplete, loading } = useClearanceStatus(clearanceId);
```

---

## 7. Mock API Strategy

### 7.1 Mock API Purpose
During Phase 1, the frontend uses **mock API** to simulate backend responses.

**Benefits**:
- Independent frontend development
- Demonstrate all features without backend
- Test UI workflows
- Prepare for real API integration

### 7.2 Mock API Implementation

**Option 1: Mock Service Worker (MSW)**
- Intercept API requests
- Return mock responses
- Simulate network delays
- Simulate errors

**Option 2: Mock Service Functions**
- Create mock service functions
- Return promises with mock data
- Easy to replace with real API calls

**Recommended**: Mock Service Worker (MSW) for realistic simulation

### 7.3 Mock Data Requirements

**Mock data must include**:
- Users with different roles
- Leave requests in various states
- Sabbatical requests (eligible and ineligible employees)
- Clearance requests with multi-department statuses
- Job postings and applications
- Notifications
- Employee records

### 7.4 Transition to Real API

**Phase 3 Integration**:
1. Remove mock API interceptors
2. Update API base URL to backend server
3. Test all endpoints
4. Handle real error responses
5. Adjust UI based on real data

---

## 8. UI/UX Design Guidelines

### 8.1 Design Principles
1. **Clarity**: Clear labels, intuitive navigation
2. **Consistency**: Uniform components, predictable behavior
3. **Efficiency**: Minimize clicks, provide shortcuts
4. **Feedback**: Loading states, success/error messages
5. **Accessibility**: WCAG 2.1 AA compliance

### 8.2 Color Scheme

**Primary Colors**:
- Primary: #1976D2 (Blue)
- Secondary: #424242 (Dark Gray)
- Accent: #FF6F00 (Orange)

**Status Colors**:
- Success: #4CAF50 (Green)
- Warning: #FFC107 (Amber)
- Error: #F44336 (Red)
- Info: #2196F3 (Light Blue)

### 8.3 Typography
- **Font Family**: 'Roboto', sans-serif
- **Font Sizes**: H1 (32px), H2 (24px), H3 (20px), Body (16px), Small (14px)

### 8.4 Responsive Design

**Breakpoints**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adaptations**:
- Sidebar collapses to hamburger menu
- Tables convert to cards
- Touch-friendly button sizes (min 44px)

### 8.5 Accessibility
- Keyboard navigation support
- Screen reader support (ARIA labels)
- Color contrast compliance (4.5:1 ratio)
- Form accessibility (labels, error announcements)

---

## 9. Frontend Completion Criteria

### 9.1 Functional Completeness
- [ ] All pages implemented for all roles
- [ ] All workflows navigable end-to-end
- [ ] All forms functional with validation
- [ ] All mock API integrations working
- [ ] Role-based access control implemented (UI level)

### 9.2 Quality Standards
- [ ] Responsive design tested on mobile, tablet, desktop
- [ ] Accessibility tested (keyboard, screen reader)
- [ ] Loading states implemented for all async operations
- [ ] Error handling implemented for all API calls
- [ ] Empty states designed for all data displays

### 9.3 Code Quality
- [ ] TypeScript types defined for all data structures
- [ ] Components properly organized and modular
- [ ] Code follows ESLint and Prettier rules
- [ ] No console errors or warnings
- [ ] Performance optimized (code splitting, lazy loading)

### 9.4 Documentation
- [ ] README with setup instructions
- [ ] Component documentation
- [ ] Mock API documentation
- [ ] Deployment guide

### 9.5 Testing
- [ ] Unit tests for utility functions
- [ ] Component tests for key components
- [ ] Integration tests for workflows
- [ ] E2E tests for critical user journeys

---

## 10. Frontend Implementation Roadmap

### Week 1: Project Setup & Foundation
- Initialize React project with TypeScript
- Install dependencies
- Set up folder structure
- Configure ESLint and Prettier
- Create design system (theme, shared components)
- Set up routing structure
- Implement authentication foundation

### Week 2: Core Modules
- Build dashboard system (all roles)
- Implement employee profile management
- Create notification system

### Week 3-4: Leave & Sabbatical Management
- Build leave management module
- Implement sabbatical management module
- Create approval interfaces

### Week 5: Clearance & Payroll
- Build clearance management module
- Implement payroll transfer module

### Week 6: Recruitment Module
- Build job posting features
- Implement job application features
- Create application review interface

### Week 7: Reports & Admin
- Build reports module
- Implement user management (admin)

### Week 8: Mock API Integration
- Set up Mock Service Worker
- Create mock data
- Connect all components to mock API
- Test all workflows

### Week 9: Polish & Optimization
- UI/UX refinement
- Responsive design testing
- Accessibility improvements
- Performance optimization

### Week 10: Testing & Documentation
- Unit testing
- Integration testing
- E2E testing
- Documentation
- Frontend completion review

---

## 11. Frontend-Specific Risks

### 11.1 Risk: Mock API Divergence
**Description**: Mock API behavior differs from real backend

**Mitigation**:
- Define API contract early (see api-contract.md)
- Keep mock API aligned with contract
- Regular communication with backend team

### 11.2 Risk: State Management Complexity
**Description**: Complex state becomes difficult to manage

**Mitigation**:
- Start with Context API
- Migrate to Redux Toolkit if needed
- Keep state structure simple

### 11.3 Risk: Performance Issues
**Description**: Large data sets cause slow rendering

**Mitigation**:
- Implement pagination
- Use virtualization for long lists
- Lazy load routes and components

---

**END OF FRONTEND PLAN**

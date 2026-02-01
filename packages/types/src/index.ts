// User Roles
export enum UserRole {
    ADMIN = 'ADMIN',
    HR_OFFICER = 'HR_OFFICER',
    DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
    FINANCE_OFFICER = 'FINANCE_OFFICER',
    RECRUITMENT_COMMITTEE = 'RECRUITMENT_COMMITTEE',
    EMPLOYEE = 'EMPLOYEE'
}

// User Interface
export interface User {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    employeeId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// Auth DTOs
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    employeeId: string;
    department: string;
    role?: UserRole; // Optional, defaults to EMPLOYEE usually, but handy for seeding
}

export interface AuthResponse {
    token: string;
    refreshToken?: string;
    user: User;
}

// Employee Interface
export interface Employee {
    id: number;
    userId: number;
    employeeId: string;
    name: string;
    department: string;
    position: string;
    hireDate: string;
    serviceYears: number;
    contactInfo: {
        phone: string;
        address: string;
        emergencyContact: string;
    };
}

// Leave Types
export enum LeaveType {
    ANNUAL = 'ANNUAL',
    SICK = 'SICK',
    MATERNITY = 'MATERNITY',
    PATERNITY = 'PATERNITY',
    UNPAID = 'UNPAID'
}

// Leave Status
export enum LeaveStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED'
}

// Leave Request Interface
export interface LeaveRequest {
    id: number;
    employeeId: number;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    attachmentUrl?: string;
    status: LeaveStatus;
    approverId?: number;
    approverComment?: string;
    createdAt: string;
    updatedAt: string;
}

// Leave Balance Interface
export interface LeaveBalance {
    id: number;
    employeeId: number;
    year: number;
    annualBalance: number;
    sickBalance: number;
    maternityBalance: number;
    paternityBalance: number;
}

// Sabbatical Request Interface
export interface SabbaticalRequest {
    id: number;
    employeeId: number;
    purpose: string;
    startDate: string;
    endDate: string;
    durationMonths: number;
    plan: string;
    planDocumentUrl?: string;
    status: LeaveStatus;
    approverId?: number;
    approverComment?: string;
    createdAt: string;
    updatedAt: string;
}

// Clearance Status
export enum ClearanceStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

// Clearance Department Interface
export interface ClearanceDepartment {
    id: number;
    clearanceId: number;
    department: string; // HR, FINANCE, IT, LIBRARY, DEPT_HEAD
    status: ClearanceStatus;
    approverId?: number;
    approvedAt?: string;
    comment?: string;
}

// Clearance Request Interface
export interface ClearanceRequest {
    id: number;
    employeeId: number;
    reason: string;
    lastWorkingDay: string;
    status: ClearanceStatus; // Overall status
    departments?: ClearanceDepartment[];
    createdAt: string;
    updatedAt: string;
}

// Payroll Transfer Interface
export interface PayrollTransfer {
    id: number;
    employeeId: number;
    clearanceId: number;
    reason: string;
    effectiveDate: string;
    status: string; // e.g., SENT_TO_FINANCE
    createdBy: number;
    createdAt: string;
}

// Job Posting Interface
export interface JobPosting {
    id: number;
    title: string;
    description: string;
    requirements: string;
    department: string;
    position: string;
    deadline: string;
    status: 'OPEN' | 'CLOSED';
    createdBy: number;
    createdAt: string;
}

// Job Application Interface
export interface JobApplication {
    id: number;
    jobPostingId: number;
    employeeId: number;
    coverLetter: string;
    cvUrl: string;
    status: 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED';
    reviewedBy?: number;
    reviewComment?: string;
    createdAt: string;
    updatedAt: string;
}

// Notification Interface
export interface Notification {
    id: number;
    userId: number;
    type: string;
    title: string;
    message: string;
    relatedId?: number;
    relatedType?: string;
    isRead: boolean;
    createdAt: string;
}

// API Response Wrappers
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface ApiError {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

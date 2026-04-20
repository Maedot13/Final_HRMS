export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HEAD_HR' | 'HR_OFFICER' | 'DEPARTMENT_HEAD' | 'FINANCE_OFFICER' | 'RECRUITMENT_COMMITTEE' | 'EMPLOYEE';

export interface User {
    id: number;
    email: string;
    role: UserRole;
    isActive: boolean;
    mustChangePassword?: boolean;
    campusId?: string;
    employee?: Employee;
}

export interface Employee {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
    departmentId?: number;
    hireDate?: string;
    grossSalary?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page?: number;
        limit?: number;
        total?: number;
        pages?: number;
        nextCursor?: string;
        hasMore?: boolean;
        count?: number;
    };
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown> | { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    timestamp?: string;
    requestId?: string;
}

export interface Campus {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    isActive: boolean;
    timezone?: string | null;
    employeeIdPrefix: string;
    employeeNumericLength: number;
    _count?: { users: number; employees: number };
}

export interface CampusReadiness {
    isReady: boolean;
    missingCampusRoles: string[];
    deptsWithoutHead: string[];
}

export interface Department {
    id: number;
    name: string;
    headEmployeeId?: number | null;
    head?: { name: string; employeeId: string; position?: string } | null;
    _count?: { employees: number };
}

export interface CampusUser {
    id: number;
    employeeId: string;
    email: string;
    role: string;
    employee?: { name: string; deptLegacy?: string };
}

/** User list item from GET /users */
export interface UserListItem {
    id: number;
    employeeId: string;
    email: string;
    role: string;
    isActive: boolean;
    mustChangePassword?: boolean;
    campusId?: number | null;
    employee?: {
        id: number;
        name: string;
        department?: string;
        deptLegacy?: string;
        position?: string;
    };
}

/** Full user detail from GET /users/:id */
export interface UserDetail extends Omit<UserListItem, 'employee'> {
    employee?: EmployeeDetail | null;
}

/** Employee detail from GET /employees/:id */
export interface EmployeeDetail {
    id: number;
    userId: number;
    employeeId: string;
    name: string;
    deptLegacy?: string;
    department?: string;
    departmentId?: number | null;
    position: string;
    hireDate: string;
    serviceYears?: number;
    grossSalary?: number;
    salaryType?: string;
    contactInfo?: ContactInfo;
    officeLocation?: string | null;
    employmentStatus?: string;
    contractStartDate?: string | null;
    contractEndDate?: string | null;
    employmentType?: string;
    payGrade?: string | null;
    taxInformation?: Record<string, unknown> | null;
    supervisorId?: number | null;
    user?: { role: string; isActive: boolean; createdAt?: string };
    leaveBalances?: unknown[];
}

export interface ContactInfo {
    phone?: string;
    address?: string;
    emergencyContact?: string | { name: string; relationship: string; phone: string };
}

/** Payload for PATCH /employees/:id */
export interface EmployeeUpdatePayload {
    name?: string;
    departmentId?: number;
    position?: string;
    hireDate?: string;
    grossSalary?: number;
    salaryType?: string;
    contactInfo?: ContactInfo;
    officeLocation?: string;
    employmentStatus?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    employmentType?: string;
    payGrade?: string;
    supervisorId?: number;
}

export interface User {
    id: string;
    email: string;
    role: 'ADMIN' | 'HR_OFFICER' | 'DEPARTMENT_HEAD' | 'FINANCE_OFFICER' | 'RECRUITMENT_COMMITTEE' | 'EMPLOYEE';
    isActive: boolean;
    mustChangePassword?: boolean;
    campusId?: string;
    employee?: Employee;
}

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    departmentId?: string;
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

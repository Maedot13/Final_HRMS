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
    details?: Record<string, unknown>;
    timestamp?: string;
    requestId?: string;
}

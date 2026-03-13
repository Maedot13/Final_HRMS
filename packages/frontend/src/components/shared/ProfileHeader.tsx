import { Badge } from '../ui/Badge';
import type { EmployeeDetail, UserDetail } from '../../types';

interface ProfileHeaderProps {
    employee: EmployeeDetail;
    user?: Pick<UserDetail, 'role' | 'isActive' | 'email'> | null;
    showRole?: boolean;
}

const roleLabels: Record<string, string> = {
    ADMIN: 'Admin',
    HR_OFFICER: 'HR Officer',
    DEPARTMENT_HEAD: 'Department Head',
    FINANCE_OFFICER: 'Finance Officer',
    RECRUITMENT_COMMITTEE: 'Recruitment Committee',
    EMPLOYEE: 'Employee',
};

export function ProfileHeader({ employee, user, showRole = true }: ProfileHeaderProps) {
    const role = user?.role ?? employee.user?.role;
    const isActive = user?.isActive ?? employee.user?.isActive ?? true;

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                {employee.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold text-text-primary">{employee.name}</h1>
                <p className="mt-0.5 text-sm text-text-secondary">
                    {employee.employeeId}
                    {employee.position && ` · ${employee.position}`}
                </p>
                {employee.deptLegacy && (
                    <p className="mt-0.5 text-sm text-text-secondary">{employee.deptLegacy}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                    {showRole && role && (
                        <Badge variant="info">{roleLabels[role] ?? role}</Badge>
                    )}
                    <Badge variant={isActive ? 'approved' : 'rejected'}>
                        {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
                {user?.email && (
                    <p className="mt-2 text-sm text-text-secondary">{user.email}</p>
                )}
            </div>
        </div>
    );
}

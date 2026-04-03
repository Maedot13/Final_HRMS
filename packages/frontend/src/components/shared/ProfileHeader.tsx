import { Badge } from '../ui/Badge';
import type { EmployeeDetail, UserDetail } from '../../types';
import { FiMail, FiBriefcase } from 'react-icons/fi';

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
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Avatar Placeholder with ring */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary ring-4 ring-primary/5">
                {employee.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{employee.name}</h1>
                    <Badge variant={isActive ? 'approved' : 'rejected'}>
                        {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5 font-medium">
                        <FiBriefcase className="w-4 h-4 text-gray-400" />
                        <span>{employee.position || 'No Position'}</span>
                        <span className="mx-1 text-gray-300">·</span>
                        <span>{employee.deptLegacy || employee.department || 'N/A'}</span>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                    {showRole && role && (
                        <div className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {roleLabels[role] ?? role}
                        </div>
                    )}
                    {user?.email && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary transition-colors">
                            <FiMail className="w-4 h-4 text-gray-400" />
                            <a href={`mailto:${user.email}`}>{user.email}</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


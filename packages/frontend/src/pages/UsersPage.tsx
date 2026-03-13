import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import type { UserListItem } from '../types';
import { Card, CardHeader } from '../components/ui/Card';
import { DataTable, type Column } from '../components/shared/DataTable';
import { Badge } from '../components/ui/Badge';
import {
    ComplexFilterBar,
    type FilterState,
} from '../components/shared/ComplexFilterBar';

const defaultFilters: FilterState = { search: '', role: '', status: '' };

function filterUsers(users: UserListItem[], filters: FilterState): UserListItem[] {
    let result = users;
    if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        result = result.filter(
            (u) =>
                u.email?.toLowerCase().includes(q) ||
                u.employeeId.toLowerCase().includes(q) ||
                u.employee?.name?.toLowerCase().includes(q) ||
                (u.employee?.department ?? (u.employee as { deptLegacy?: string })?.deptLegacy ?? '')
                    .toLowerCase()
                    .includes(q)
        );
    }
    if (filters.role) {
        result = result.filter((u) => u.role === filters.role);
    }
    if (filters.status === 'active') {
        result = result.filter((u) => u.isActive);
    } else if (filters.status === 'inactive') {
        result = result.filter((u) => !u.isActive);
    }
    return result;
}

const roleLabels: Record<string, string> = {
    ADMIN: 'Admin',
    HR_OFFICER: 'HR Officer',
    DEPARTMENT_HEAD: 'Dept Head',
    FINANCE_OFFICER: 'Finance',
    RECRUITMENT_COMMITTEE: 'Recruitment',
    EMPLOYEE: 'Employee',
};

const columns: Column<UserListItem>[] = [
    {
        key: 'name',
        header: 'Name',
        render: (r) =>
            r.employee?.id ? (
                <Link
                    to={`/employees/${r.employee.id}`}
                    className="font-medium text-primary hover:underline"
                >
                    {r.employee.name}
                </Link>
            ) : (
                r.employee?.name ?? '—'
            ),
    },
    { key: 'employeeId', header: 'Employee ID', render: (r) => r.employeeId },
    { key: 'email', header: 'Email', render: (r) => r.email ?? '—' },
    {
        key: 'department',
        header: 'Department',
        render: (r) =>
            r.employee?.department ?? (r.employee as { deptLegacy?: string })?.deptLegacy ?? '—',
    },
    {
        key: 'role',
        header: 'Role',
        render: (r) => (
            <Badge variant="info">{roleLabels[r.role] ?? r.role}</Badge>
        ),
    },
    {
        key: 'status',
        header: 'Status',
        render: (r) => (
            <Badge variant={r.isActive ? 'approved' : 'rejected'}>
                {r.isActive ? 'Active' : 'Inactive'}
            </Badge>
        ),
    },
];

export default function UsersPage() {
    const [filters, setFilters] = useState<FilterState>(defaultFilters);

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await usersApi.list();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const filteredUsers = useMemo(
        () => filterUsers(users, filters),
        [users, filters]
    );

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Workforce directory"
                    subtitle="View and manage employees across your campus"
                />
            </Card>
            <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-card">
                <ComplexFilterBar filters={filters} onFiltersChange={setFilters} />
            </div>
            <DataTable
                columns={columns}
                data={filteredUsers}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage="No employees found. Adjust your filters or add users to get started."
            />
        </div>
    );
}

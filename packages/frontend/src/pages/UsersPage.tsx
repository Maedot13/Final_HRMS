import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import type { UserListItem } from '../types';
import { Card, CardHeader } from '../components/ui/Card';
import { DataTable, type Column } from '../components/shared/DataTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
    ComplexFilterBar,
    type FilterState,
} from '../components/shared/ComplexFilterBar';
import { useAuthStore } from '../store/useAuthStore';
import { RoleManagerModal } from '../features/employee/RoleManagerModal';
import { CreateEmployeeModal } from '../features/employee/CreateEmployeeModal';
import { departmentApi } from '../api/departments';
import { useQuery } from '@tanstack/react-query';

const defaultFilters: FilterState = { search: '', role: '', status: '' };

const roleLabels: Record<string, string> = {
    ADMIN: 'Admin',
    HR_OFFICER: 'HR Officer',
    DEPARTMENT_HEAD: 'Dept Head',
    FINANCE_OFFICER: 'Finance',
    RECRUITMENT_COMMITTEE: 'Recruitment',
    EMPLOYEE: 'Employee',
};

export default function UsersPage() {
    const [filters, setFilters] = useState<FilterState>(defaultFilters);
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const res = await departmentApi.list();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['users', filters],
        queryFn: async ({ pageParam }) => {
            const res = await usersApi.listPaginated({
                cursor: pageParam,
                limit: 20,
                search: filters.search.trim() || undefined,
                role: filters.role || undefined,
                status: filters.status || undefined,
            });
            return res.data;
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage?.pagination?.nextCursor,
    });

    const updateRoleMutation = useMutation({
        mutationFn: (role: string) => usersApi.updateRole(selectedUser!.id, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSelectedUser(null);
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: (isActive: boolean) =>
            usersApi.updateStatus(selectedUser!.id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSelectedUser(null);
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: () => usersApi.resetPassword(selectedUser!.id),
        onSuccess: () => {
            setSelectedUser(null);
        },
    });

    const users = useMemo(() => {
        return data?.pages.flatMap((page) => page.data) ?? [];
    }, [data]);

    const columns = useMemo(() => {
        const cols: Column<UserListItem>[] = [
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
                render: (r) => {
                    const dept = r.employee?.department;
                    const deptName = typeof dept === 'object' && dept !== null ? (dept as any).name : dept;
                    const legacy = (r.employee as { deptLegacy?: string })?.deptLegacy;
                    return deptName || legacy || '—';
                },
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

        if (user?.role === 'ADMIN') {
            cols.push({
                key: 'actions',
                header: 'Actions',
                render: (r) => (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedUser(r)}
                        disabled={String(r.id) === String(user.id)}
                    >
                        Manage
                    </Button>
                ),
            });
        }

        return cols;
    }, [user]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Workforce directory"
                    subtitle="View and manage employees across your campus"
                    action={
                        (user?.role === 'ADMIN' || user?.role === 'HR_OFFICER') ? (
                            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                                + Add Employee
                            </Button>
                        ) : undefined
                    }
                />
            </Card>
            <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-card">
                <ComplexFilterBar filters={filters} onFiltersChange={setFilters} departments={departments} />
            </div>
            <DataTable
                columns={columns}
                data={users}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage="No employees found. Adjust your filters or add users to get started."
            />
            {hasNextPage && (
                <div className="flex justify-center mt-4 pt-4 border-t border-gray-200">
                    <Button
                        variant="secondary"
                        onClick={() => fetchNextPage()}
                        isLoading={isFetchingNextPage}
                    >
                        Load more employees
                    </Button>
                </div>
            )}

            {selectedUser && (
                <RoleManagerModal
                    isOpen={!!selectedUser}
                    onClose={() => setSelectedUser(null)}
                    userName={selectedUser.employee?.name ?? selectedUser.email}
                    currentRole={selectedUser.role}
                    isActive={selectedUser.isActive}
                    onUpdateRole={(role) => updateRoleMutation.mutateAsync(role)}
                    onToggleStatus={(isActive) =>
                        updateStatusMutation.mutateAsync(isActive)
                    }
                    onResetPassword={() => resetPasswordMutation.mutateAsync()}
                />
            )}

            <CreateEmployeeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                departments={departments ?? []}
            />
        </div>
    );
}

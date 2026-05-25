import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { departmentApi } from '../api/departments';
import type { UserListItem } from '../types';
import { DataTable, type Column } from '../components/shared/DataTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ComplexFilterBar, type FilterState } from '../components/shared/ComplexFilterBar';
import { useAuthStore } from '../store/useAuthStore';
import { RoleManagerModal } from '../features/employee/RoleManagerModal';
import { CreateEmployeeModal } from '../features/employee/CreateEmployeeModal';
import { FiUsers, FiUserPlus, FiSearch } from 'react-icons/fi';

const defaultFilters: FilterState = { search: '', role: '', status: '' };

const roleLabels: Record<string, string> = {
    ADMIN: 'Admin',
    HR_OFFICER: 'HR Officer',
    DEPARTMENT_HEAD: 'Dept Head',
    FINANCE_OFFICER: 'Finance',
    RECRUITMENT_COMMITTEE: 'Recruitment',
    EMPLOYEE: 'Employee',
};

const roleVariant: Record<string, 'info' | 'approved' | 'rejected' | 'neutral' | 'warning'> = {
    ADMIN: 'rejected',
    HR_OFFICER: 'info',
    DEPARTMENT_HEAD: 'warning',
    FINANCE_OFFICER: 'approved',
    RECRUITMENT_COMMITTEE: 'neutral',
    EMPLOYEE: 'neutral',
};

export default function UsersPage() {
    const [filters, setFilters] = useState<FilterState>(defaultFilters);
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const res = await departmentApi.list();
            return res.data;
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
                department: (filters as any).department || undefined,
            });
            // Unwrap backend envelope
            const raw = res.data as any;
            if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.data) {
                return raw;
            }
            return res.data;
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => (lastPage as any)?.pagination?.nextCursor,
    });

    const updateRoleMutation = useMutation({
        mutationFn: (role: string) => usersApi.updateRole(selectedUser!.id, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSelectedUser(null);
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: (isActive: boolean) => usersApi.updateStatus(selectedUser!.id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setSelectedUser(null);
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: () => usersApi.resetPassword(selectedUser!.id),
        onSuccess: () => setSelectedUser(null),
    });

    const users = useMemo(() => {
        return data?.pages.flatMap((page) => (page as any).data ?? []) ?? [];
    }, [data]);

    const totalCount = (data?.pages[0] as any)?.pagination?.total ?? users.length;

    const canCreate = user?.role === 'ADMIN' || user?.role === 'HR_OFFICER' || user?.role === 'SUPER_ADMIN';
    const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const columns = useMemo<Column<UserListItem>[]>(() => {
        const cols: Column<UserListItem>[] = [
            {
                key: 'name',
                header: 'Employee',
                render: (r) =>
                    r.employee?.id ? (
                        <Link
                            to={`/employees/${r.employee.id}`}
                            className="flex items-center gap-2.5 group"
                        >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                <span className="text-xs font-bold text-primary">
                                    {(r.employee.name || '?')[0].toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm text-primary truncate group-hover:underline">
                                    {r.employee.name}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {r.employee.position || 'No position'}
                                </p>
                            </div>
                        </Link>
                    ) : (
                        <span className="text-gray-500 italic text-sm">{r.email}</span>
                    ),
            },
            {
                key: 'employeeId',
                header: 'Employee ID',
                render: (r) => <span className="font-mono text-xs text-gray-600">{r.employeeId}</span>,
            },
            { key: 'email', header: 'Email', render: (r) => <span className="text-sm text-gray-600">{r.email ?? '—'}</span> },
            {
                key: 'department',
                header: 'Department',
                render: (r) => {
                    const dept = r.employee?.department;
                    const deptName = typeof dept === 'object' && dept !== null ? (dept as any).name : dept;
                    const legacy = (r.employee as any)?.deptLegacy;
                    return <span className="text-sm">{deptName || legacy || <span className="italic text-amber-500 text-xs">Not assigned</span>}</span>;
                },
            },
            {
                key: 'role',
                header: 'Role',
                render: (r) => <Badge variant={roleVariant[r.role] ?? 'neutral'}>{roleLabels[r.role] ?? r.role}</Badge>,
            },
            {
                key: 'status',
                header: 'Status',
                render: (r) => <Badge variant={r.isActive ? 'approved' : 'rejected'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
            },
        ];

        cols.push({
            key: 'actions',
            header: 'Actions',
            render: (r) => (
                <div className="flex gap-1.5 align-middle">
                    {r.employee?.id && (user?.role === 'DEPARTMENT_HEAD' || user?.role === 'ADMIN') && (
                        <Link to={`/evaluations/new?employeeId=${r.employee?.id}`}>
                            <Button variant="secondary" size="sm">Evaluate</Button>
                        </Link>
                    )}
                    {r.employee?.id && (
                        <Link to={`/employees/${r.employee.id}`}>
                            <Button variant="secondary" size="sm" id={`view-emp-${r.id}`}>
                                View
                            </Button>
                        </Link>
                    )}
                    {canManage && (
                        <Button
                            variant="ghost"
                            size="sm"
                            id={`manage-role-${r.id}`}
                            onClick={() => setSelectedUser(r)}
                            disabled={String(r.id) === String(user?.id)}
                        >
                            Manage
                        </Button>
                    )}
                </div>
            ),
        });

        return cols;
    }, [canManage, user?.id]);

    return (
        <div className="space-y-5">

            {/* ── Page header ───────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FiUsers className="text-primary" size={22} /> Employees
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {isLoading ? 'Loading…' : `${totalCount} employee${totalCount !== 1 ? 's' : ''} in your campus`}
                    </p>
                </div>
                {canCreate && (
                    <Button
                        id="add-employee-btn"
                        variant="primary"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <FiUserPlus size={15} className="mr-1.5" />
                        Add Employee
                    </Button>
                )}
            </div>

            {/* ── Filter bar ────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
                <ComplexFilterBar filters={filters} onFiltersChange={setFilters} departments={departments} />
            </div>

            {/* ── Empty state ───────────────────────────────────────────────── */}
            {!isLoading && users.length === 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm py-16 flex flex-col items-center gap-3 text-gray-400">
                    <FiSearch size={36} className="opacity-30" />
                    <p className="text-sm font-medium">No employees found</p>
                    <p className="text-xs">Try adjusting your search or filters, or add a new employee.</p>
                    {canCreate && (
                        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)} className="mt-2">
                            <FiUserPlus size={13} className="mr-1" /> Add Employee
                        </Button>
                    )}
                </div>
            )}

            {/* ── Table ─────────────────────────────────────────────────────── */}
            {(isLoading || users.length > 0) && (
                <DataTable
                    columns={columns}
                    data={users}
                    isLoading={isLoading}
                    keyExtractor={(r) => String(r.id)}
                    emptyMessage="No employees found."
                />
            )}

            {/* ── Load more ─────────────────────────────────────────────────── */}
            {hasNextPage && (
                <div className="flex justify-center pt-2">
                    <Button
                        variant="secondary"
                        onClick={() => fetchNextPage()}
                        isLoading={isFetchingNextPage}
                    >
                        Load more employees
                    </Button>
                </div>
            )}

            {/* ── Modals ────────────────────────────────────────────────────── */}
            {selectedUser && (
                <RoleManagerModal
                    isOpen={!!selectedUser}
                    onClose={() => setSelectedUser(null)}
                    userName={selectedUser.employee?.name ?? selectedUser.email}
                    currentRole={selectedUser.role}
                    isActive={selectedUser.isActive}
                    onUpdateRole={(role) => updateRoleMutation.mutateAsync(role)}
                    onToggleStatus={(isActive) => updateStatusMutation.mutateAsync(isActive)}
                    onResetPassword={() => resetPasswordMutation.mutateAsync()}
                />
            )}

            <CreateEmployeeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                departments={departments}
            />
        </div>
    );
}

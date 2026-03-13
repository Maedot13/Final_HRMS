import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { departmentApi } from '../api/departments';
import type { Department, ApiError } from '../types';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/shared/DataTable';
import { Modal } from '../components/ui/Modal';
import { DepartmentForm } from '../features/department/DepartmentForm';

const columns: Column<Department>[] = [
    { key: 'name', header: 'Name', render: (r) => r.name },
    {
        key: 'head',
        header: 'Head',
        render: (r) => r.head ? `${r.head.name} (${r.head.employeeId})` : '—',
    },
    {
        key: 'employees',
        header: 'Employees',
        render: (r) => (r._count?.employees ?? 0).toString(),
    },
];

export default function DepartmentsPage() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const campusId = user?.campusId;
    const [createOpen, setCreateOpen] = useState(false);
    const [createError, setCreateError] = useState<ApiError | null>(null);

    const { data: departments = [], isLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const res = await departmentApi.list();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const createMutation = useMutation({
        mutationFn: departmentApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            setCreateOpen(false);
            setCreateError(null);
        },
        onError: (err: { response?: { data?: ApiError } }) => {
            setCreateError(err.response?.data ?? { code: 'ERROR', message: 'Failed to create department' });
        },
    });

    const handleCreate = async (data: { name: string; headEmployeeId?: string }) => {
        setCreateError(null);
        await createMutation.mutateAsync(data);
    };

    if (!campusId) {
        return (
            <div className="rounded-card border border-warning bg-amber-50 p-6 text-center">
                <p className="text-sm text-amber-800">
                    You need a campus assignment to manage departments. University admins can switch to a campus context.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Departments"
                    subtitle="Manage departments for your campus"
                    action={
                        <Button onClick={() => setCreateOpen(true)}>
                            Add department
                        </Button>
                    }
                />
            </Card>
            <DataTable
                columns={columns}
                data={departments}
                isLoading={isLoading}
                keyExtractor={(r) => r.id}
                emptyMessage="No departments yet. Create one to get started."
            />
            <Modal
                isOpen={createOpen}
                onClose={() => { setCreateOpen(false); setCreateError(null); }}
                title="Create department"
                size="md"
            >
                <DepartmentForm
                    campusId={campusId}
                    onSubmit={handleCreate}
                    onCancel={() => { setCreateOpen(false); setCreateError(null); }}
                    apiError={createError}
                />
            </Modal>
        </div>
    );
}

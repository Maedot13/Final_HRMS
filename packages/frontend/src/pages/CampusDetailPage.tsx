import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campusApi } from '../api/campuses';
import type { Campus, ApiError } from '../types';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ReadinessCheckCard } from '../components/shared/ReadinessCheckCard';
import { CampusUpdateForm } from '../features/campus/CampusUpdateForm';

export default function CampusDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const campusId = id ? parseInt(id, 10) : NaN;
    const [editOpen, setEditOpen] = useState(false);
    const [updateError, setUpdateError] = useState<ApiError | null>(null);

    const { data: campus, isLoading: campusLoading } = useQuery({
        queryKey: ['campus', campusId],
        queryFn: async () => {
            const res = await campusApi.getById(campusId);
            return res.data as Campus;
        },
        enabled: !isNaN(campusId),
    });

    const { data: readiness, isLoading: readinessLoading } = useQuery({
        queryKey: ['campus-readiness', campusId],
        queryFn: async () => {
            const res = await campusApi.getReadiness(campusId);
            return res.data;
        },
        enabled: !isNaN(campusId),
    });

    const updateMutation = useMutation({
        mutationFn: (data: Parameters<typeof campusApi.update>[1]) => campusApi.update(campusId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campus', campusId] });
            queryClient.invalidateQueries({ queryKey: ['campus-readiness', campusId] });
            queryClient.invalidateQueries({ queryKey: ['campuses'] });
            setEditOpen(false);
            setUpdateError(null);
        },
        onError: (err: { response?: { data?: ApiError } }) => {
            setUpdateError(err.response?.data ?? { code: 'ERROR', message: 'Update failed' });
        },
    });

    const handleUpdate = async (data: { name?: string; description?: string | null; isActive?: boolean }) => {
        setUpdateError(null);
        await updateMutation.mutateAsync(data);
    };

    if (isNaN(campusId) || (!campusLoading && !campus)) {
        return (
            <div className="text-center py-12">
                <p className="text-text-secondary">Campus not found.</p>
                <Button variant="secondary" className="mt-4" onClick={() => navigate('/campuses')}>
                    Back to campuses
                </Button>
            </div>
        );
    }

    if (campusLoading && !campus) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-32 animate-pulse rounded bg-gray-100" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/campuses')}>
                    ← Back
                </Button>
            </div>
            <Card>
                <CardHeader
                    title={campus!.name}
                    subtitle={`${campus!.code} · ${campus!.employeeIdPrefix}-xxxx (${campus!.employeeNumericLength} digits)`}
                    action={
                        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                            Edit
                        </Button>
                    }
                />
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                    <div>
                        <span className="text-xs font-medium text-text-secondary uppercase">Status</span>
                        <p className="mt-1"><Badge variant={campus!.isActive ? 'approved' : 'neutral'}>{campus!.isActive ? 'Active' : 'Inactive'}</Badge></p>
                    </div>
                    <div>
                        <span className="text-xs font-medium text-text-secondary uppercase">Timezone</span>
                        <p className="mt-1 text-sm text-text-primary">{campus!.timezone ?? '—'}</p>
                    </div>
                    {campus!.description && (
                        <div className="sm:col-span-2">
                            <span className="text-xs font-medium text-text-secondary uppercase">Description</span>
                            <p className="mt-1 text-sm text-text-primary">{campus!.description}</p>
                        </div>
                    )}
                    {campus!._count && (
                        <div className="sm:col-span-2 flex gap-6">
                            <div>
                                <span className="text-xs font-medium text-text-secondary uppercase">Users</span>
                                <p className="mt-1 text-sm font-medium">{campus!._count.users ?? 0}</p>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-text-secondary uppercase">Employees</span>
                                <p className="mt-1 text-sm font-medium">{campus!._count.employees ?? 0}</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
            <ReadinessCheckCard readiness={readiness ?? null} isLoading={readinessLoading} />
            <Modal isOpen={editOpen} onClose={() => { setEditOpen(false); setUpdateError(null); }} title="Edit campus" size="md">
                <CampusUpdateForm
                    initialValues={{
                        name: campus!.name,
                        description: campus!.description ?? null,
                        isActive: campus!.isActive,
                    }}
                    onSubmit={handleUpdate}
                    onCancel={() => { setEditOpen(false); setUpdateError(null); }}
                    apiError={updateError}
                />
            </Modal>
        </div>
    );
}

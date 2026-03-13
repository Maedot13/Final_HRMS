import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { campusApi } from '../api/campuses';
import type { Campus } from '../types';
import type { ApiError } from '../types';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/shared/DataTable';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { CampusForm } from '../features/campus/CampusForm';

function buildColumns(navigate: (id: number) => void): Column<Campus>[] {
    return [
        { key: 'code', header: 'Code', render: (r) => r.code },
        { key: 'name', header: 'Name', render: (r) => r.name },
        {
            key: 'status',
            header: 'Status',
            render: (r) => <Badge variant={r.isActive ? 'approved' : 'neutral'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
        },
        {
            key: 'actions',
            header: '',
            render: (r) => (
                <Button variant="ghost" size="sm" onClick={() => navigate(r.id)}>
                    View
                </Button>
            ),
        },
    ];
}

export default function CampusesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [createError, setCreateError] = useState<ApiError | null>(null);

    const { data: campuses = [], isLoading } = useQuery({
        queryKey: ['campuses'],
        queryFn: async () => {
            const res = await campusApi.list();
            return Array.isArray(res.data) ? res.data : (res.data as { data?: Campus[] })?.data ?? [];
        },
    });

    const createMutation = useMutation({
        mutationFn: campusApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campuses'] });
            setCreateOpen(false);
            setCreateError(null);
        },
        onError: (err: { response?: { data?: ApiError } }) => {
            setCreateError(err.response?.data ?? { code: 'ERROR', message: 'Failed to create campus' });
        },
    });

    const handleCreate = async (data: Parameters<typeof campusApi.create>[0]) => {
        setCreateError(null);
        await createMutation.mutateAsync(data);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Campuses"
                    subtitle="Manage university campuses and their configuration"
                    action={
                        <Button onClick={() => setCreateOpen(true)}>
                            Add campus
                        </Button>
                    }
                />
            </Card>
            <DataTable
                columns={buildColumns((id) => navigate(`/campuses/${id}`))}
                data={campuses}
                isLoading={isLoading}
                keyExtractor={(r) => r.id}
                emptyMessage="No campuses yet. Create one to get started."
            />
            <Modal
                isOpen={createOpen}
                onClose={() => { setCreateOpen(false); setCreateError(null); }}
                title="Create campus"
                size="lg"
            >
                <CampusForm
                    onSubmit={handleCreate}
                    onCancel={() => { setCreateOpen(false); setCreateError(null); }}
                    apiError={createError}
                />
            </Modal>
        </div>
    );
}

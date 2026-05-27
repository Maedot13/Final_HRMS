import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/shared/DataTable';
import { clearanceApi } from '../api/clearance';
import { format } from 'date-fns';
import { ClearanceRequestModal } from '../features/clearance/ClearanceRequestModal';
import { ClearanceDetailModal } from '../features/clearance/ClearanceDetailModal';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-toastify';

export default function ClearancePage() {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const isHRofficer = user?.role === 'HR_OFFICER';
    const [statusFilter, setStatusFilter] = useState<string>('PENDING');
    const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

    const { data: clearances = [], isLoading } = useQuery({
        queryKey: ['clearanceRequests', statusFilter],
        queryFn: async () => {
            const res = await clearanceApi.list(
                statusFilter !== 'ALL' ? { status: statusFilter } : undefined
            );
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const hrApproveMutation = useMutation({
        mutationFn: ({ requestId, action }: { requestId: number; action: 'APPROVE' | 'REJECT'; notes?: string }) =>
            clearanceApi.approveCampusHR(requestId, { action }),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['clearanceRequests'] });
            toast.success(`Campus HR ${vars.action === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
        },
        onError: (error: any) => toast.error(error.response?.data?.message || 'Campus HR action failed'),
    });

    const columns: Column<any>[] = [
        {
            key: 'employee',
            header: 'Employee ID',
            render: (r) => r.employee?.employeeId || 'Unknown',
        },
        {
            key: 'reason',
            header: 'Reason',
            render: (r) => r.reason || '—',
        },
        {
            key: 'lastWorkingDay',
            header: 'Last Working Day',
            render: (r) =>
                r.lastWorkingDay ? format(new Date(r.lastWorkingDay), 'MMM d, yyyy') : '—',
        },
        {
            key: 'status',
            header: 'Status',
            render: (r) => {
                const variants: Record<string, 'info' | 'approved' | 'rejected' | 'neutral' | 'warning'> = {
                    PENDING: 'warning',
                    IN_PROGRESS: 'warning',
                    BODY_APPROVAL_PENDING: 'warning',
                    HR_APPROVAL_PENDING: 'info',
                    HR_APPROVED: 'info',
                    APPROVED: 'approved',
                    COMPLETED: 'approved',
                    REJECTED: 'rejected',
                };
                
                const formatLabel = (s: string) => {
                    const map: Record<string, string> = {
                        BODY_APPROVAL_PENDING: 'Body Pending',
                        HR_APPROVAL_PENDING: 'HR Pending',
                        HR_APPROVED: 'Final Approval',
                    };
                    return map[s] || s;
                };

                return <Badge variant={variants[r.status] || 'neutral'}>{formatLabel(r.status)}</Badge>;
            },
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r) => {
                const hasApprovedForMyCampus = r.hrApprovals?.some((a: any) => a.campusId === user?.campusId && a.status === 'APPROVED');
                const canApproveHR = r.status === 'HR_APPROVAL_PENDING' && isHRofficer && !user?.isHeadHR && !hasApprovedForMyCampus;

                return (
                    <div className="flex gap-2 items-center">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                                setSelectedRequestId(r.id);
                                setIsDetailModalOpen(true);
                            }}
                        >
                            View Details
                        </Button>
                        {canApproveHR && (
                            <>
                                <Button 
                                    variant="primary" 
                                    size="sm" 
                                    isLoading={hrApproveMutation.isPending && hrApproveMutation.variables?.requestId === r.id && hrApproveMutation.variables?.action === 'APPROVE'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        hrApproveMutation.mutate({ requestId: r.id, action: 'APPROVE' });
                                    }}
                                >
                                    Approve
                                </Button>
                                <Button 
                                    variant="danger" 
                                    size="sm" 
                                    isLoading={hrApproveMutation.isPending && hrApproveMutation.variables?.requestId === r.id && hrApproveMutation.variables?.action === 'REJECT'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const notes = window.prompt('Enter rejection reason:');
                                        if (notes !== null && notes.trim() !== '') {
                                            hrApproveMutation.mutate({ requestId: r.id, action: 'REJECT', notes: notes.trim() });
                                        } else if (notes !== null) {
                                            toast.error('Rejection reason is mandatory.');
                                        }
                                    }}
                                >
                                    Reject
                                </Button>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Clearance Management"
                    subtitle="Track and manage employee offboarding and clearances"
                    action={
                        isHRofficer ? (
                            <Button variant="primary" onClick={() => setIsInitiateModalOpen(true)}>
                                Initiate Clearance
                            </Button>
                        ) : undefined
                    }
                />
            </Card>

            <div className="flex gap-2">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                    <Button
                        key={s}
                        variant={statusFilter === s ? 'secondary' : 'ghost'}
                        onClick={() => setStatusFilter(s)}
                        size="sm"
                    >
                        {s}
                    </Button>
                ))}
            </div>

            <DataTable
                columns={columns}
                data={clearances}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage="No clearance requests found."
            />
            <ClearanceRequestModal 
                isOpen={isInitiateModalOpen} 
                onClose={() => setIsInitiateModalOpen(false)} 
            />
            {selectedRequestId && (
                <ClearanceDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedRequestId(null);
                    }}
                    requestId={selectedRequestId}
                />
            )}
        </div>
    );
}

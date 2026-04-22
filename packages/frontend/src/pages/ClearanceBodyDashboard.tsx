import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clearanceApi } from '../api/clearance';
import { DataTable, type Column } from '../components/shared/DataTable';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { toast } from 'react-toastify';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/useAuthStore';

export default function ClearanceBodyDashboard() {
    const queryClient = useQueryClient();
    const user = useAuthStore((s: any) => s.user);
    const unitId = user?.clearanceUnitId;

    const [modal, setModal] = useState<{ open: boolean; requestId?: number; type?: 'APPROVE' | 'REJECT' }>({ open: false });
    const [comment, setComment] = useState('');

    const { data: pendingChecks = [], isLoading } = useQuery({
        queryKey: ['pendingClearanceChecks', unitId],
        queryFn: async () => {
            if (!unitId) return [];
            const response = await clearanceApi.getPendingChecksForUnit(unitId);
            return Array.isArray(response.data) ? response.data : [];
        },
        enabled: !!unitId,
    });

    const processMutation = useMutation({
        mutationFn: async ({ status }: { status: 'APPROVED' | 'REJECTED' }) => {
            if (!modal.requestId || !unitId) throw new Error('Missing context');
            // If REJECTED, comment is required
            if (status === 'REJECTED' && !comment.trim()) {
                throw new Error('Rejection reason is required');
            }
            if (status === 'APPROVED') {
                return clearanceApi.approveCheck(modal.requestId, unitId, comment);
            }
            return clearanceApi.rejectCheck(modal.requestId, unitId, comment);
        },
        onSuccess: () => {
            toast.success('Clearance action successfully recorded');
            queryClient.invalidateQueries({ queryKey: ['pendingClearanceChecks', unitId] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || 'Error processing request');
        }
    });

    const handleAction = (requestId: number, type: 'APPROVE' | 'REJECT') => {
        setModal({ open: true, requestId, type });
        setComment('');
    };

    const closeModal = () => setModal({ open: false });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modal.type) {
            processMutation.mutate({ status: modal.type === 'APPROVE' ? 'APPROVED' : 'REJECTED' });
        }
    };

    const columns: Column<any>[] = [
        {
            key: 'employeeName',
            header: 'Employee Name',
            render: (r: any) => r.clearance.employee.name,
        },
        {
            key: 'employeeId',
            header: 'ID',
            render: (r: any) => r.clearance.employee.employeeId,
        },
        {
            key: 'department',
            header: 'Department',
            render: (r: any) => r.clearance.employee.deptLegacy,
        },
        {
            key: 'reason',
            header: 'Clearance Reason',
            render: (r: any) => r.clearance.reason,
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r: any) => (
                <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => handleAction(r.clearanceId, 'APPROVE')}>
                        Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleAction(r.clearanceId, 'REJECT')}>
                        Reject
                    </Button>
                </div>
            )
        }
    ];

    if (!unitId) return <div>No clearance unit assigned to this account. Contact System Administrator.</div>;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader 
                    title="Unit Clearance Dashboard" 
                    subtitle="Review and process pending clearance requests for your department."
                />
            </Card>

            <DataTable
                columns={columns}
                data={pendingChecks}
                isLoading={isLoading}
                keyExtractor={(r: any) => r.id.toString()}
                emptyMessage="No pending clearance requests for your unit at this time."
            />

            <Modal
                isOpen={modal.open}
                onClose={closeModal}
                title={modal.type === 'APPROVE' ? 'Approve Clearance' : 'Reject Clearance'}
            >
                <form onSubmit={onSubmit} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        {modal.type === 'APPROVE' 
                            ? 'Please provide an optional comment for your approval.'
                            : 'A rejection reason is strictly required. The clearance request will be returned to the employee.'}
                    </p>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                            {modal.type === 'APPROVE' ? 'Comment (Optional)' : 'Reason (Required)'}
                        </label>
                        <textarea
                            autoFocus
                            className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                            placeholder={modal.type === 'APPROVE' ? 'Looks good...' : 'Missing technical equipment...'}
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            required={modal.type === 'REJECT'}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={closeModal} type="button">Cancel</Button>
                        <Button 
                            variant={modal.type === 'APPROVE' ? 'primary' : 'danger'} 
                            type="submit"
                            disabled={processMutation.isPending}
                        >
                            {modal.type === 'APPROVE' ? 'Approve' : 'Reject'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

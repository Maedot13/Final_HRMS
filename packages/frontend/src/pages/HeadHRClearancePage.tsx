import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clearanceApi } from '../api/clearance';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/shared/DataTable';
import { Modal } from '../components/ui/Modal';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { FiCheckCircle, FiXCircle, FiClock, FiUser, FiMapPin, FiFileText } from 'react-icons/fi';

export default function HeadHRClearancePage() {
    const queryClient = useQueryClient();
    const [modal, setModal] = useState<{ open: boolean; requestId?: number; action?: 'APPROVE' | 'REJECT'; employee?: string }>({ open: false });
    const [reason, setReason] = useState('');
    const [tab, setTab] = useState<'pending' | 'all'>('pending');

    const { data: pendingItems = [], isLoading: pendingLoading } = useQuery({
        queryKey: ['headHRClearancePending'],
        queryFn: async () => {
            const res = await clearanceApi.listPendingFinalApproval();
            return Array.isArray(res.data) ? res.data : [];
        },
        refetchInterval: 30000,
    });

    const { data: allItems = [], isLoading: allLoading } = useQuery({
        queryKey: ['headHRClearanceAll'],
        queryFn: async () => {
            const res = await clearanceApi.list();
            return Array.isArray(res.data) ? res.data : [];
        },
        enabled: tab === 'all',
    });

    const approveMutation = useMutation({
        mutationFn: ({ id, action, reason }: { id: number; action: 'APPROVE' | 'REJECT'; reason?: string }) =>
            clearanceApi.finalApprove(id, { action, reason }),
        onSuccess: (_, vars) => {
            toast.success(`Clearance ${vars.action === 'APPROVE' ? 'approved' : 'rejected'} successfully`);
            queryClient.invalidateQueries({ queryKey: ['headHRClearancePending'] });
            queryClient.invalidateQueries({ queryKey: ['headHRClearanceAll'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Action failed');
        },
    });

    const openModal = (requestId: number, action: 'APPROVE' | 'REJECT', employee: string) => {
        setReason('');
        setModal({ open: true, requestId, action, employee });
    };

    const closeModal = () => setModal({ open: false });

    const handleConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        if (modal.action === 'REJECT' && !reason.trim()) {
            toast.error('Rejection reason is required');
            return;
        }
        if (modal.requestId && modal.action) {
            approveMutation.mutate({ id: modal.requestId, action: modal.action, reason: reason || undefined });
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, 'warning' | 'approved' | 'rejected' | 'info' | 'neutral'> = {
            BODY_APPROVAL_PENDING: 'warning',
            HR_APPROVAL_PENDING: 'info',
            HR_APPROVED: 'warning',
            COMPLETED: 'approved',
            REJECTED: 'rejected',
        };
        const labels: Record<string, string> = {
            BODY_APPROVAL_PENDING: 'Body Pending',
            HR_APPROVAL_PENDING: 'Campus HR Pending',
            HR_APPROVED: 'Awaiting Your Approval',
            COMPLETED: 'Completed',
            REJECTED: 'Rejected',
        };
        return <Badge variant={map[status] || 'neutral'}>{labels[status] || status}</Badge>;
    };

    const columns: Column<any>[] = [
        {
            key: 'employee',
            header: 'Employee',
            render: (r: any) => (
                <div>
                    <div className="flex items-center gap-1.5 font-medium text-gray-800">
                        <FiUser className="w-3.5 h-3.5 text-gray-400" />
                        {r.employee?.name || '—'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 ml-5">{r.employee?.employeeId || '—'}</div>
                </div>
            ),
        },
        {
            key: 'campus',
            header: 'Campus',
            render: (r: any) => (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <FiMapPin className="w-3.5 h-3.5 text-gray-400" />
                    {r.campus?.name || r.employee?.campus?.name || '—'}
                </div>
            ),
        },
        {
            key: 'reason',
            header: 'Reason',
            render: (r: any) => (
                <div className="flex items-start gap-1.5 text-sm text-gray-600 max-w-[200px]">
                    <FiFileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="truncate">{r.reason || '—'}</span>
                </div>
            ),
        },
        {
            key: 'lastWorkingDay',
            header: 'Last Working Day',
            render: (r: any) => (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <FiClock className="w-3.5 h-3.5 text-gray-400" />
                    {r.lastWorkingDay ? format(new Date(r.lastWorkingDay), 'MMM d, yyyy') : '—'}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (r: any) => statusBadge(r.status),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r: any) => {
                if (r.status !== 'HR_APPROVED') {
                    return <span className="text-xs text-gray-400 italic">No action needed</span>;
                }
                return (
                    <div className="flex gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openModal(r.id, 'APPROVE', r.employee?.name || 'Employee')}
                        >
                            <FiCheckCircle className="w-3.5 h-3.5 mr-1" />
                            Approve
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openModal(r.id, 'REJECT', r.employee?.name || 'Employee')}
                        >
                            <FiXCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                        </Button>
                    </div>
                );
            },
        },
    ];

    const displayData = tab === 'pending' ? pendingItems : allItems;
    const isLoading = tab === 'pending' ? pendingLoading : allLoading;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Final Clearance Approvals"
                    subtitle="As Head HR, you provide the definitive sign-off on all clearance requests after campus HR officers have approved."
                />
            </Card>

            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-yellow-100">
                            <FiClock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Awaiting My Approval</p>
                            <p className="text-2xl font-bold text-gray-900">{pendingItems.length}</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100">
                            <FiCheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Completed</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {allItems.filter((r: any) => r.status === 'COMPLETED').length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-red-100">
                            <FiXCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Rejected</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {allItems.filter((r: any) => r.status === 'REJECTED').length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2">
                <Button
                    variant={tab === 'pending' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTab('pending')}
                >
                    Pending My Approval
                    {pendingItems.length > 0 && (
                        <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                            {pendingItems.length}
                        </span>
                    )}
                </Button>
                <Button
                    variant={tab === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTab('all')}
                >
                    All Clearances
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={displayData}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage={
                    tab === 'pending'
                        ? 'No clearances awaiting your approval.'
                        : 'No clearance requests found.'
                }
            />

            {/* Confirm Modal */}
            <Modal
                isOpen={modal.open}
                onClose={closeModal}
                title={modal.action === 'APPROVE' ? 'Confirm Final Approval' : 'Confirm Rejection'}
            >
                <form onSubmit={handleConfirm} className="space-y-4 pt-2">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
                        {modal.action === 'APPROVE' ? (
                            <>
                                You are about to <strong>finally approve</strong> the clearance for{' '}
                                <strong>{modal.employee}</strong>. This will mark the clearance as{' '}
                                <span className="text-green-700 font-semibold">COMPLETED</span>.
                            </>
                        ) : (
                            <>
                                You are about to <strong>reject</strong> the clearance for{' '}
                                <strong>{modal.employee}</strong>. A rejection reason is required.
                            </>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                            {modal.action === 'APPROVE' ? 'Comment (optional)' : 'Rejection Reason *'}
                        </label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder={
                                modal.action === 'APPROVE'
                                    ? 'Any final notes...'
                                    : 'State the reason for rejection...'
                            }
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required={modal.action === 'REJECT'}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button
                            type="submit"
                            variant={modal.action === 'APPROVE' ? 'primary' : 'danger'}
                            isLoading={approveMutation.isPending}
                        >
                            {modal.action === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

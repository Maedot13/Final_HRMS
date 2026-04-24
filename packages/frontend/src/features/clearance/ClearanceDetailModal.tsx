import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { clearanceApi } from '../../api/clearance';
import { toast } from 'react-toastify';
import { FiAlertTriangle, FiCheck, FiX, FiMapPin, FiRefreshCw } from 'react-icons/fi';
import { format } from 'date-fns';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    requestId: number | null;
}

const statusBadge = (status: string) => {
    if (status === 'APPROVED') return <Badge variant="approved">Approved</Badge>;
    if (status === 'REJECTED') return <Badge variant="rejected">Rejected</Badge>;
    return <Badge variant="warning">Pending</Badge>;
};

export function ClearanceDetailModal({ isOpen, onClose, requestId }: Props) {
    const queryClient = useQueryClient();
    const [rejectComment, setRejectComment] = useState('');
    const [rejectingUnitId, setRejectingUnitId] = useState<number | null>(null);

    const { data: request, isLoading } = useQuery({
        queryKey: ['clearanceRequest', requestId],
        queryFn: async () => {
            if (!requestId) return null;
            const res = await clearanceApi.getById(requestId);
            return res.data;
        },
        enabled: !!requestId && isOpen,
    });

    const approveMutation = useMutation({
        mutationFn: (unitId: number) =>
            clearanceApi.processCheck(requestId!, unitId, { status: 'APPROVED' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clearanceRequest', requestId] });
            queryClient.invalidateQueries({ queryKey: ['clearanceRequests'] });
            toast.success('Check approved ✓');
        },
        onError: (error: any) => toast.error(error.response?.data?.message || 'Approval failed'),
    });

    const rejectMutation = useMutation({
        mutationFn: ({ unitId, comment }: { unitId: number; comment: string }) =>
            clearanceApi.processCheck(requestId!, unitId, { status: 'REJECTED', comment }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clearanceRequest', requestId] });
            queryClient.invalidateQueries({ queryKey: ['clearanceRequests'] });
            toast.success('Issue recorded');
            setRejectingUnitId(null);
            setRejectComment('');
        },
        onError: (error: any) => toast.error(error.response?.data?.message || 'Rejection failed'),
    });


    // Group checks by campus name
    const groupedByCampus: Record<string, any[]> = {};
    if (request?.checks) {
        for (const check of request.checks) {
            const campusName = check.unit?.campus?.name || 'Main Campus';
            if (!groupedByCampus[campusName]) groupedByCampus[campusName] = [];
            groupedByCampus[campusName].push(check);
        }
        // Sort within each campus by priorityOrder
        for (const campus of Object.keys(groupedByCampus)) {
            groupedByCampus[campus].sort((a: any, b: any) =>
                (a.unit?.priorityOrder ?? 0) - (b.unit?.priorityOrder ?? 0)
            );
        }
    }

    const rejectedChecks = request?.checks?.filter((c: any) => c.status === 'REJECTED') ?? [];

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Clearance Request Details" size="lg">
            <div className="flex flex-col h-[75vh]">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : request ? (
                    <>
                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-5 pt-3">
                            {/* Employee summary */}
                            <div className="grid grid-cols-2 gap-3 bg-gray-50 border border-gray-200 p-4 rounded-lg text-sm">
                                <div>
                                    <span className="text-xs text-gray-500 block mb-0.5">Employee</span>
                                    <span className="font-semibold text-gray-900">{request.employee?.name || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block mb-0.5">Employee ID</span>
                                    <span className="font-mono font-medium text-gray-900">{request.employee?.employeeId || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block mb-0.5">Reason</span>
                                    <span className="font-medium text-gray-900">{request.reason}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block mb-0.5">Last Working Day</span>
                                    <span className="font-medium text-gray-900">
                                        {request.lastWorkingDay ? format(new Date(request.lastWorkingDay), 'MMM d, yyyy') : '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block mb-0.5">Overall Status</span>
                                    {statusBadge(request.status)}
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block mb-0.5">Initiated</span>
                                    <span className="font-medium text-gray-900">
                                        {format(new Date(request.createdAt), 'MMM d, yyyy')}
                                    </span>
                                </div>
                            </div>

                            {/* Rejection alert banner */}
                            {rejectedChecks.length > 0 && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                                    <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                                        <FiAlertTriangle className="w-4 h-4" />
                                        {rejectedChecks.length} issue{rejectedChecks.length > 1 ? 's' : ''} raised — clearance on hold
                                    </div>
                                    {rejectedChecks.map((c: any) => (
                                        <p key={c.unitId} className="text-xs text-red-600 pl-6">
                                            <strong>{c.unit?.fullName || c.unit?.name}</strong>
                                            {c.comment ? `: ${c.comment}` : ' — no reason given'}
                                        </p>
                                    ))}
                                    <p className="text-xs text-red-500 pl-6 italic pt-1">
                                        Once the body re-approves after the issue is resolved, the flow continues automatically.
                                    </p>
                                </div>
                            )}

                            {/* Campus-grouped check tables */}
                            {Object.entries(groupedByCampus).map(([campusName, checks]) => (
                                <div key={campusName}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FiMapPin className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-semibold text-gray-700">{campusName}</h4>
                                    </div>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                                        {/* Table header */}
                                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            <span>Unit</span>
                                            <span>Priority</span>
                                            <span>Status</span>
                                            <span>Action</span>
                                        </div>

                                        {checks.map((check: any) => (
                                            <div key={check.unitId}>
                                                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                                                    {/* Unit name + comment */}
                                                    <div>
                                                        <p className="font-medium text-sm text-gray-900">
                                                            {check.unit?.fullName || check.unit?.name}
                                                        </p>
                                                        {check.comment && (
                                                            <p className="text-xs text-gray-500 mt-0.5 italic">
                                                                "{check.comment}"
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Priority badge */}
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">
                                                        P{check.unit?.priorityOrder ?? 0}
                                                    </span>

                                                    {/* Status */}
                                                    <div>{statusBadge(check.status)}</div>

                                                    {/* Action buttons */}
                                                    <div className="flex gap-1">
                                                        {(check.status === 'PENDING' || check.status === 'REJECTED') && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-green-600 hover:bg-green-50 p-1"
                                                                    title={check.status === 'REJECTED' ? 'Re-approve (resolve issue)' : 'Approve'}
                                                                    onClick={() => approveMutation.mutate(check.unitId)}
                                                                    isLoading={approveMutation.isPending && approveMutation.variables === check.unitId}
                                                                >
                                                                    {check.status === 'REJECTED'
                                                                        ? <FiRefreshCw className="w-3.5 h-3.5" />
                                                                        : <FiCheck className="w-3.5 h-3.5" />
                                                                    }
                                                                </Button>
                                                                {check.status === 'PENDING' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-red-600 hover:bg-red-50 p-1"
                                                                        title="Raise issue / Reject"
                                                                        onClick={() => { setRejectingUnitId(check.unitId); setRejectComment(''); }}
                                                                    >
                                                                        <FiX className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Inline rejection comment form */}
                                                {rejectingUnitId === check.unitId && (
                                                    <div className="px-4 pb-3 bg-red-50 border-t border-red-200">
                                                        <p className="text-xs font-medium text-red-700 pt-2 pb-1">
                                                            State the issue / reason for rejection:
                                                        </p>
                                                        <textarea
                                                            autoFocus
                                                            className="w-full text-sm border border-red-300 rounded p-2 min-h-[70px] focus:outline-none focus:ring-1 focus:ring-red-400"
                                                            placeholder="e.g. Outstanding library fines — must be cleared first."
                                                            value={rejectComment}
                                                            onChange={(e) => setRejectComment(e.target.value)}
                                                        />
                                                        <div className="flex gap-2 mt-2">
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                isLoading={rejectMutation.isPending}
                                                                disabled={rejectComment.trim().length < 5}
                                                                onClick={() => rejectMutation.mutate({ unitId: check.unitId, comment: rejectComment })}
                                                            >
                                                                Confirm Rejection
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => setRejectingUnitId(null)}>
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Sticky footer */}
                        <div className="border-t border-gray-200 pt-3 mt-3 flex justify-end">
                            <Button variant="secondary" onClick={onClose}>Close</Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Failed to load clearance details.
                    </div>
                )}
            </div>
        </Modal>
    );
}

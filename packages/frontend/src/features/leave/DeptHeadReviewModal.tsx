import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { leaveApi } from '../../api/leave';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
    FiUser, FiCalendar, FiMessageSquare, FiCheckCircle,
    FiXCircle, FiArrowRight, FiAlertTriangle,
} from 'react-icons/fi';

interface Leave {
    id: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: string;
    currentStage: string;
    attachmentUrl?: string | null;
    employee?: { name?: string; position?: string; deptLegacy?: string };
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    leave: Leave | null;
}

const NEXT_STAGE_LABEL: Record<string, string> = {
    ANNUAL: 'HR Officer',
    SICK: 'HR Officer',
    MATERNITY: 'HR Officer',
    PATERNITY: 'HR Officer',
    PERSONAL: 'HR Officer',
    STUDY: 'HR Officer',
    UNPAID: 'HR Officer',
    RESEARCH: 'College Dean',
    SABBATICAL: 'Academic Vice President',
};

export function DeptHeadReviewModal({ isOpen, onClose, leave }: Props) {
    const queryClient = useQueryClient();
    const [comment, setComment] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);

    const reset = () => { setComment(''); setCommentError(null); };
    const handleClose = () => { reset(); onClose(); };

    const forwardMutation = useMutation({
        mutationFn: () =>
            leaveApi.deptHeadReview(leave!.id, {
                decision: 'APPROVED',
                comment: comment || undefined,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
            const next = NEXT_STAGE_LABEL[leave!.leaveType] ?? 'next approver';
            toast.success(`Leave request forwarded to ${next} for final decision.`);
            handleClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to forward request');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: () =>
            leaveApi.deptHeadReview(leave!.id, {
                decision: 'REJECTED',
                comment,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
            toast.success('Leave request rejected. The employee has been notified.');
            handleClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to reject request');
        },
    });

    const handleForward = () => {
        setCommentError(null);
        forwardMutation.mutate();
    };

    const handleReject = () => {
        if (!comment.trim()) {
            setCommentError('A reason for rejection is required so the employee understands.');
            return;
        }
        setCommentError(null);
        rejectMutation.mutate();
    };

    if (!leave) return null;

    const isPending = forwardMutation.isPending || rejectMutation.isPending;
    const nextStage = NEXT_STAGE_LABEL[leave.leaveType] ?? 'Next Approver';

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Review Leave Request"
            size="lg"
            closeOnOverlayClick={!isPending}
        >
            <div className="space-y-4">

                {/* Stage badge */}
                <div className="flex items-center gap-2 text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <FiAlertTriangle className="w-3.5 h-3.5" />
                    Stage 1 of 2 — Your review is required. If approved, the request is forwarded to <strong>{nextStage}</strong> for final decision.
                    <FiArrowRight className="w-3.5 h-3.5 ml-auto" />
                </div>

                {/* Employee info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <FiUser className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{leave.employee?.name ?? 'Employee'}</p>
                        <p className="text-xs text-gray-500">
                            {[leave.employee?.position, leave.employee?.deptLegacy].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <Badge variant="warning">{leave.status}</Badge>
                </div>

                {/* Leave detail grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-gray-100 rounded-lg">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Leave Type</p>
                        <p className="text-sm font-semibold text-gray-800 capitalize">
                            {leave.leaveType.toLowerCase().replace(/_/g, ' ')}
                        </p>
                    </div>
                    <div className="p-3 bg-white border border-gray-100 rounded-lg">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Duration</p>
                        <p className="text-sm font-semibold text-gray-800">{leave.days} day{leave.days !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="col-span-2 p-3 bg-white border border-gray-100 rounded-lg flex items-start gap-2">
                        <FiCalendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Period</p>
                            <p className="text-sm font-medium text-gray-800">
                                {format(new Date(leave.startDate), 'MMM d, yyyy')} — {format(new Date(leave.endDate), 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Reason */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <FiMessageSquare className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Employee's Reason</p>
                        <p className="text-sm text-gray-800 leading-relaxed">{leave.reason || 'No reason provided.'}</p>
                    </div>
                </div>

                {/* Document */}
                {leave.attachmentUrl && (
                    <a
                        href={leave.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                        <FiCalendar className="w-4 h-4" />
                        View Attached Document ↗
                    </a>
                )}

                {/* Comment box */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                        Review Comment{' '}
                        <span className="text-xs text-gray-400 font-normal">
                            (required when rejecting; optional when forwarding)
                        </span>
                    </label>
                    <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => { setComment(e.target.value); if (commentError) setCommentError(null); }}
                        placeholder="Add remarks for the employee or the next approver…"
                        className={`w-full rounded-lg border ${commentError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'} px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-colors`}
                        disabled={isPending}
                    />
                    {commentError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <FiXCircle className="w-3 h-3" /> {commentError}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                    <Button variant="ghost" onClick={handleClose} disabled={isPending}>Cancel</Button>
                    <Button
                        variant="danger"
                        onClick={handleReject}
                        isLoading={rejectMutation.isPending}
                        disabled={isPending}
                    >
                        <FiXCircle className="w-4 h-4 mr-1.5" /> Reject
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleForward}
                        isLoading={forwardMutation.isPending}
                        disabled={isPending}
                    >
                        <FiCheckCircle className="w-4 h-4 mr-1.5" />
                        Forward to {nextStage}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

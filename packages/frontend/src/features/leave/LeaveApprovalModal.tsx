import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { leaveApi } from '../../api/leave';
import { format } from 'date-fns';
import { FiCalendar, FiUser, FiMessageSquare, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface LeaveApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    leave: {
        id: number;
        leaveType: string;
        startDate: string;
        endDate: string;
        reason: string;
        status: string;
        employee?: { name?: string; position?: string; department?: string };
    } | null;
}

const statusVariants: Record<string, 'info' | 'approved' | 'rejected' | 'neutral' | 'warning'> = {
    PENDING: 'warning',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'neutral',
};

export function LeaveApprovalModal({ isOpen, onClose, leave }: LeaveApprovalModalProps) {
    const queryClient = useQueryClient();
    const [comment, setComment] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);

    const resetState = () => {
        setComment('');
        setCommentError(null);
        setAction(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const approveMutation = useMutation({
        mutationFn: () => leaveApi.approve(leave!.id, { comment: comment || undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
            toast.success('Leave request approved successfully');
            handleClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to approve request');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: () => leaveApi.reject(leave!.id, { comment }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
            toast.success('Leave request rejected');
            handleClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to reject request');
        },
    });

    const handleApprove = () => {
        setCommentError(null);
        setAction('approve');
        approveMutation.mutate();
    };

    const handleReject = () => {
        if (!comment.trim()) {
            setCommentError('A reason for rejection is required.');
            return;
        }
        setCommentError(null);
        setAction('reject');
        rejectMutation.mutate();
    };

    if (!leave) return null;

    const days =
        Math.ceil(
            (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
        ) + 1;

    const isPending = approveMutation.isPending || rejectMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Review Leave Request"
            size="lg"
            closeOnOverlayClick={!isPending}
        >
            <div className="space-y-5">
                {/* Employee info */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <FiUser className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                            {leave.employee?.name ?? 'Employee'}
                        </p>
                        {(leave.employee?.position || leave.employee?.department) && (
                            <p className="text-xs text-gray-500 truncate">
                                {[leave.employee.position, leave.employee.department]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        )}
                    </div>
                    <Badge variant={statusVariants[leave.status] ?? 'neutral'}>
                        {leave.status}
                    </Badge>
                </div>

                {/* Leave details grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2 p-3 bg-white border border-gray-100 rounded-lg">
                        <FiCalendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block">
                                Leave Type
                            </span>
                            <span className="text-sm font-medium text-gray-800 capitalize">
                                {leave.leaveType.toLowerCase().replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white border border-gray-100 rounded-lg">
                        <FiCalendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block">
                                Duration
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                                {days} day{days > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <div className="col-span-2 flex items-start gap-2 p-3 bg-white border border-gray-100 rounded-lg">
                        <FiCalendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block">
                                Period
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                                {format(new Date(leave.startDate), 'MMM d, yyyy')} —{' '}
                                {format(new Date(leave.endDate), 'MMM d, yyyy')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Reason */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <FiMessageSquare className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wide block mb-1">
                            Reason
                        </span>
                        <p className="text-sm text-gray-800 leading-relaxed">
                            {leave.reason || 'No reason provided.'}
                        </p>
                    </div>
                </div>

                {/* Comment box */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                        Comment{' '}
                        <span className="text-xs text-gray-400 font-normal">
                            (required for rejection, optional for approval)
                        </span>
                    </label>
                    <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => {
                            setComment(e.target.value);
                            if (commentError) setCommentError(null);
                        }}
                        placeholder="Add your comment here..."
                        className={`w-full rounded-lg border ${
                            commentError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
                        } px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-colors`}
                        disabled={isPending}
                    />
                    {commentError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <FiXCircle className="w-3 h-3" /> {commentError}
                        </p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-1">
                    <Button variant="ghost" onClick={handleClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleReject}
                        isLoading={rejectMutation.isPending && action === 'reject'}
                        disabled={isPending}
                    >
                        <FiXCircle className="w-4 h-4 mr-1.5" />
                        Reject
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleApprove}
                        isLoading={approveMutation.isPending && action === 'approve'}
                        disabled={isPending}
                    >
                        <FiCheckCircle className="w-4 h-4 mr-1.5" />
                        Approve
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

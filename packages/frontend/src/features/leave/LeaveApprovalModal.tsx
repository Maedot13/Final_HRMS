import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { leaveApi } from '../../api/leave';
import { useAuthStore } from '../../store/useAuthStore';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
    FiUser, FiCalendar, FiMessageSquare,
    FiCheckCircle, FiXCircle, FiShield, FiFile,
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
    deptHeadComment?: string | null;
    employee?: { name?: string; position?: string; deptLegacy?: string };
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    leave: Leave | null;
}

const STAGE_ACTOR: Record<string, string> = {
    HR_OFFICER: 'HR Officer (Final Approval)',
    DEAN: 'College Dean (Review)',
    VICE_PRESIDENT: 'Academic Vice President (Review)',
};

const STAGE_COLOR: Record<string, string> = {
    HR_OFFICER: 'bg-blue-50 border-blue-200 text-blue-800',
    DEAN: 'bg-teal-50 border-teal-200 text-teal-800',
    VICE_PRESIDENT: 'bg-purple-50 border-purple-200 text-purple-800',
};

const STATUS_VARIANTS: Record<string, any> = {
    PENDING: 'warning',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'neutral',
};

export function LeaveApprovalModal({ isOpen, onClose, leave }: Props) {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const [comment, setComment] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);

    const privileges: string[] = (user as any)?.specialPrivileges ?? [];

    const reset = () => { setComment(''); setCommentError(null); setAction(null); };
    const handleClose = () => { reset(); onClose(); };

    const approveMutation = useMutation({
        mutationFn: () => leaveApi.approve(leave!.id, { comment: comment || undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
            toast.success('Leave request approved. The employee has been notified.');
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
            toast.success('Leave request rejected. The employee has been notified.');
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
            setCommentError('A rejection reason is required so the employee understands.');
            return;
        }
        setCommentError(null);
        setAction('reject');
        rejectMutation.mutate();
    };

    if (!leave) return null;

    const isPending = approveMutation.isPending || rejectMutation.isPending;
    const stage = leave.currentStage;

    // Determine what role this actor is acting as
    const actorLabel = (() => {
        if (privileges.includes('DEAN') && stage === 'DEAN') return STAGE_ACTOR.DEAN;
        if ((privileges.includes('VICE_PRESIDENT') || privileges.includes('UNIVERSITY_PRESIDENT'))
            && stage === 'VICE_PRESIDENT') return STAGE_ACTOR.VICE_PRESIDENT;
        return STAGE_ACTOR.HR_OFFICER;
    })();

    const stageBannerClass = STAGE_COLOR[stage] ?? 'bg-gray-50 border-gray-200 text-gray-700';

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Leave Decision"
            size="lg"
            closeOnOverlayClick={!isPending}
        >
            <div className="space-y-4">

                {/* Actor / Stage banner */}
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold ${stageBannerClass}`}>
                    <FiShield className="w-3.5 h-3.5 shrink-0" />
                    You are acting as: <strong>{actorLabel}</strong>
                    <span className="ml-auto text-[10px] font-medium opacity-70">Review & Approve</span>
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
                    <Badge variant={STATUS_VARIANTS[leave.status] ?? 'neutral'}>{leave.status}</Badge>
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
                        <p className="text-sm font-semibold text-gray-800">
                            {leave.days} day{leave.days !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="col-span-2 p-3 bg-white border border-gray-100 rounded-lg flex items-start gap-2">
                        <FiCalendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Period</p>
                            <p className="text-sm font-medium text-gray-800">
                                {format(new Date(leave.startDate), 'MMM d, yyyy')} —{' '}
                                {format(new Date(leave.endDate), 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Employee's reason */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <FiMessageSquare className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Employee's Reason</p>
                        <p className="text-sm text-gray-800 leading-relaxed">{leave.reason || 'No reason provided.'}</p>
                    </div>
                </div>

                {/* Dept head's comment (if any) */}
                {leave.deptHeadComment && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
                        <FiCheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1">
                                Department Head Comment
                            </p>
                            <p className="text-sm text-gray-800 leading-relaxed">{leave.deptHeadComment}</p>
                        </div>
                    </div>
                )}

                {/* Attachment */}
                {leave.attachmentUrl && (
                    <a
                        href={leave.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                        <FiFile className="w-4 h-4" />
                        View Attached Document ↗
                    </a>
                )}

                {/* Comment box */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                        Decision Comment{' '}
                        <span className="text-xs text-gray-400 font-normal">
                            (required for rejection; optional for approval)
                        </span>
                    </label>
                    <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => { setComment(e.target.value); if (commentError) setCommentError(null); }}
                        placeholder="Add your comments for the employee…"
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

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                    <Button variant="ghost" onClick={handleClose} disabled={isPending}>Cancel</Button>
                    <Button
                        variant="danger"
                        onClick={handleReject}
                        isLoading={rejectMutation.isPending && action === 'reject'}
                        disabled={isPending}
                    >
                        <FiXCircle className="w-4 h-4 mr-1.5" /> Reject
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleApprove}
                        isLoading={approveMutation.isPending && action === 'approve'}
                        disabled={isPending}
                    >
                        <FiCheckCircle className="w-4 h-4 mr-1.5" /> Approve
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

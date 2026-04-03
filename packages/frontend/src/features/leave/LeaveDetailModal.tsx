import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { leaveApi } from '../../api/leave';
import { format } from 'date-fns';
import { FiCalendar, FiClock, FiUser, FiMessageSquare } from 'react-icons/fi';

interface LeaveDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    leaveId: number | null;
}

export function LeaveDetailModal({ isOpen, onClose, leaveId }: LeaveDetailModalProps) {
    const { data: leave, isLoading } = useQuery({
        queryKey: ['leaveDetail', leaveId],
        queryFn: async () => {
            if (!leaveId) return null;
            const res = await leaveApi.getById(leaveId);
            return res.data;
        },
        enabled: !!leaveId && isOpen,
    });

    if (!isOpen) return null;

    const statusVariants: Record<string, 'info' | 'approved' | 'rejected' | 'neutral' | 'warning'> = {
        PENDING: 'warning',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        CANCELLED: 'neutral',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Leave Request Details" size="lg">
            {isLoading ? (
                <div className="py-16 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : leave ? (
                <div className="space-y-6 pt-2">
                    {/* Status Banner */}
                    <div className={`rounded-lg p-4 flex items-center justify-between ${
                        leave.status === 'APPROVED' ? 'bg-green-50' :
                        leave.status === 'REJECTED' ? 'bg-red-50' :
                        leave.status === 'PENDING' ? 'bg-amber-50' : 'bg-gray-50'
                    }`}>
                        <div className="flex items-center gap-3">
                            <FiCalendar className="w-5 h-5 text-gray-500" />
                            <div>
                                <span className="capitalize font-medium text-gray-900">
                                    {leave.leaveType?.toLowerCase().replace('_', ' ')} Leave
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {leave.days ?? Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                                </p>
                            </div>
                        </div>
                        <Badge variant={statusVariants[leave.status] || 'neutral'}>
                            {leave.status}
                        </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                            <FiUser className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-gray-500 block text-xs">Employee</span>
                                <span className="font-medium text-gray-900">
                                    {leave.employee?.name || 'You'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <FiClock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-gray-500 block text-xs">Period</span>
                                <span className="font-medium text-gray-900">
                                    {format(new Date(leave.startDate), 'MMM d, yyyy')} — {format(new Date(leave.endDate), 'MMM d, yyyy')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FiMessageSquare className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</span>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed">
                            {leave.reason || 'No reason provided.'}
                        </p>
                    </div>

                    {/* Reviewer Comment (if exists) */}
                    {leave.reviewComment && (
                        <div className={`rounded-lg p-4 ${leave.status === 'REJECTED' ? 'bg-red-50' : 'bg-green-50'}`}>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                Reviewer Comment
                            </span>
                            <p className="text-sm text-gray-800">{leave.reviewComment}</p>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 flex justify-between">
                        <span>Created: {leave.createdAt ? format(new Date(leave.createdAt), 'MMM d, yyyy HH:mm') : '—'}</span>
                        {leave.updatedAt && (
                            <span>Updated: {format(new Date(leave.updatedAt), 'MMM d, yyyy HH:mm')}</span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="py-10 text-center text-gray-500">Failed to load leave details.</div>
            )}
        </Modal>
    );
}

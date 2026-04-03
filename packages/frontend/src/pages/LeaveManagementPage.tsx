import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable, type Column } from '../components/shared/DataTable';
import { leaveApi } from '../api/leave';
import { format } from 'date-fns';
import { useAuthStore } from '../store/useAuthStore';
import { LeaveRequestModal } from '../features/leave/LeaveRequestModal';
import { LeaveDetailModal } from '../features/leave/LeaveDetailModal';
import { LeaveApprovalModal } from '../features/leave/LeaveApprovalModal';
import {
    FiCalendar,
    FiSun,
    FiHeart,
    FiUser,
} from 'react-icons/fi';

// ─── Leave Balance Widget ────────────────────────────────────────────────────

interface BalanceCardProps {
    label: string;
    days: number;
    total: number;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
}

function BalanceCard({ label, days, total, color, bgColor, icon }: BalanceCardProps) {
    const pct = total > 0 ? Math.max(0, Math.min(100, (days / total) * 100)) : 0;
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center`}>
                    {icon}
                </div>
                <span className={`text-2xl font-bold ${color}`}>{days}</span>
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{days} of {total} days remaining</p>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color.replace('text-', 'bg-')}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function LeaveBalanceWidget({ employeeId }: { employeeId: number }) {
    const { data: balances, isLoading } = useQuery({
        queryKey: ['leaveBalances', employeeId],
        queryFn: async () => {
            const res = await leaveApi.getBalances(employeeId);
            return res.data;
        },
        enabled: !!employeeId,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!balances) return null;

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <FiCalendar className="w-4 h-4" /> Your Leave Balances — {new Date().getFullYear()}
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <BalanceCard
                    label="Annual Leave"
                    days={balances.annualBalance ?? 0}
                    total={21}
                    color="text-blue-600"
                    bgColor="bg-blue-100"
                    icon={<FiSun className="w-4 h-4 text-blue-500" />}
                />
                <BalanceCard
                    label="Sick Leave"
                    days={balances.sickBalance ?? 0}
                    total={14}
                    color="text-orange-500"
                    bgColor="bg-orange-100"
                    icon={<FiHeart className="w-4 h-4 text-orange-500" />}
                />
                <BalanceCard
                    label="Maternity"
                    days={balances.maternityBalance ?? 0}
                    total={90}
                    color="text-pink-500"
                    bgColor="bg-pink-100"
                    icon={<FiUser className="w-4 h-4 text-pink-500" />}
                />
                <BalanceCard
                    label="Paternity"
                    days={balances.paternityBalance ?? 0}
                    total={14}
                    color="text-indigo-600"
                    bgColor="bg-indigo-100"
                    icon={<FiUser className="w-4 h-4 text-indigo-500" />}
                />
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LeaveManagementPage() {
    const user = useAuthStore((state) => state.user);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [approvalLeave, setApprovalLeave] = useState<any | null>(null);

    const isApprover =
        user?.role === 'DEPARTMENT_HEAD' ||
        user?.role === 'HR_OFFICER' ||
        user?.role === 'ADMIN';
    const [viewMode, setViewMode] = useState<'MY_REQUESTS' | 'PENDING_APPROVALS'>(
        isApprover ? 'PENDING_APPROVALS' : 'MY_REQUESTS'
    );

    const employeeId = user?.employee?.id ? Number(user.employee.id) : undefined;

    const { data: leaves = [], isLoading } = useQuery({
        queryKey: ['leaveRequests', statusFilter, viewMode],
        queryFn: async () => {
            if (viewMode === 'PENDING_APPROVALS') {
                const res = await leaveApi.getPending();
                const items = Array.isArray(res.data) ? res.data : [];
                return statusFilter !== 'ALL'
                    ? items.filter((i: any) => i.status === statusFilter)
                    : items;
            }
            const res = await leaveApi.list(
                statusFilter !== 'ALL' ? { status: statusFilter } : undefined
            );
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const handleViewDetail = (leaveId: number) => {
        setSelectedLeaveId(leaveId);
        setIsDetailOpen(true);
    };

    const columns: Column<any>[] = [
        {
            key: 'employee',
            header: 'Employee',
            render: (r) => r.employee?.name || user?.employee?.firstName || 'Unknown',
        },
        {
            key: 'leaveType',
            header: 'Type',
            render: (r) => (
                <span className="capitalize">{r.leaveType.toLowerCase().replace('_', ' ')}</span>
            ),
        },
        {
            key: 'dates',
            header: 'Dates',
            render: (r) =>
                `${format(new Date(r.startDate), 'MMM d, yy')} - ${format(
                    new Date(r.endDate),
                    'MMM d, yy'
                )}`,
        },
        {
            key: 'status',
            header: 'Status',
            render: (r) => {
                const variants: Record<
                    string,
                    'info' | 'approved' | 'rejected' | 'neutral' | 'warning'
                > = {
                    PENDING: 'warning',
                    APPROVED: 'approved',
                    REJECTED: 'rejected',
                    CANCELLED: 'neutral',
                };
                return (
                    <Badge variant={variants[r.status] || 'neutral'}>{r.status}</Badge>
                );
            },
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r) => {
                const canProcess =
                    viewMode === 'PENDING_APPROVALS' && r.status === 'PENDING';

                if (canProcess) {
                    return (
                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setApprovalLeave(r)}
                            >
                                Review
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetail(r.id)}
                            >
                                View
                            </Button>
                        </div>
                    );
                }

                return (
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetail(r.id)}>
                        View
                    </Button>
                );
            },
        },
    ];

    return (
        <div className="space-y-5">
            {/* Header card */}
            <Card>
                <CardHeader
                    title="Leave Management"
                    subtitle="Manage time off requests and balances"
                    action={
                        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                            + Request Leave
                        </Button>
                    }
                />
            </Card>

            {/* Balance widget (only in My Requests view for employees) */}
            {viewMode === 'MY_REQUESTS' && employeeId && (
                <LeaveBalanceWidget employeeId={employeeId} />
            )}

            {/* View / Status filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {isApprover && (
                    <div className="flex gap-2">
                        <Button
                            variant={viewMode === 'PENDING_APPROVALS' ? 'primary' : 'ghost'}
                            onClick={() => {
                                setViewMode('PENDING_APPROVALS');
                                setStatusFilter('ALL');
                            }}
                            size="sm"
                        >
                            Team Approvals
                        </Button>
                        <Button
                            variant={viewMode === 'MY_REQUESTS' ? 'primary' : 'ghost'}
                            onClick={() => setViewMode('MY_REQUESTS')}
                            size="sm"
                        >
                            My Requests
                        </Button>
                    </div>
                )}

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
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={leaves}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage="No leave requests found."
            />

            {/* Modals */}
            <LeaveRequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            <LeaveDetailModal
                isOpen={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedLeaveId(null);
                }}
                leaveId={selectedLeaveId}
            />

            <LeaveApprovalModal
                isOpen={!!approvalLeave}
                leave={approvalLeave}
                onClose={() => setApprovalLeave(null)}
            />
        </div>
    );
}

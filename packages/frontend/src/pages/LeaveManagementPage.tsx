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
import { DeptHeadReviewModal } from '../features/leave/DeptHeadReviewModal';
import {
    FiCalendar, FiSun, FiHeart, FiUser, FiClock,
    FiActivity,
} from 'react-icons/fi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
    DEPT_HEAD: 'Dept Head Review',
    HR_OFFICER: 'HR Approval',
    DEAN: 'Dean Approval',
    VICE_PRESIDENT: 'VP Approval',
};

const STAGE_COLORS: Record<string, string> = {
    DEPT_HEAD: 'bg-yellow-100 text-yellow-800',
    HR_OFFICER: 'bg-blue-100 text-blue-800',
    DEAN: 'bg-teal-100 text-teal-800',
    VICE_PRESIDENT: 'bg-purple-100 text-purple-800',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
    ANNUAL: 'Annual',
    SICK: 'Sick',
    MATERNITY: 'Maternity',
    PATERNITY: 'Paternity',
    PERSONAL: 'Personal',
    STUDY: 'Study',
    RESEARCH: 'Research',
    SABBATICAL: 'Sabbatical',
    UNPAID: 'Unpaid',
};

// ─── Balance Cards ────────────────────────────────────────────────────────────

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
        queryFn: () => leaveApi.getBalances(employeeId).then(r => r.data),
        enabled: !!employeeId,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
                ))}
            </div>
        );
    }
    if (!balances) return null;

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <FiCalendar className="w-4 h-4" /> Leave Balances — {new Date().getFullYear()}
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <BalanceCard label="Annual" days={balances.annualBalance ?? 0} total={30}
                    color="text-blue-600" bgColor="bg-blue-100"
                    icon={<FiSun className="w-4 h-4 text-blue-500" />} />
                <BalanceCard label="Sick" days={balances.sickBalance ?? 0} total={180}
                    color="text-orange-500" bgColor="bg-orange-100"
                    icon={<FiHeart className="w-4 h-4 text-orange-500" />} />
                <BalanceCard label="Maternity" days={balances.maternityBalance ?? 0} total={120}
                    color="text-pink-500" bgColor="bg-pink-100"
                    icon={<FiUser className="w-4 h-4 text-pink-500" />} />
                <BalanceCard label="Paternity" days={balances.paternityBalance ?? 0} total={10}
                    color="text-indigo-600" bgColor="bg-indigo-100"
                    icon={<FiUser className="w-4 h-4 text-indigo-500" />} />
                <BalanceCard label="Personal" days={balances.personalBalance ?? 0} total={3}
                    color="text-purple-600" bgColor="bg-purple-100"
                    icon={<FiClock className="w-4 h-4 text-purple-500" />} />
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewMode = 'MY_REQUESTS' | 'PENDING_APPROVALS' | 'ALL_CAMPUS';

export default function LeaveManagementPage() {
    const user = useAuthStore((state) => state.user);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [approvalLeave, setApprovalLeave] = useState<any | null>(null);
    const [deptHeadLeave, setDeptHeadLeave] = useState<any | null>(null);

    const privileges: string[] = (user as any)?.specialPrivileges ?? [];

    // Determine role capabilities
    const isDeptHead = user?.role === 'DEPARTMENT_HEAD';
    const isHrOrAdmin = user?.role === 'HR_OFFICER' || user?.role === 'ADMIN';
    const isDean = privileges.includes('DEAN');
    const isVP = privileges.includes('VICE_PRESIDENT') || privileges.includes('UNIVERSITY_PRESIDENT');
    const isEmployee = user?.role === 'EMPLOYEE';

    const isFinalApprover = isHrOrAdmin || isDean || isVP;
    const isAnyApprover = isDeptHead || isFinalApprover;

    const defaultView: ViewMode = isAnyApprover ? 'PENDING_APPROVALS' : 'MY_REQUESTS';
    const [viewMode, setViewMode] = useState<ViewMode>(defaultView);

    const employeeId = (user as any)?.employee?.id
        ? Number((user as any).employee.id)
        : undefined;

    const { data: leaves = [], isLoading } = useQuery({
        queryKey: ['leaveRequests', statusFilter, viewMode],
        queryFn: async () => {
            let items: any[] = [];

            if (viewMode === 'PENDING_APPROVALS') {
                const res = await leaveApi.getPending();
                items = Array.isArray(res.data) ? res.data : [];
            } else if (viewMode === 'ALL_CAMPUS') {
                const res = await leaveApi.getAllCampusRequests();
                items = Array.isArray(res.data) ? res.data : [];
            } else {
                const res = await leaveApi.list();
                items = Array.isArray(res.data) ? res.data : [];
            }

            if (statusFilter !== 'ALL') {
                items = items.filter((i: any) => i.status === statusFilter);
            }
            return items;
        },
    });

    const handleViewDetail = (id: number) => {
        setSelectedLeaveId(id);
        setIsDetailOpen(true);
    };

    // ── Table columns ────────────────────────────────────────────────────────

    const columns: Column<any>[] = [
        {
            key: 'employee',
            header: 'Employee',
            render: (r) => (
                <div>
                    <p className="font-medium text-gray-900 text-sm">
                        {r.employee?.name || (user as any)?.employee?.name || 'You'}
                    </p>
                    {r.employee?.position && (
                        <p className="text-xs text-gray-400">{r.employee.position}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'leaveType',
            header: 'Type',
            render: (r) => (
                <span className="text-sm font-medium">
                    {LEAVE_TYPE_LABELS[r.leaveType] ?? r.leaveType}
                </span>
            ),
        },
        {
            key: 'dates',
            header: 'Period',
            render: (r) =>
                `${format(new Date(r.startDate), 'MMM d')} – ${format(new Date(r.endDate), 'MMM d, yy')}`,
        },
        {
            key: 'days',
            header: 'Days',
            render: (r) => <span className="text-sm font-semibold">{r.days}</span>,
        },
        {
            key: 'stage',
            header: 'Stage',
            render: (r) => {
                if (r.status !== 'PENDING') return null;
                const label = STAGE_LABELS[r.currentStage] ?? r.currentStage;
                const cls = STAGE_COLORS[r.currentStage] ?? 'bg-gray-100 text-gray-700';
                return (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
                        {label}
                    </span>
                );
            },
        },
        {
            key: 'status',
            header: 'Status',
            render: (r) => {
                const variants: Record<string, any> = {
                    PENDING: 'warning',
                    APPROVED: 'approved',
                    REJECTED: 'rejected',
                    CANCELLED: 'neutral',
                };
                return <Badge variant={variants[r.status] ?? 'neutral'}>{r.status}</Badge>;
            },
        },
        {
            key: 'actions',
            header: '',
            render: (r) => {
                // Dept head can review requests at DEPT_HEAD stage
                if (isDeptHead && r.status === 'PENDING' && r.currentStage === 'DEPT_HEAD') {
                    return (
                        <div className="flex gap-2">
                            <Button variant="primary" size="sm" onClick={() => setDeptHeadLeave(r)}>
                                Review
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(r.id)}>
                                View
                            </Button>
                        </div>
                    );
                }

                // Final approvers (HR / Dean / VP) see requests at their stage
                if (isFinalApprover && r.status === 'PENDING' && r.currentStage !== 'DEPT_HEAD') {
                    return (
                        <div className="flex gap-2">
                            <Button variant="primary" size="sm" onClick={() => setApprovalLeave(r)}>
                                Decide
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(r.id)}>
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

    // ── View tabs ────────────────────────────────────────────────────────────

    const viewTabs: { mode: ViewMode; label: string; show: boolean }[] = [
        { mode: 'MY_REQUESTS', label: 'My Requests', show: true },
        { mode: 'PENDING_APPROVALS', label: isDeptHead ? 'Dept Approvals' : 'Pending Approvals', show: isAnyApprover },
        { mode: 'ALL_CAMPUS', label: 'All Campus', show: isHrOrAdmin },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <Card>
                <CardHeader
                    title="Leave Management"
                    subtitle="Manage time off requests across the two-stage approval workflow"
                    action={
                        (isEmployee || isHrOrAdmin) && (
                            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                                + Request Leave
                            </Button>
                        )
                    }
                />
            </Card>

            {/* Balance widget — only in My Requests view */}
            {viewMode === 'MY_REQUESTS' && employeeId && (
                <LeaveBalanceWidget employeeId={employeeId} />
            )}

            {/* Info bar for current role */}
            {isAnyApprover && viewMode === 'PENDING_APPROVALS' && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-center gap-2">
                    <FiActivity className="w-3.5 h-3.5 shrink-0" />
                    {isDeptHead && 'Showing leaves awaiting your review (Stage 1 — Department). Approved requests are forwarded to the next stage.'}
                    {isHrOrAdmin && !isDeptHead && 'Showing leaves forwarded to HR for final approval. Use "All Campus" tab for the full record.'}
                    {isDean && !isHrOrAdmin && 'Showing complex leaves (Sabbatical, Research, Unpaid) forwarded to Dean for review (campus scope).'}
                    {isVP && !isHrOrAdmin && 'Showing complex leaves (Sabbatical, Research, Unpaid) forwarded to VP Academic for review (university-wide).'}
                </div>
            )}

            {/* View / Status filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                {/* View tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {viewTabs.filter(t => t.show).map(t => (
                        <button
                            key={t.mode}
                            onClick={() => { setViewMode(t.mode); setStatusFilter('ALL'); }}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                viewMode === t.mode
                                    ? 'bg-white shadow text-gray-900'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Status filter chips */}
                <div className="flex gap-1">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                statusFilter === s
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={leaves}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage={
                    viewMode === 'PENDING_APPROVALS'
                        ? 'No pending leave requests require your attention.'
                        : 'No leave requests found.'
                }
            />

            {/* Modals */}
            <LeaveRequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            <LeaveDetailModal
                isOpen={isDetailOpen}
                onClose={() => { setIsDetailOpen(false); setSelectedLeaveId(null); }}
                leaveId={selectedLeaveId}
            />

            {/* Stage 1 — Department Head review modal */}
            <DeptHeadReviewModal
                isOpen={!!deptHeadLeave}
                leave={deptHeadLeave}
                onClose={() => setDeptHeadLeave(null)}
            />

            {/* Stage 2 — Final approver modal */}
            <LeaveApprovalModal
                isOpen={!!approvalLeave}
                leave={approvalLeave}
                onClose={() => setApprovalLeave(null)}
            />
        </div>
    );
}

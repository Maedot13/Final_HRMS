import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader } from '../components/ui/Card';
import { FiUsers, FiCalendar, FiBriefcase, FiCheckCircle, FiClock, FiTrendingUp } from 'react-icons/fi';
import apiClient from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const ADMIN_ROLES = ['ADMIN', 'HR_OFFICER', 'DEPARTMENT_HEAD'];

// Stats fetcher for admins/managers — sees org-wide metrics
const fetchAdminStats = async () => {
    try {
        const [usersRes, leaveRes, jobsRes, clearanceRes] = await Promise.all([
            apiClient.get('/users?limit=1').catch(() => ({ data: { total: 0 } })),
            apiClient.get('/leave/pending').catch(() => ({ data: [] })),
            apiClient.get('/recruitment/postings?status=OPEN').catch(() => ({ data: [] })),
            apiClient.get('/clearance/requests?status=PENDING').catch(() => ({ data: [] })),
        ]);

        return {
            totalEmployees: usersRes.data.total || usersRes.data?.length || 0,
            pendingLeave: Array.isArray(leaveRes.data) ? leaveRes.data.length : (Array.isArray(leaveRes.data?.data) ? leaveRes.data.data.length : (leaveRes.data?.total || 0)),
            openJobs: Array.isArray(jobsRes.data) ? jobsRes.data.length : (Array.isArray(jobsRes.data?.data) ? jobsRes.data.data.length : (jobsRes.data?.total || 0)),
            pendingClearance: Array.isArray(clearanceRes.data) ? clearanceRes.data.length : (Array.isArray(clearanceRes.data?.data) ? clearanceRes.data.data.length : (clearanceRes.data?.total || 0)),
        };
    } catch {
        return { totalEmployees: 0, pendingLeave: 0, openJobs: 0, pendingClearance: 0 };
    }
};

// Stats fetcher for regular employees — sees only personal data
const fetchEmployeeStats = async () => {
    try {
        const [myLeaveRes, jobsRes] = await Promise.all([
            apiClient.get('/leave').catch(() => ({ data: [] })),
            apiClient.get('/recruitment/postings?status=OPEN').catch(() => ({ data: [] })),
        ]);

        const myLeaves = Array.isArray(myLeaveRes.data) ? myLeaveRes.data : (Array.isArray(myLeaveRes.data?.data) ? myLeaveRes.data.data : []);
        const pendingLeave = myLeaves.filter((l: any) => l.status === 'PENDING').length;
        const approvedLeave = myLeaves.filter((l: any) => l.status === 'APPROVED').length;
        const openJobs = Array.isArray(jobsRes.data) ? jobsRes.data.length : (Array.isArray(jobsRes.data?.data) ? jobsRes.data.data.length : 0);

        return { pendingLeave, approvedLeave, totalRequests: myLeaves.length, openJobs };
    } catch {
        return { pendingLeave: 0, approvedLeave: 0, totalRequests: 0, openJobs: 0 };
    }
};

export default function DashboardPage() {
    const navigate = useNavigate();
    const user = useAuthStore(state => state.user);
    const isAdmin = ADMIN_ROLES.includes(user?.role || '');

    const { data: adminStats, isLoading: adminLoading } = useQuery({
        queryKey: ['dashboard-admin-stats'],
        queryFn: fetchAdminStats,
        refetchInterval: 60000,
        enabled: isAdmin,
    });

    const { data: empStats, isLoading: empLoading } = useQuery({
        queryKey: ['dashboard-employee-stats'],
        queryFn: fetchEmployeeStats,
        refetchInterval: 60000,
        enabled: !isAdmin,
    });

    const isLoading = isAdmin ? adminLoading : empLoading;

    // Admin/Manager cards — org-wide metrics
    const adminCards = [
        {
            title: 'Total Employees',
            value: adminStats?.totalEmployees ?? '-',
            icon: FiUsers,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
        },
        {
            title: 'Pending Leaves',
            value: adminStats?.pendingLeave ?? '-',
            icon: FiCalendar,
            color: 'text-orange-600',
            bg: 'bg-orange-100',
        },
        {
            title: 'Open Jobs',
            value: adminStats?.openJobs ?? '-',
            icon: FiBriefcase,
            color: 'text-green-600',
            bg: 'bg-green-100',
        },
        {
            title: 'Pending Clearance',
            value: adminStats?.pendingClearance ?? '-',
            icon: FiCheckCircle,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
        },
    ];

    // Regular employee cards — personal metrics only
    const employeeCards = [
        {
            title: 'My Pending Leaves',
            value: empStats?.pendingLeave ?? '-',
            icon: FiClock,
            color: 'text-orange-600',
            bg: 'bg-orange-100',
        },
        {
            title: 'Approved Leaves',
            value: empStats?.approvedLeave ?? '-',
            icon: FiCheckCircle,
            color: 'text-green-600',
            bg: 'bg-green-100',
        },
        {
            title: 'Total Requests',
            value: empStats?.totalRequests ?? '-',
            icon: FiTrendingUp,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
        },
        {
            title: 'Open Jobs',
            value: empStats?.openJobs ?? '-',
            icon: FiBriefcase,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
        },
    ];

    const statCards = isAdmin ? adminCards : employeeCards;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Welcome back, {user?.employee?.name || user?.employee?.firstName || 'User'}! 
                    <span className="ml-1 font-semibold text-primary">
                        ({user?.role === 'ADMIN' ? (user.scope === 'UNIVERSITY' ? 'Super Admin' : 'Campus Admin') : user?.role.replace('_', ' ')})
                    </span>
                    . Here is what's happening today.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <Card key={i} className="hover:shadow-lg transition-shadow duration-300 border-none shadow bg-white" padding="md">
                        <CardHeader 
                            title={stat.title}
                            action={
                                <div className={`p-2 rounded-full ${stat.bg}`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                            }
                        />
                        <div className="mt-4">
                            <div className="text-3xl font-bold text-gray-900">
                                {isLoading ? (
                                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                                ) : (
                                    stat.value
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Updates real-time</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Recent Activities */}
                <Card className="border-none shadow bg-white h-full">
                    <CardHeader title="Recent Activities" />
                    <div className="mt-4 flex items-center justify-center p-8 text-gray-400 text-sm italic bg-gray-50 rounded-lg">
                        Activity feed will appear here...
                    </div>
                </Card>

                {/* Quick Actions */}
                <Card className="border-none shadow bg-white h-full">
                    <CardHeader title="Quick Actions" />
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => navigate('/leave')}
                            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 text-left transition-colors"
                        >
                            <FiCalendar className="w-6 h-6 text-primary mb-2" />
                            <div className="font-medium text-gray-900">Request Leave</div>
                            <div className="text-xs text-gray-500 mt-1">Submit a new time-off request</div>
                        </button>
                        <button 
                            onClick={() => navigate('/profile')}
                            className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 text-left transition-colors"
                        >
                            <FiUsers className="w-6 h-6 text-primary mb-2" />
                            <div className="font-medium text-gray-900">My Profile</div>
                            <div className="text-xs text-gray-500 mt-1">View your profile & leave balance</div>
                        </button>
                        {!isAdmin && (
                            <button 
                                onClick={() => navigate('/evaluations')}
                                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 text-left transition-colors"
                            >
                                <FiTrendingUp className="w-6 h-6 text-primary mb-2" />
                                <div className="font-medium text-gray-900">My Efficiency</div>
                                <div className="text-xs text-gray-500 mt-1">View your performance metrics</div>
                            </button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

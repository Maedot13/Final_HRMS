import { createBrowserRouter } from 'react-router-dom';
import ComponentSandboxPage from '../pages/ComponentSandboxPage';
import CampusesPage from '../pages/CampusesPage';
import CampusDetailPage from '../pages/CampusDetailPage';
import DepartmentsPage from '../pages/DepartmentsPage';
import UsersPage from '../pages/UsersPage';
import EmployeeDetailPage from '../pages/EmployeeDetailPage';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { RequireAuth, RequireNoAuth, RequireRole } from './guards';
import { LoginForm } from '../features/auth/LoginForm';
import { ChangePasswordForm } from '../features/auth/ChangePasswordForm';
import ProfilePage from '../pages/ProfilePage';
import ErrorPage from '../pages/ErrorPage';
import DashboardPage from '../pages/DashboardPage';
import LeaveManagementPage from '../pages/LeaveManagementPage';
import ClearancePage from '../pages/ClearancePage';
import RecruitmentPage from '../pages/RecruitmentPage';
import AuditLogsPage from '../pages/AuditLogsPage';
import ContactDirectoryPage from '../pages/ContactDirectoryPage';
import AdminOrgPage from '../pages/admin/AdminOrgPage';
import ClearanceBodiesPage from '../pages/admin/ClearanceBodiesPage';
import PrivilegesPage from '../pages/admin/PrivilegesPage';
import ClearanceBodyDashboard from '../pages/ClearanceBodyDashboard';
import HeadHRClearancePage from '../pages/HeadHRClearancePage';
import PayrollPage from '../pages/PayrollPage';
import FinancePage from '../pages/FinancePage';

const router = createBrowserRouter([
    {
        path: '/login',
        element: (
            <RequireNoAuth>
                <AuthLayout subtitle="Sign in with your employee ID to access HR tools.">
                    <LoginForm />
                </AuthLayout>
            </RequireNoAuth>
        ),
        errorElement: <ErrorPage />,
    },
    {
        path: '/force-password-change',
        element: (
            <AuthLayout title="Update your password" subtitle="For security reasons, you must change your password before continuing.">
                <ChangePasswordForm />
            </AuthLayout>
        ),
    },
    {
        path: '/',
        element: (
            <RequireAuth>
                <DashboardLayout />
            </RequireAuth>
        ),
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <DashboardPage />,
            },
            {
                path: 'leave',
                element: <LeaveManagementPage />,
            },
            {
                path: 'approvals/leave',
                element: <LeaveManagementPage />,
            },
            {
                path: 'clearance',
                element: <ClearancePage />,
            },
            {
                path: 'clearance-body',
                element: <ClearanceBodyDashboard />,
            },
            {
                path: 'jobs',
                element: <RecruitmentPage />,
            },
            {
                path: 'audit-logs',
                element: (
                    <RequireRole allowedRoles={[]}>
                        <AuditLogsPage />
                    </RequireRole>
                ),
            },
            {
                path: 'admin/org',
                element: (
                    <RequireRole allowedRoles={['ADMIN']}>
                        <AdminOrgPage />
                    </RequireRole>
                ),
            },
            {
                path: 'admin/clearance-bodies',
                element: (
                    <RequireRole allowedRoles={['ADMIN']}>
                        <ClearanceBodiesPage />
                    </RequireRole>
                ),
            },
            {
                path: 'admin/privileges',
                element: (
                    <RequireRole allowedRoles={['ADMIN']}>
                        <PrivilegesPage />
                    </RequireRole>
                ),
            },
            {
                path: 'sandbox',
                element: <ComponentSandboxPage />,
            },
            {
                path: 'campuses',
                element: (
                    <RequireRole allowedRoles={['SUPER_ADMIN']}>
                        <CampusesPage />
                    </RequireRole>
                ),
            },
            {
                path: 'campuses/:id',
                element: (
                    <RequireRole allowedRoles={['SUPER_ADMIN']}>
                        <CampusDetailPage />
                    </RequireRole>
                ),
            },
            {
                path: 'departments',
                element: (
                    <RequireRole allowedRoles={[]}>
                        <DepartmentsPage />
                    </RequireRole>
                ),
            },
            {
                path: 'users',
                element: (
                    <RequireRole allowedRoles={['HR_OFFICER', 'DEPARTMENT_HEAD']}>
                        <UsersPage />
                    </RequireRole>
                ),
            },
            {
                path: 'employees/:id',
                element: <EmployeeDetailPage />,
            },
            {
                path: 'profile',
                element: <ProfilePage />,
            },
            {
                path: 'contacts',
                element: <ContactDirectoryPage />,
            },
        ],
    },
    // Head HR Role Dashboard Routes
    {
        path: '/hr',
        element: (
            <RequireAuth>
                <DashboardLayout />
            </RequireAuth>
        ),
        errorElement: <ErrorPage />,
        children: [
            {
                path: 'employees',
                element: <UsersPage />, // Reuse UsersPage as employees listing
            },
            {
                path: 'leave/approvals',
                element: <LeaveManagementPage />,
            },
            {
                path: 'performance',
                // Placeholder if Page doesn't exist yet, wait, we don't have performance page yet, map to Dashboard
                element: <DashboardPage />, 
            },
            {
                path: 'payroll',
                element: <PayrollPage />,
            },
            {
                path: 'finance',
                element: (
                    <RequireRole allowedRoles={['FINANCE_OFFICER']}>
                        <FinancePage />
                    </RequireRole>
                ),
            },
            {
                path: 'clearance',
                element: <HeadHRClearancePage />,
            },
            {
                path: 'experience',
                element: <DashboardPage />,
            }
        ]
    },
    // Super Admin Role Dashboard Routes
    {
        path: '/super',
        element: (
            <RequireAuth>
                <DashboardLayout />
            </RequireAuth>
        ),
        errorElement: <ErrorPage />,
        children: [
            {
                path: 'users',
                element: (
                    <RequireRole allowedRoles={['SUPER_ADMIN']}>
                        <UsersPage />
                    </RequireRole>
                ),
            },
            {
                path: 'activity-logs',
                element: (
                    <RequireRole allowedRoles={['SUPER_ADMIN']}>
                        <AuditLogsPage />
                    </RequireRole>
                ),
            },
            {
                path: 'campuses',
                element: (
                    <RequireRole allowedRoles={['SUPER_ADMIN']}>
                        <CampusesPage />
                    </RequireRole>
                ),
            }
        ]
    }
]);

export default router;

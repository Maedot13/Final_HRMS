import { createBrowserRouter } from 'react-router-dom';
import ComponentSandboxPage from '../pages/ComponentSandboxPage';
import CampusesPage from '../pages/CampusesPage';
import CampusDetailPage from '../pages/CampusDetailPage';
import DepartmentsPage from '../pages/DepartmentsPage';
import UsersPage from '../pages/UsersPage';
import EmployeeDetailPage from '../pages/EmployeeDetailPage';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { RequireAuth, RequireNoAuth } from './guards';
import { LoginForm } from '../features/auth/LoginForm';
import { ChangePasswordForm } from '../features/auth/ChangePasswordForm';
import ProfilePage from '../pages/ProfilePage';
import ErrorPage from '../pages/ErrorPage';
import DashboardPage from '../pages/DashboardPage';
import LeaveManagementPage from '../pages/LeaveManagementPage';
import ClearancePage from '../pages/ClearancePage';
import RecruitmentPage from '../pages/RecruitmentPage';
import AuditLogsPage from '../pages/AuditLogsPage';
import SettingsPage from '../pages/SettingsPage';
import ContactDirectoryPage from '../pages/ContactDirectoryPage';

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
                path: 'clearance',
                element: <ClearancePage />,
            },
            {
                path: 'jobs',
                element: <RecruitmentPage />,
            },
            {
                path: 'audit-logs',
                element: <AuditLogsPage />,
            },
            {
                path: 'settings',
                element: <SettingsPage />,
            },
            {
                path: 'sandbox',
                element: <ComponentSandboxPage />,
            },
            {
                path: 'campuses',
                element: <CampusesPage />,
            },
            {
                path: 'campuses/:id',
                element: <CampusDetailPage />,
            },
            {
                path: 'departments',
                element: <DepartmentsPage />,
            },
            {
                path: 'users',
                element: <UsersPage />,
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
]);

export default router;

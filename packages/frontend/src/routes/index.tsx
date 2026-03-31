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
        children: [
            {
                index: true,
                element: <div>Dashboard Content Pending</div>,
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
        ],
    },
]);

export default router;

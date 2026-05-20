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
import AppraisalsPage from '../pages/AppraisalsPage';
import EvaluationFormPage from '../pages/EvaluationFormPage';
import EvaluationApprovalPage from '../pages/EvaluationApprovalPage';
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
                // Audit logs: HR_OFFICER can review campus-level audit trail.
                // ADMIN excluded — org admin does not need audit visibility.
                // SUPER_ADMIN accesses audit via /super/activity-logs.
                element: (
                    <RequireRole allowedRoles={['HR_OFFICER']}>
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
                // Departments: ADMIN manages campus department structure.
                // HR_OFFICER can read departments (for employee assignment).
                // SUPER_ADMIN uses /super/campuses for structure.
                element: (
                    <RequireRole allowedRoles={['ADMIN', 'HR_OFFICER']}>
                        <DepartmentsPage />
                    </RequireRole>
                ),
            },
            {
                path: 'users',
                // Employee directory: HR_OFFICER manages, DEPARTMENT_HEAD can view.
                // ADMIN excluded — Admin does not manage individual employee records.
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
            {
                path: 'evaluations',
                element: <AppraisalsPage />,
            },
            {
                path: 'evaluations/new',
                element: <EvaluationFormPage />,
            },
            {
                path: 'evaluations/approvals',
                element: <EvaluationApprovalPage />,
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
                // HR Officer employee management route — gated at layout level via RequireAuth.
                // Additional role guard here ensures only HR Officer accesses /hr/* paths.
                element: (
                    <RequireRole allowedRoles={['HR_OFFICER']}>
                        <UsersPage />
                    </RequireRole>
                ),
            },
            {
                path: 'leave/approvals',
                element: (
                    <RequireRole allowedRoles={['HR_OFFICER']}>
                        <LeaveManagementPage />
                    </RequireRole>
                ),
            },
            {
                path: 'performance',
                element: (
                    <RequireRole allowedRoles={['HR_OFFICER']}>
                        <EvaluationApprovalPage />
                    </RequireRole>
                ),
            },
            {
                path: 'payroll',
                // Payroll generation: HR_OFFICER only. ADMIN and FINANCE_OFFICER excluded.
                // Finance Officer views sent reports via /hr/finance (FinancePage).
                element: (
                    <RequireRole allowedRoles={['HR_OFFICER']}>
                        <PayrollPage />
                    </RequireRole>
                ),
            },
            {
                path: 'finance',
                // Finance dashboard: FINANCE_OFFICER only.
                // HR_OFFICER generates payroll but does not access Finance's report view.
                // ADMIN has no access to Finance domain.
                element: (
                    <RequireRole allowedRoles={['FINANCE_OFFICER']}>
                        <FinancePage />
                    </RequireRole>
                ),
            },
            {
                path: 'clearance',
                element: (
                    <RequireRole allowedRoles={['HR_OFFICER']}>
                        <HeadHRClearancePage />
                    </RequireRole>
                ),
            },
            {
                path: 'experience',
                element: (
                    <RequireRole allowedRoles={['HR_OFFICER']}>
                        <DashboardPage />
                    </RequireRole>
                ),
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

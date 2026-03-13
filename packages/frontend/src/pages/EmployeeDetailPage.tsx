import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { employeesApi } from '../api/employees';
import { usersApi } from '../api/users';
import type { EmployeeDetail, ApiError, ContactInfo } from '../types';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProfileHeader } from '../components/shared/ProfileHeader';
import { ContactInfoForm } from '../features/employee/ContactInfoForm';
import { RoleManagerModal } from '../features/employee/RoleManagerModal';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';

type TabId = 'basic' | 'contract' | 'job';

const tabs: { id: TabId; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'contract', label: 'Contract' },
    { id: 'job', label: 'Job Info' },
];

export default function EmployeeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<TabId>('basic');
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [contactEditMode, setContactEditMode] = useState(false);
    const [updateError, setUpdateError] = useState<ApiError | null>(null);

    const employeeId = id ? parseInt(id, 10) : NaN;

    const { data: employee, isLoading } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: async () => {
            const res = await employeesApi.getById(employeeId);
            return res.data;
        },
        enabled: !isNaN(employeeId),
    });

    const { data: userDetail } = useQuery({
        queryKey: ['user', employee?.userId],
        queryFn: async () => {
            if (!employee?.userId) return null;
            const res = await usersApi.getById(employee.userId);
            return res.data;
        },
        enabled: !!employee?.userId && (user?.role === 'ADMIN' || user?.role === 'HR_OFFICER'),
    });

    const updateMutation = useMutation({
        mutationFn: (data: { contactInfo?: ContactInfo }) =>
            employeesApi.update(employeeId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
            setContactEditMode(false);
            setUpdateError(null);
        },
        onError: (err: { response?: { data?: ApiError } }) => {
            setUpdateError(err.response?.data ?? { code: 'ERROR', message: 'Update failed' });
        },
    });

    const updateRoleMutation = useMutation({
        mutationFn: (role: string) => usersApi.updateRole(employee!.userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', employee?.userId] });
            queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
            setRoleModalOpen(false);
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: (isActive: boolean) =>
            usersApi.updateStatus(employee!.userId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', employee?.userId] });
            queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
            setRoleModalOpen(false);
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: () => usersApi.resetPassword(employee!.userId),
        onSuccess: () => setRoleModalOpen(false),
    });

    const canEdit = user?.role === 'ADMIN' || user?.role === 'HR_OFFICER';
    const canManageRoles = user?.role === 'ADMIN';
    const isSelf = user && employee && String(user.id) === String(employee.userId);

    const contactInfo =
        (employee?.contactInfo as ContactInfo) ?? (employee?.contactInfo as Record<string, unknown>);

    const handleContactSubmit = async (data: ContactInfo) => {
        await updateMutation.mutateAsync({ contactInfo: data });
    };

    if (isNaN(employeeId)) {
        return (
            <div className="rounded-card border border-warning bg-amber-50 p-6 text-center">
                <p className="text-sm text-amber-800">Invalid employee ID.</p>
                <Link to="/users" className="mt-2 inline-block text-sm text-primary hover:underline">
                    Back to workforce directory
                </Link>
            </div>
        );
    }

    if (isLoading || !employee) {
        return (
            <div className="space-y-4">
                <div className="h-24 w-full animate-pulse rounded-card bg-gray-100" />
                <div className="h-64 w-full animate-pulse rounded-card bg-gray-100" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <ProfileHeader
                    employee={employee as EmployeeDetail}
                    user={
                        userDetail
                            ? {
                                  role: userDetail.role,
                                  isActive: userDetail.isActive,
                                  email: userDetail.email,
                              }
                            : null
                    }
                    showRole={canEdit}
                />
                {canEdit && (
                    <div className="flex gap-2">
                        {canManageRoles && !isSelf && employee.userId && (
                            <Button variant="secondary" onClick={() => setRoleModalOpen(true)}>
                                Manage role & status
                            </Button>
                        )}
                        <Link to="/users">
                            <Button variant="ghost">Back to directory</Button>
                        </Link>
                    </div>
                )}
            </div>

            <div className="border-b border-[#E5E7EB]">
                <nav className="flex gap-6" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-text-secondary hover:border-gray-300 hover:text-text-primary'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'basic' && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader
                            title="Contact information"
                            subtitle="Phone, address, and emergency contact"
                            action={
                                canEdit &&
                                !contactEditMode && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setContactEditMode(true)}
                                    >
                                        Edit
                                    </Button>
                                )
                            }
                        />
                        {contactEditMode ? (
                            <ContactInfoForm
                                initialContactInfo={contactInfo}
                                onSubmit={handleContactSubmit}
                                onCancel={() => {
                                    setContactEditMode(false);
                                    setUpdateError(null);
                                }}
                                apiError={updateError}
                                isSubmitting={updateMutation.isPending}
                            />
                        ) : (
                            <div className="space-y-2 text-sm">
                                <p>
                                    <span className="text-text-secondary">Phone:</span>{' '}
                                    {(contactInfo as ContactInfo)?.phone ?? '—'}
                                </p>
                                <p>
                                    <span className="text-text-secondary">Address:</span>{' '}
                                    {(contactInfo as ContactInfo)?.address ?? '—'}
                                </p>
                                {(contactInfo as ContactInfo)?.emergencyContact && (
                                    <p>
                                        <span className="text-text-secondary">Emergency:</span>{' '}
                                        {typeof (contactInfo as ContactInfo).emergencyContact ===
                                        'object' &&
                                        (contactInfo as ContactInfo).emergencyContact !== null
                                            ? (() => {
                                                  const ec = (contactInfo as ContactInfo)
                                                      .emergencyContact as Record<string, string>;
                                                  return [ec?.name, ec?.relationship, ec?.phone]
                                                      .filter(Boolean)
                                                      .join(' · ') || '—';
                                              })()
                                            : String((contactInfo as ContactInfo).emergencyContact)}
                                    </p>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {activeTab === 'contract' && (
                <Card>
                    <CardHeader title="Contract details" />
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">
                                Employment status
                            </dt>
                            <dd className="mt-0.5">
                                <Badge variant="neutral">
                                    {employee.employmentStatus ?? '—'}
                                </Badge>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">
                                Employment type
                            </dt>
                            <dd className="mt-0.5">{employee.employmentType ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">
                                Contract start
                            </dt>
                            <dd className="mt-0.5">
                                {employee.contractStartDate
                                    ? format(
                                          new Date(employee.contractStartDate),
                                          'MMM d, yyyy'
                                      )
                                    : '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">
                                Contract end
                            </dt>
                            <dd className="mt-0.5">
                                {employee.contractEndDate
                                    ? format(
                                          new Date(employee.contractEndDate),
                                          'MMM d, yyyy'
                                      )
                                    : '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">
                                Gross salary
                            </dt>
                            <dd className="mt-0.5">
                                {employee.grossSalary != null
                                    ? new Intl.NumberFormat('en-US', {
                                          style: 'currency',
                                          currency: 'ETB',
                                      }).format(employee.grossSalary)
                                    : '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">
                                Salary type
                            </dt>
                            <dd className="mt-0.5">{employee.salaryType ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">
                                Pay grade
                            </dt>
                            <dd className="mt-0.5">{employee.payGrade ?? '—'}</dd>
                        </div>
                    </dl>
                </Card>
            )}

            {activeTab === 'job' && (
                <Card>
                    <CardHeader title="Job information" />
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">Position</dt>
                            <dd className="mt-0.5">{employee.position ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">Department</dt>
                            <dd className="mt-0.5">
                                {employee.deptLegacy ?? employee.department ?? '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">Hire date</dt>
                            <dd className="mt-0.5">
                                {employee.hireDate
                                    ? format(new Date(employee.hireDate), 'MMM d, yyyy')
                                    : '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-text-secondary">
                                Office location
                            </dt>
                            <dd className="mt-0.5">{employee.officeLocation ?? '—'}</dd>
                        </div>
                    </dl>
                </Card>
            )}

            {canManageRoles && employee.userId && userDetail && (
                <RoleManagerModal
                    isOpen={roleModalOpen}
                    onClose={() => setRoleModalOpen(false)}
                    userName={employee.name}
                    currentRole={userDetail.role}
                    isActive={userDetail.isActive}
                    onUpdateRole={(role) => updateRoleMutation.mutateAsync(role)}
                    onToggleStatus={(isActive) =>
                        updateStatusMutation.mutateAsync(isActive)
                    }
                    onResetPassword={() => resetPasswordMutation.mutateAsync()}
                />
            )}
        </div>
    );
}

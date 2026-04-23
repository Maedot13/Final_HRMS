import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { employeesApi } from '../api/employees';
import type { EmployeeDetail, ApiError, ContactInfo } from '../types';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProfileHeader } from '../components/shared/ProfileHeader';
import { ContactInfoForm } from '../features/employee/ContactInfoForm';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

import { leaveApi } from '../api/leave';

type TabId = 'basic' | 'contract' | 'job' | 'leave';

const tabs: { id: TabId; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'contract', label: 'Contract' },
    { id: 'job', label: 'Job Info' },
    { id: 'leave', label: 'Leave Balance' },
];


export default function ProfilePage() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<TabId>('basic');
    const [contactEditMode, setContactEditMode] = useState(false);
    const [updateError, setUpdateError] = useState<ApiError | null>(null);

    const employeeId = user?.employee?.id ? Number(user.employee.id) : undefined;

    const { data: employee, isLoading } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: async () => {
            if (!employeeId) return null;
            const res = await employeesApi.getById(employeeId);
            return res.data;
        },
        enabled: !!employeeId,
    });

    const { data: balances } = useQuery({
        queryKey: ['leaveBalances', employeeId],
        queryFn: async () => {
            if (!employeeId) return null;
            const res = await leaveApi.getBalances(employeeId);
            return res.data;
        },
        enabled: !!employeeId,
    });


    const updateMutation = useMutation({
        mutationFn: (data: { contactInfo?: ContactInfo }) =>
            employeesApi.update(employeeId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
            setContactEditMode(false);
            setUpdateError(null);
            toast.success('Profile updated successfully');
        },
        onError: (err: { response?: { data?: ApiError } }) => {
            const error = err.response?.data ?? { code: 'ERROR', message: 'Update failed' };
            setUpdateError(error);
            toast.error(error.message);
        },
    });

    const contactInfo =
        (employee?.contactInfo as ContactInfo) ?? (employee?.contactInfo as Record<string, unknown>);

    const handleContactSubmit = async (data: ContactInfo) => {
        await updateMutation.mutateAsync({ contactInfo: data });
    };

    if (user?.role === 'CLEARANCE_BODY') {
        const displayName = user.clearanceUnit?.fullName || user.clearanceUnit?.name || 'Unknown Unit';
        const unitCode = user.clearanceUnit?.name || '';
        return (
            <div className="space-y-6">
                <Card padding="lg">
                    <div className="text-center">
                        <div className="mx-auto h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl font-bold">{unitCode?.[0] || 'C'}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                        {user.clearanceUnit?.fullName && (
                            <p className="text-sm text-gray-400 mt-0.5 font-mono">[{unitCode}]</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1 uppercase tracking-wide">Clearance Body Account</p>
                    </div>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card padding="md">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Login ID / Identity</h3>
                        <p className="text-lg font-medium text-gray-900">{user.employeeId || 'System Managed'}</p>
                    </Card>
                    <Card padding="md">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assigned Campus</h3>
                        <p className="text-lg font-medium text-gray-900">{user.campus?.name || 'Global System'}</p>
                    </Card>
                    <Card padding="md">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Account Status</h3>
                        <div className="mt-1">
                            {user.isActive ? (
                                <Badge variant="approved">Active</Badge>
                            ) : (
                                <Badge variant="rejected">Deactivated</Badge>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (!employeeId) {
        return (
            <div className="rounded-card border border-warning bg-amber-50 p-6 text-center">
                <p className="text-sm text-amber-800">No employee profile linked to your account.</p>
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
                    user={user ? { role: user.role, isActive: user.isActive, email: user.email } : null}
                    showRole={true}
                />
            </div>

            <div className="border-b border-[#E5E7EB]">
                <nav className="flex gap-6" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
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
                            <div className="space-y-2 text-sm p-6 pt-0">
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
                    <dl className="grid gap-4 sm:grid-cols-2 p-6 pt-0">
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
                    <dl className="grid gap-4 sm:grid-cols-2 p-6 pt-0">
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
            {activeTab === 'leave' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card padding="md">
                        <div className="text-center">
                            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Annual Leave</p>
                            <p className="mt-2 text-3xl font-bold text-primary">{balances?.annualBalance ?? 0}</p>
                            <p className="mt-1 text-xs text-text-secondary italic underline decoration-dotted">days remaining</p>
                        </div>
                    </Card>
                    <Card padding="md">
                        <div className="text-center">
                            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Sick Leave</p>
                            <p className="mt-2 text-3xl font-bold text-orange-600">{balances?.sickBalance ?? 0}</p>
                            <p className="mt-1 text-xs text-text-secondary italic underline decoration-dotted">days remaining</p>
                        </div>
                    </Card>
                    <Card padding="md">
                        <div className="text-center">
                            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Maternity</p>
                            <p className="mt-2 text-3xl font-bold text-pink-600">{balances?.maternityBalance ?? 0}</p>
                            <p className="mt-1 text-xs text-text-secondary italic underline decoration-dotted">days remaining</p>
                        </div>
                    </Card>
                    <Card padding="md">
                        <div className="text-center">
                            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Paternity</p>
                            <p className="mt-2 text-3xl font-bold text-blue-600">{balances?.paternityBalance ?? 0}</p>
                            <p className="mt-1 text-xs text-text-secondary italic underline decoration-dotted">days remaining</p>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}


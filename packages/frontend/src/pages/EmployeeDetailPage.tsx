import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { employeesApi } from '../api/employees';
import { usersApi } from '../api/users';
import { departmentApi } from '../api/departments';
import type { EmployeeDetail, ApiError, ContactInfo } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ContactInfoForm } from '../features/employee/ContactInfoForm';
import { HrInfoEditForm } from '../features/employee/HrInfoEditForm';
import { ContractEditForm } from '../features/employee/ContractEditForm';
import { RoleManagerModal } from '../features/employee/RoleManagerModal';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
    FiUser, FiBriefcase, FiCalendar, FiMail, FiPhone, FiMapPin,
    FiEdit2, FiArrowLeft, FiShield, FiDollarSign, FiClock,
    FiHome, FiAlertTriangle,
} from 'react-icons/fi';

type TabId = 'overview' | 'job' | 'contract' | 'contact';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <FiUser size={14} /> },
    { id: 'job', label: 'Job Info', icon: <FiBriefcase size={14} /> },
    { id: 'contract', label: 'Contract', icon: <FiDollarSign size={14} /> },
    { id: 'contact', label: 'Contact', icon: <FiPhone size={14} /> },
];

function InfoRow({ icon, label, value, missing }: { icon: React.ReactNode; label: string; value?: React.ReactNode; missing?: boolean }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
            <div className="mt-0.5 text-gray-400 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`mt-0.5 text-sm font-medium break-words ${missing ? 'text-amber-500 italic' : 'text-gray-800'}`}>
                    {value || (missing ? 'Not set — edit to complete' : '—')}
                </p>
            </div>
        </div>
    );
}

function SectionCard({ title, subtitle, onEdit, children, editMode }: {
    title: string;
    subtitle?: string;
    onEdit?: () => void;
    children: React.ReactNode;
    editMode?: boolean;
}) {
    return (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
                {onEdit && !editMode && (
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                        <FiEdit2 size={12} /> Edit
                    </button>
                )}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function EmployeeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);

    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [contactEditMode, setContactEditMode] = useState(false);
    const [hrEditMode, setHrEditMode] = useState(false);
    const [contractEditMode, setContractEditMode] = useState(false);
    const [updateError, setUpdateError] = useState<ApiError | null>(null);

    const employeeId = id ? parseInt(id, 10) : NaN;

    const { data: employee, isLoading, error: fetchError } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: async () => {
            const res = await employeesApi.getById(employeeId);
            return (res as any).data?.data ?? res.data;
        },
        enabled: !isNaN(employeeId),
        retry: 1,
    });

    const { data: userDetail } = useQuery({
        queryKey: ['user', employee?.userId],
        queryFn: async () => {
            if (!employee?.userId) return null;
            const res = await usersApi.getById(employee.userId);
            return (res as any).data?.data ?? res.data;
        },
        enabled: !!employee?.userId && (user?.role === 'ADMIN' || user?.role === 'HR_OFFICER'),
    });

    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const res = await departmentApi.list();
            return res.data;
        },
        enabled: user?.role === 'ADMIN' || user?.role === 'HR_OFFICER',
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<EmployeeDetail>) => {
            const payload: import('../types').EmployeeUpdatePayload = { ...data } as any;
            return employeesApi.update(employeeId, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
            setContactEditMode(false);
            setHrEditMode(false);
            setContractEditMode(false);
            setUpdateError(null);
            toast.success('Employee profile updated successfully');
        },
        onError: (err: { response?: { data?: ApiError } }) => {
            const error = err.response?.data ?? { code: 'ERROR', message: 'Update failed' };
            setUpdateError(error);
            toast.error(error.message);
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
        mutationFn: (isActive: boolean) => usersApi.updateStatus(employee!.userId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', employee?.userId] });
            queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
            setRoleModalOpen(false);
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: () => usersApi.resetPassword(employee!.userId),
        onSuccess: () => {
            setRoleModalOpen(false);
            toast.success('Password reset email sent');
        },
    });

    const canEdit = user?.role === 'ADMIN' || user?.role === 'HR_OFFICER';
    const canManageRoles = user?.role === 'ADMIN';

    const contactInfo = (employee?.contactInfo as ContactInfo) ?? {};
    const emergencyContact =
        typeof contactInfo?.emergencyContact === 'object' && contactInfo.emergencyContact !== null
            ? (contactInfo.emergencyContact as Record<string, string>)
            : null;

    const incompleteFields = employee
        ? [
            !employee.position && 'Position',
            !employee.departmentId && !employee.deptLegacy && 'Department',
            !employee.employmentType && 'Employment Type',
            !employee.contractStartDate && 'Contract Start',
        ].filter(Boolean)
        : [];

    // ── Guards ────────────────────────────────────────────────────────────────
    if (isNaN(employeeId)) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                <FiAlertTriangle className="mx-auto mb-3 text-amber-400" size={28} />
                <p className="font-medium text-amber-800">Invalid employee ID.</p>
                <Link to="/users" className="mt-3 inline-block text-sm text-primary hover:underline">
                    ← Back to workforce directory
                </Link>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-36 w-full rounded-2xl bg-gray-100" />
                <div className="h-12 w-full rounded-xl bg-gray-100" />
                <div className="h-64 w-full rounded-2xl bg-gray-100" />
            </div>
        );
    }

    if (fetchError || !employee) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <FiAlertTriangle className="mx-auto mb-3 text-red-400" size={28} />
                <p className="font-medium text-red-800">Employee record not found.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-3 inline-block text-sm text-primary hover:underline"
                >
                    ← Go back
                </button>
            </div>
        );
    }

    const initials = (employee.name || 'U N')
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const hireDate = employee.hireDate ? new Date(employee.hireDate) : null;
    const yearsOfService = hireDate
        ? Math.floor((Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        : null;

    const deptDisplay = employee.deptLegacy || employee.department || null;

    return (
        <div className="space-y-5">

            {/* ── Hero header ───────────────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div className="h-20 bg-gradient-to-r from-primary/80 via-primary to-emerald-600" />
                <div className="bg-white px-6 pb-5">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10">
                        {/* Avatar + name */}
                        <div className="flex items-end gap-4">
                            <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white shadow-lg">
                                {initials}
                            </div>
                            <div className="mb-1">
                                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                                    {employee.name}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {employee.position || <span className="italic text-amber-500">No position set</span>}
                                    {' · '}
                                    {deptDisplay || <span className="italic text-amber-500">No department</span>}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5 font-mono">{employee.employeeId}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            {userDetail && (
                                <Badge variant={userDetail.isActive ? 'approved' : 'rejected'}>
                                    {userDetail.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            )}
                            {canManageRoles && employee.userId && (
                                <Button variant="secondary" size="sm" onClick={() => setRoleModalOpen(true)}>
                                    <FiShield size={13} className="mr-1" />
                                    Manage Role
                                </Button>
                            )}
                            <Link to="/users">
                                <Button variant="ghost" size="sm">
                                    <FiArrowLeft size={13} className="mr-1" />
                                    Back
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Quick stat chips */}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                        {userDetail?.email && (
                            <a href={`mailto:${userDetail.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                <FiMail size={12} className="text-gray-400" /> {userDetail.email}
                            </a>
                        )}
                        {yearsOfService !== null && (
                            <span className="flex items-center gap-1.5">
                                <FiClock size={12} className="text-gray-400" /> {yearsOfService} yrs service
                            </span>
                        )}
                        {employee.officeLocation && (
                            <span className="flex items-center gap-1.5">
                                <FiHome size={12} className="text-gray-400" /> {employee.officeLocation}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Incomplete profile banner ──────────────────────────────────── */}
            {canEdit && incompleteFields.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                    <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={16} />
                    <div>
                        <p className="font-medium text-amber-800">Profile incomplete</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Missing: {incompleteFields.join(', ')}. Edit the relevant tab to complete the profile.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Tabs ──────────────────────────────────────────────────────── */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        id={`tab-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                            activeTab === tab.id
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tab: Overview ─────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FiUser size={14} className="text-primary" /> Identity
                        </h3>
                        <InfoRow icon={<FiUser size={13} />} label="Full Name" value={employee.name} />
                        <InfoRow icon={<FiCalendar size={13} />} label="Employee ID" value={<span className="font-mono">{employee.employeeId}</span>} />
                        <InfoRow icon={<FiMail size={13} />} label="Email" value={userDetail?.email} />
                        {(employee as any).gender && (
                            <InfoRow icon={<FiUser size={13} />} label="Gender" value={(employee as any).gender === 'MALE' ? 'Male' : 'Female'} />
                        )}
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FiBriefcase size={14} className="text-primary" /> Employment
                        </h3>
                        <InfoRow icon={<FiBriefcase size={13} />} label="Position" value={employee.position} missing={!employee.position} />
                        <InfoRow icon={<FiUser size={13} />} label="Department" value={deptDisplay ?? undefined} missing={!deptDisplay} />
                        <InfoRow icon={<FiCalendar size={13} />} label="Hire Date" value={hireDate ? format(hireDate, 'MMM d, yyyy') : undefined} />
                        <InfoRow icon={<FiHome size={13} />} label="Office Location" value={employee.officeLocation ?? undefined} />
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FiDollarSign size={14} className="text-primary" /> Contract &amp; Pay
                        </h3>
                        <InfoRow icon={<FiCalendar size={13} />} label="Employment Type" value={employee.employmentType} missing={!employee.employmentType} />
                        <InfoRow icon={<FiCalendar size={13} />} label="Status" value={employee.employmentStatus} />
                        <InfoRow icon={<FiCalendar size={13} />} label="Contract Start" value={employee.contractStartDate ? format(new Date(employee.contractStartDate), 'MMM d, yyyy') : undefined} missing={!employee.contractStartDate} />
                        <InfoRow icon={<FiCalendar size={13} />} label="Pay Grade" value={employee.payGrade ?? undefined} />
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FiPhone size={14} className="text-primary" /> Contact
                        </h3>
                        <InfoRow icon={<FiPhone size={13} />} label="Phone" value={contactInfo?.phone} />
                        <InfoRow icon={<FiMapPin size={13} />} label="Address" value={contactInfo?.address} />
                        {emergencyContact ? (
                            <InfoRow
                                icon={<FiShield size={13} />}
                                label="Emergency Contact"
                                value={[emergencyContact.name, emergencyContact.relationship, emergencyContact.phone].filter(Boolean).join(' · ')}
                            />
                        ) : (
                            <InfoRow icon={<FiShield size={13} />} label="Emergency Contact" value={undefined} />
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Job Info ──────────────────────────────────────────────── */}
            {activeTab === 'job' && (
                <SectionCard
                    title="Job Information"
                    subtitle="Position, department, and office details"
                    onEdit={canEdit ? () => setHrEditMode(true) : undefined}
                    editMode={hrEditMode}
                >
                    {hrEditMode ? (
                        <HrInfoEditForm
                            employee={employee as EmployeeDetail}
                            departments={departments}
                            onSubmit={async (data) => { await updateMutation.mutateAsync(data); }}
                            onCancel={() => { setHrEditMode(false); setUpdateError(null); }}
                            apiError={updateError}
                            isSubmitting={updateMutation.isPending}
                        />
                    ) : (
                        <dl className="grid gap-4 sm:grid-cols-2">
                            <InfoRow icon={<FiBriefcase size={13} />} label="Position" value={employee.position} missing={!employee.position} />
                            <InfoRow icon={<FiUser size={13} />} label="Department" value={deptDisplay ?? undefined} missing={!deptDisplay} />
                            <InfoRow icon={<FiCalendar size={13} />} label="Hire Date" value={hireDate ? format(hireDate, 'MMM d, yyyy') : undefined} />
                            <InfoRow icon={<FiHome size={13} />} label="Office Location" value={employee.officeLocation ?? undefined} />
                            {yearsOfService !== null && (
                                <InfoRow icon={<FiClock size={13} />} label="Years of Service" value={`${yearsOfService} years`} />
                            )}
                        </dl>
                    )}
                </SectionCard>
            )}

            {/* ── Tab: Contract ─────────────────────────────────────────────── */}
            {activeTab === 'contract' && (
                <SectionCard
                    title="Contract &amp; Compensation"
                    subtitle="Employment terms, salary, and pay grade"
                    onEdit={canEdit ? () => setContractEditMode(true) : undefined}
                    editMode={contractEditMode}
                >
                    {contractEditMode ? (
                        <ContractEditForm
                            employee={employee as EmployeeDetail}
                            onSubmit={async (data) => { await updateMutation.mutateAsync(data); }}
                            onCancel={() => { setContractEditMode(false); setUpdateError(null); }}
                            apiError={updateError}
                            isSubmitting={updateMutation.isPending}
                        />
                    ) : (
                        <dl className="grid gap-4 sm:grid-cols-2">
                            <InfoRow icon={<FiUser size={13} />} label="Employment Status" value={employee.employmentStatus} />
                            <InfoRow icon={<FiCalendar size={13} />} label="Employment Type" value={employee.employmentType} missing={!employee.employmentType} />
                            <InfoRow
                                icon={<FiCalendar size={13} />}
                                label="Contract Start"
                                value={employee.contractStartDate ? format(new Date(employee.contractStartDate), 'MMM d, yyyy') : undefined}
                                missing={!employee.contractStartDate}
                            />
                            <InfoRow
                                icon={<FiCalendar size={13} />}
                                label="Contract End"
                                value={employee.contractEndDate ? format(new Date(employee.contractEndDate), 'MMM d, yyyy') : undefined}
                            />
                            {canEdit && (
                                <InfoRow
                                    icon={<FiDollarSign size={13} />}
                                    label="Gross Salary"
                                    value={
                                        employee.grossSalary != null
                                            ? new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(employee.grossSalary)
                                            : undefined
                                    }
                                    missing={employee.grossSalary == null}
                                />
                            )}
                            <InfoRow icon={<FiDollarSign size={13} />} label="Salary Type" value={employee.salaryType} />
                            <InfoRow icon={<FiShield size={13} />} label="Pay Grade" value={employee.payGrade ?? undefined} />
                        </dl>
                    )}
                </SectionCard>
            )}

            {/* ── Tab: Contact ──────────────────────────────────────────────── */}
            {activeTab === 'contact' && (
                <SectionCard
                    title="Contact Information"
                    subtitle="Phone, address, and emergency contact"
                    onEdit={canEdit ? () => setContactEditMode(true) : undefined}
                    editMode={contactEditMode}
                >
                    {contactEditMode ? (
                        <ContactInfoForm
                            initialContactInfo={contactInfo}
                            onSubmit={async (data) => { await updateMutation.mutateAsync({ contactInfo: data }); }}
                            onCancel={() => { setContactEditMode(false); setUpdateError(null); }}
                            apiError={updateError}
                            isSubmitting={updateMutation.isPending}
                        />
                    ) : (
                        <div>
                            <InfoRow icon={<FiMail size={13} />} label="Email" value={userDetail?.email} />
                            <InfoRow icon={<FiPhone size={13} />} label="Phone" value={contactInfo?.phone} />
                            <InfoRow icon={<FiMapPin size={13} />} label="Address" value={contactInfo?.address} />
                            {emergencyContact ? (
                                <>
                                    <InfoRow icon={<FiUser size={13} />} label="Emergency Contact Name" value={emergencyContact.name} />
                                    <InfoRow icon={<FiUser size={13} />} label="Relationship" value={emergencyContact.relationship} />
                                    <InfoRow icon={<FiPhone size={13} />} label="Emergency Phone" value={emergencyContact.phone} />
                                </>
                            ) : (
                                <InfoRow icon={<FiShield size={13} />} label="Emergency Contact" value={undefined} />
                            )}
                        </div>
                    )}
                </SectionCard>
            )}

            {/* ── Role modal ────────────────────────────────────────────────── */}
            {canManageRoles && employee.userId && userDetail && (
                <RoleManagerModal
                    isOpen={roleModalOpen}
                    onClose={() => setRoleModalOpen(false)}
                    userName={employee.name}
                    currentRole={userDetail.role}
                    isActive={userDetail.isActive}
                    onUpdateRole={(role) => updateRoleMutation.mutateAsync(role)}
                    onToggleStatus={(isActive) => updateStatusMutation.mutateAsync(isActive)}
                    onResetPassword={() => resetPasswordMutation.mutateAsync()}
                />
            )}
        </div>
    );
}

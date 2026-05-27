import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { employeesApi } from '../api/employees';
import type { ApiError, ContactInfo } from '../types';
import { ContactInfoForm } from '../features/employee/ContactInfoForm';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { leaveApi } from '../api/leave';
import {
    FiUser, FiBriefcase, FiMail, FiPhone, FiMapPin, FiCalendar,
    FiAward, FiShield, FiEdit2, FiCheckCircle, FiXCircle,
    FiHome, FiUsers, FiClock, FiActivity
} from 'react-icons/fi';

type TabId = 'overview' | 'contact' | 'job' | 'contract' | 'leave';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <FiUser size={15} /> },
    { id: 'contact', label: 'Contact', icon: <FiPhone size={15} /> },
    { id: 'job', label: 'Job Info', icon: <FiBriefcase size={15} /> },
    { id: 'contract', label: 'Contract', icon: <FiAward size={15} /> },
    { id: 'leave', label: 'Leave Balance', icon: <FiCalendar size={15} /> },
];

import { getRoleLabel } from '../utils/roleUtils';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
            <div className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-800 break-words">{value || '—'}</p>
            </div>
        </div>
    );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-2xl">{icon}</span>
                <span className={`text-3xl font-bold ${color}`}>{value}</span>
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">days remaining</p>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
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

    const contactInfo = (employee?.contactInfo as ContactInfo) ?? {};
    const emergencyContact = typeof contactInfo?.emergencyContact === 'object' && contactInfo.emergencyContact !== null
        ? (contactInfo.emergencyContact as Record<string, string>)
        : null;

    const handleContactSubmit = async (data: ContactInfo) => {
        await updateMutation.mutateAsync({ contactInfo: data });
    };

    const canViewContactInfo = user?.role === 'HR_OFFICER' || user?.isHeadHR;

    const availableTabs = tabs.filter(tab => {
        if (tab.id === 'contact' && !canViewContactInfo) return false;
        return true;
    });



    // ── No Employee Linked ────────────────────────────────────────────────────
    if (!employeeId) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                <FiUser className="mx-auto mb-3 text-amber-400" size={32} />
                <p className="font-medium text-amber-800">No employee profile linked to your account.</p>
                <p className="text-sm text-amber-600 mt-1">Please contact HR to link your employee record.</p>
            </div>
        );
    }

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading || !employee) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-40 w-full rounded-2xl bg-gray-100" />
                <div className="h-12 w-full rounded-xl bg-gray-100" />
                <div className="h-64 w-full rounded-2xl bg-gray-100" />
            </div>
        );
    }

    const hireDate = employee.hireDate ? new Date(employee.hireDate) : null;
    const yearsOfService = hireDate
        ? Math.floor((Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        : null;
    const initials = (employee.name || 'U N')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const staffTypeColor = (employee as any).staffType === 'ACADEMIC'
        ? 'bg-violet-100 text-violet-700'
        : 'bg-sky-100 text-sky-700';

    return (
        <div className="space-y-5">
            {/* ── Hero Header ─────────────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                {/* gradient banner */}
                <div className="h-24 bg-gradient-to-r from-primary/80 via-primary to-emerald-600" />
                <div className="bg-white px-6 pb-6">
                    {/* avatar row */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10">
                        <div className="flex items-end gap-4">
                            <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white shadow-lg">
                                {initials}
                            </div>
                            <div className="mb-1">
                                <h1 className="text-xl font-bold text-gray-900 leading-tight">{employee.name}</h1>
                                <p className="text-sm text-gray-500">{employee.position || 'No Position'} · {employee.deptLegacy || employee.department || 'N/A'}</p>
                            </div>
                        </div>
                        {/* badges */}
                        <div className="flex flex-wrap gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${(employee as any).staffType ? staffTypeColor : 'bg-gray-100 text-gray-600'}`}>
                                <FiUsers size={11} />
                                {(employee as any).staffType || 'Staff'}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${employee.user?.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {employee.user?.isActive !== false ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
                                {employee.user?.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                            {user?.role && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                    <FiShield size={11} />
                                    {getRoleLabel(user)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* quick stat chips */}
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                        {user?.email && (
                            <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                                <FiMail size={13} className="text-gray-400" /> {user.email}
                            </a>
                        )}
                        <span className="flex items-center gap-1.5">
                            <FiActivity size={13} className="text-gray-400" /> ID: {employee.employeeId}
                        </span>
                        {yearsOfService !== null && (
                            <span className="flex items-center gap-1.5">
                                <FiClock size={13} className="text-gray-400" /> {yearsOfService} years of service
                            </span>
                        )}
                        {employee.officeLocation && (
                            <span className="flex items-center gap-1.5">
                                <FiHome size={13} className="text-gray-400" /> {employee.officeLocation}
                            </span>
                        )}
                        {(employee as any).gender && (
                            <span className="flex items-center gap-1.5">
                                <FiUser size={13} className="text-gray-400" /> {(employee as any).gender === 'MALE' ? 'Male' : 'Female'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Tabs ──────────────────────────────────────────────────────── */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                {availableTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                            activeTab === tab.id
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ───────────────────────────────────────────────── */}

            {/* Overview */}
            {activeTab === 'overview' && (
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FiUser size={15} className="text-primary" /> Personal Info
                        </h3>
                        <InfoRow icon={<FiUser size={14} />} label="Full Name" value={employee.name} />
                        <InfoRow icon={<FiActivity size={14} />} label="Employee ID" value={employee.employeeId} />
                        <InfoRow icon={<FiUser size={14} />} label="Gender" value={(employee as any).gender === 'MALE' ? 'Male' : (employee as any).gender === 'FEMALE' ? 'Female' : undefined} />
                        <InfoRow icon={<FiUsers size={14} />} label="Staff Type" value={(employee as any).staffType} />
                        <InfoRow icon={<FiMapPin size={14} />} label="Campus" value={user?.campus?.name} />
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FiBriefcase size={15} className="text-primary" /> Employment
                        </h3>
                        <InfoRow icon={<FiBriefcase size={14} />} label="Position" value={employee.position} />
                        <InfoRow icon={<FiUsers size={14} />} label="Department" value={employee.deptLegacy || employee.department} />
                        <InfoRow icon={<FiCalendar size={14} />} label="Hire Date" value={hireDate ? format(hireDate, 'MMMM d, yyyy') : undefined} />
                        <InfoRow icon={<FiClock size={14} />} label="Years of Service" value={yearsOfService !== null ? `${yearsOfService} years` : undefined} />
                        <InfoRow icon={<FiHome size={14} />} label="Office Location" value={employee.officeLocation} />
                    </div>

                    {canViewContactInfo && (
                        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <FiPhone size={15} className="text-primary" /> Contact
                            </h3>
                            <InfoRow icon={<FiMail size={14} />} label="Email" value={user?.email} />
                            <InfoRow icon={<FiPhone size={14} />} label="Phone" value={contactInfo?.phone} />
                            <InfoRow icon={<FiMapPin size={14} />} label="Address" value={contactInfo?.address} />
                            {emergencyContact && (
                                <InfoRow
                                    icon={<FiShield size={14} />}
                                    label="Emergency Contact"
                                    value={[emergencyContact.name, emergencyContact.relationship, emergencyContact.phone].filter(Boolean).join(' · ')}
                                />
                            )}
                        </div>
                    )}

                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FiAward size={15} className="text-primary" /> Contract & Pay
                        </h3>
                        <InfoRow icon={<FiActivity size={14} />} label="Employment Status" value={employee.employmentStatus} />
                        <InfoRow icon={<FiAward size={14} />} label="Employment Type" value={employee.employmentType} />
                        <InfoRow icon={<FiCalendar size={14} />} label="Contract Start" value={employee.contractStartDate ? format(new Date(employee.contractStartDate), 'MMM d, yyyy') : undefined} />
                        <InfoRow icon={<FiCalendar size={14} />} label="Contract End" value={employee.contractEndDate ? format(new Date(employee.contractEndDate), 'MMM d, yyyy') : undefined} />
                        <InfoRow icon={<FiAward size={14} />} label="Pay Grade" value={employee.payGrade} />
                    </div>
                </div>
            )}

            {/* Contact */}
            {activeTab === 'contact' && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between p-5 border-b border-gray-50">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800">Contact Information</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Phone, address, and emergency contact</p>
                        </div>
                        {!contactEditMode && (
                            <button
                                onClick={() => setContactEditMode(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                                <FiEdit2 size={13} /> Edit
                            </button>
                        )}
                    </div>
                    <div className="p-5">
                        {contactEditMode ? (
                            <ContactInfoForm
                                initialContactInfo={contactInfo}
                                onSubmit={handleContactSubmit}
                                onCancel={() => { setContactEditMode(false); setUpdateError(null); }}
                                apiError={updateError}
                                isSubmitting={updateMutation.isPending}
                            />
                        ) : (
                            <div className="space-y-0">
                                <InfoRow icon={<FiMail size={14} />} label="Email" value={user?.email} />
                                <InfoRow icon={<FiPhone size={14} />} label="Phone" value={contactInfo?.phone} />
                                <InfoRow icon={<FiMapPin size={14} />} label="Address" value={contactInfo?.address} />
                                {emergencyContact ? (
                                    <>
                                        <InfoRow icon={<FiUser size={14} />} label="Emergency Contact Name" value={emergencyContact.name} />
                                        <InfoRow icon={<FiUsers size={14} />} label="Relationship" value={emergencyContact.relationship} />
                                        <InfoRow icon={<FiPhone size={14} />} label="Emergency Phone" value={emergencyContact.phone} />
                                    </>
                                ) : (
                                    <InfoRow icon={<FiShield size={14} />} label="Emergency Contact" value="Not set" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Job Info */}
            {activeTab === 'job' && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="p-5 border-b border-gray-50">
                        <h3 className="text-sm font-semibold text-gray-800">Job Information</h3>
                    </div>
                    <div className="p-5 grid sm:grid-cols-2 gap-0">
                        <InfoRow icon={<FiBriefcase size={14} />} label="Position" value={employee.position} />
                        <InfoRow icon={<FiUsers size={14} />} label="Department" value={employee.deptLegacy || employee.department} />
                        <InfoRow icon={<FiUsers size={14} />} label="Staff Type" value={(employee as any).staffType} />
                        <InfoRow icon={<FiUser size={14} />} label="Gender" value={(employee as any).gender === 'MALE' ? 'Male' : (employee as any).gender === 'FEMALE' ? 'Female' : undefined} />
                        <InfoRow icon={<FiCalendar size={14} />} label="Hire Date" value={hireDate ? format(hireDate, 'MMMM d, yyyy') : undefined} />
                        <InfoRow icon={<FiClock size={14} />} label="Service Years" value={yearsOfService !== null ? `${yearsOfService} years` : undefined} />
                        <InfoRow icon={<FiHome size={14} />} label="Office Location" value={employee.officeLocation} />
                        <InfoRow icon={<FiShield size={14} />} label="Role" value={user ? getRoleLabel(user) : undefined} />
                    </div>
                </div>
            )}

            {/* Contract */}
            {activeTab === 'contract' && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="p-5 border-b border-gray-50">
                        <h3 className="text-sm font-semibold text-gray-800">Contract Details</h3>
                    </div>
                    <div className="p-5 grid sm:grid-cols-2 gap-0">
                        <InfoRow icon={<FiActivity size={14} />} label="Employment Status" value={employee.employmentStatus} />
                        <InfoRow icon={<FiAward size={14} />} label="Employment Type" value={employee.employmentType} />
                        <InfoRow icon={<FiCalendar size={14} />} label="Contract Start" value={employee.contractStartDate ? format(new Date(employee.contractStartDate), 'MMMM d, yyyy') : undefined} />
                        <InfoRow icon={<FiCalendar size={14} />} label="Contract End" value={employee.contractEndDate ? format(new Date(employee.contractEndDate), 'MMMM d, yyyy') : undefined} />
                        <InfoRow icon={<FiAward size={14} />} label="Pay Grade" value={employee.payGrade} />
                        <InfoRow icon={<FiAward size={14} />} label="Salary Type" value={employee.salaryType} />
                    </div>
                </div>
            )}

            {/* Leave Balance */}
            {activeTab === 'leave' && (
                <div className="space-y-4">
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Annual Leave" value={balances?.annualBalance ?? 0} color="text-primary" icon="🌴" />
                        <StatCard label="Sick Leave" value={balances?.sickBalance ?? 0} color="text-orange-500" icon="🏥" />
                        <StatCard label="Personal Leave" value={balances?.personalBalance ?? 0} color="text-purple-500" icon="👤" />
                        {(employee as any).gender === 'FEMALE'
                            ? <StatCard label="Maternity Leave" value={balances?.maternityBalance ?? 0} color="text-pink-500" icon="🤱" />
                            : <StatCard label="Paternity Leave" value={balances?.paternityBalance ?? 0} color="text-blue-500" icon="👨‍👶" />
                        }
                    </div>
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Balance Summary</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Annual Leave', val: balances?.annualBalance ?? 0, max: 30, color: 'bg-primary' },
                                { label: 'Sick Leave', val: balances?.sickBalance ?? 0, max: 240, color: 'bg-orange-400' },
                                { label: 'Personal Leave', val: balances?.personalBalance ?? 0, max: 3, color: 'bg-purple-400' },
                                ...(((employee as any).gender === 'FEMALE')
                                    ? [{ label: 'Maternity Leave', val: balances?.maternityBalance ?? 0, max: 120, color: 'bg-pink-400' }]
                                    : [{ label: 'Paternity Leave', val: balances?.paternityBalance ?? 0, max: 10, color: 'bg-blue-400' }]
                                ),
                            ].map(({ label, val, max, color }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                                        <span>{label}</span>
                                        <span>{val} / {max} days</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${color} transition-all duration-700`}
                                            style={{ width: `${Math.min(100, (val / max) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

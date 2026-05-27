import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { FormField } from '../../components/shared/FormField';
import { employeesApi } from '../../api/employees';
import { departmentApi } from '../../api/departments';
import type { EmployeeDetail } from '../../types';
import {
    FiUser, FiFileText, FiPhone, FiBriefcase,
    FiCalendar, FiCheckSquare, FiAward
} from 'react-icons/fi';

const TABS = [
    { id: 'personal',    label: 'Personal Info',   icon: FiUser },
    { id: 'job',         label: 'Job Info',         icon: FiBriefcase },
    { id: 'contract',    label: 'Contract & Pay',   icon: FiFileText },
    { id: 'contact',     label: 'Contact',          icon: FiPhone },
    { id: 'employment',  label: 'Employment',       icon: FiCheckSquare },
    { id: 'leave',       label: 'Leave Balance',    icon: FiCalendar },
    { id: 'academic',    label: 'Academic',         icon: FiAward },
] as const;

type TabId = typeof TABS[number]['id'];

const GENDER_OPTIONS: SelectOption[] = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
];

const EMPLOYMENT_TYPE_OPTIONS: SelectOption[] = [
    { value: 'PERMANENT', label: 'Permanent' },
    { value: 'CONTRACT', label: 'Contract' },
];

const EMPLOYMENT_STATUS_OPTIONS: SelectOption[] = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'TRANSFERRED', label: 'Transferred' },
];

const SALARY_TYPE_OPTIONS: SelectOption[] = [
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'DAILY', label: 'Daily' },
];

const ACADEMIC_RANK_OPTIONS: SelectOption[] = [
    { value: '', label: 'None' },
    { value: 'Assistant Lecturer', label: 'Assistant Lecturer' },
    { value: 'Lecturer', label: 'Lecturer' },
    { value: 'Assistant Professor', label: 'Assistant Professor' },
    { value: 'Associate Professor', label: 'Associate Professor' },
    { value: 'Professor', label: 'Professor' },
];

const LEAVE_TYPE_LABELS: Record<string, string> = {
    ANNUAL: 'Annual', SICK: 'Sick', MATERNITY: 'Maternity',
    PATERNITY: 'Paternity', UNPAID: 'Unpaid', PERSONAL: 'Personal',
    STUDY: 'Study', RESEARCH: 'Research', SABBATICAL: 'Sabbatical',
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    employeeId: number;
}

export function EditEmployeeModal({ isOpen, onClose, employeeId }: Props) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabId>('personal');

    const { data: emp, isLoading } = useQuery<EmployeeDetail>({
        queryKey: ['employee-detail', employeeId],
        queryFn: async () => {
            const res = await employeesApi.getById(employeeId);
            return (res as any).data ?? res;
        },
        enabled: isOpen && !!employeeId,
    });

    const { data: deptRes } = useQuery({
        queryKey: ['departments'],
        queryFn: () => departmentApi.list(),
    });
    const departments: { id: number; name: string }[] = (deptRes as any)?.data ?? [];

    const [form, setForm] = useState<Record<string, any>>({});

    useEffect(() => {
        if (emp) {
            const contact = emp.contactInfo ?? {};
            const ec = typeof contact.emergencyContact === 'object' && contact.emergencyContact !== null
                ? contact.emergencyContact as any
                : { name: '', relationship: '', phone: '' };
            setForm({
                name: emp.name ?? '',
                gender: emp.gender ?? 'MALE',
                isMarried: emp.isMarried ?? false,
                position: emp.position ?? '',
                departmentId: emp.departmentId ?? '',
                officeLocation: emp.officeLocation ?? '',
                hireDate: emp.hireDate ? emp.hireDate.slice(0, 10) : '',
                grossSalary: emp.grossSalary ?? 0,
                salaryType: emp.salaryType ?? 'MONTHLY',
                payGrade: emp.payGrade ?? '',
                contractStartDate: emp.contractStartDate ? emp.contractStartDate.slice(0, 10) : '',
                contractEndDate: emp.contractEndDate ? emp.contractEndDate.slice(0, 10) : '',
                employmentType: emp.employmentType ?? 'PERMANENT',
                phone: contact.phone ?? '',
                address: contact.address ?? '',
                ecName: ec.name ?? '',
                ecRelationship: ec.relationship ?? '',
                ecPhone: ec.phone ?? '',
                employmentStatus: emp.employmentStatus ?? 'ACTIVE',
                staffType: emp.staffType ?? 'REGULAR',
                academicRank: emp.academicRank ?? '',
                sabbaticalEligible: emp.sabbaticalEligible ?? false,
                researchLeaveEligible: emp.researchLeaveEligible ?? false,
                studyLeaveEligible: emp.studyLeaveEligible ?? false,
            });
        }
    }, [emp]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (form.contractStartDate && form.contractEndDate) {
                if (new Date(form.contractEndDate) <= new Date(form.contractStartDate)) {
                    throw new Error("Contract End Date must be greater than Contract Start Date");
                }
            }
            
            const payload: any = {
                name: form.name,
                gender: form.gender,
                isMarried: form.isMarried,
                position: form.position,
                departmentId: form.departmentId ? Number(form.departmentId) : null,
                officeLocation: form.officeLocation,
                hireDate: form.hireDate || undefined,
                grossSalary: Number(form.grossSalary),
                salaryType: form.salaryType,
                payGrade: form.payGrade || undefined,
                contractStartDate: form.contractStartDate || undefined,
                contractEndDate: form.contractEndDate || undefined,
                employmentType: form.employmentType,
                employmentStatus: form.employmentStatus,
                contactInfo: {
                    phone: form.phone,
                    address: form.address,
                    emergencyContact: {
                        name: form.ecName,
                        relationship: form.ecRelationship,
                        phone: form.ecPhone,
                    },
                },
                staffType: form.staffType,
                academicRank: form.staffType === 'ACADEMIC' ? form.academicRank : undefined,
                sabbaticalEligible: form.staffType === 'ACADEMIC' ? form.sabbaticalEligible : false,
                researchLeaveEligible: form.staffType === 'ACADEMIC' ? form.researchLeaveEligible : false,
                studyLeaveEligible: form.staffType === 'ACADEMIC' ? form.studyLeaveEligible : false,
            };
            return employeesApi.update(employeeId, payload);
        },
        onSuccess: () => {
            toast.success('Employee updated successfully');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['employee-detail', employeeId] });
            onClose();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to update employee');
        },
    });

    const set = (key: string, value: any) => setForm(p => ({ ...p, [key]: value }));
    const toggle = (key: string) => setForm(p => ({ ...p, [key]: !p[key] }));

    const deptOptions: SelectOption[] = [
        { value: '', label: 'No department' },
        ...departments.map(d => ({ value: String(d.id), label: d.name })),
    ];

    const tabClass = (id: TabId) =>
        `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === id
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Employee" size="xl">
            {isLoading ? (
                <div className="py-12 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Tab strip */}
                    <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-100">
                        {TABS.map(t => (
                            <button key={t.id} type="button" className={tabClass(t.id)} onClick={() => setActiveTab(t.id)}>
                                <t.icon size={13} /> {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Personal Info ── */}
                    {activeTab === 'personal' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Full Name" htmlFor="edit-name" required>
                                <Input id="edit-name" value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
                            </FormField>
                            <FormField label="Gender" htmlFor="edit-gender">
                                <Select id="edit-gender" options={GENDER_OPTIONS} value={form.gender ?? 'MALE'} onChange={e => set('gender', e.target.value)} />
                            </FormField>
                            <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                                <input
                                    id="edit-married"
                                    type="checkbox"
                                    checked={!!form.isMarried}
                                    onChange={() => toggle('isMarried')}
                                    className="h-4 w-4 rounded border-gray-300 text-primary"
                                />
                                <label htmlFor="edit-married" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Married
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ── Job Info ── */}
                    {activeTab === 'job' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Position / Title" htmlFor="edit-position">
                                <Input id="edit-position" value={form.position ?? ''} onChange={e => set('position', e.target.value)} placeholder="e.g. Senior Lecturer" />
                            </FormField>
                            <FormField label="Department" htmlFor="edit-dept">
                                <Select id="edit-dept" options={deptOptions} value={String(form.departmentId ?? '')} onChange={e => set('departmentId', e.target.value)} />
                            </FormField>
                            <FormField label="Office Location" htmlFor="edit-office">
                                <Input id="edit-office" value={form.officeLocation ?? ''} onChange={e => set('officeLocation', e.target.value)} placeholder="e.g. Building A, Room 201" />
                            </FormField>
                            <FormField label="Hire Date" htmlFor="edit-hire">
                                <Input id="edit-hire" type="date" value={form.hireDate ?? ''} onChange={e => set('hireDate', e.target.value)} />
                            </FormField>
                        </div>
                    )}

                    {/* ── Contract & Pay ── */}
                    {activeTab === 'contract' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Employment Type" htmlFor="edit-emptype">
                                <Select id="edit-emptype" options={EMPLOYMENT_TYPE_OPTIONS} value={form.employmentType ?? 'PERMANENT'} onChange={e => set('employmentType', e.target.value)} />
                            </FormField>
                            <FormField label="Pay Grade" htmlFor="edit-paygrade">
                                <Input id="edit-paygrade" value={form.payGrade ?? ''} onChange={e => set('payGrade', e.target.value)} placeholder="e.g. G-12" />
                            </FormField>
                            <FormField label="Gross Salary (ETB)" htmlFor="edit-salary">
                                <Input id="edit-salary" type="number" min={0} value={form.grossSalary ?? 0} onChange={e => set('grossSalary', e.target.value)} />
                            </FormField>
                            <FormField label="Salary Type" htmlFor="edit-saltype">
                                <Select id="edit-saltype" options={SALARY_TYPE_OPTIONS} value={form.salaryType ?? 'MONTHLY'} onChange={e => set('salaryType', e.target.value)} />
                            </FormField>
                            <FormField label="Contract Start" htmlFor="edit-cstart">
                                <Input id="edit-cstart" type="date" value={form.contractStartDate ?? ''} onChange={e => set('contractStartDate', e.target.value)} />
                            </FormField>
                            <FormField label="Contract End" htmlFor="edit-cend">
                                <Input id="edit-cend" type="date" value={form.contractEndDate ?? ''} onChange={e => set('contractEndDate', e.target.value)} />
                            </FormField>
                        </div>
                    )}

                    {/* ── Contact ── */}
                    {activeTab === 'contact' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Phone Number" htmlFor="edit-phone">
                                    <Input id="edit-phone" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+251 9XX XXX XXX" />
                                </FormField>
                                <FormField label="Address" htmlFor="edit-address">
                                    <Input id="edit-address" value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="Kebele, City" />
                                </FormField>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Emergency Contact</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <FormField label="Name" htmlFor="edit-ecname">
                                        <Input id="edit-ecname" value={form.ecName ?? ''} onChange={e => set('ecName', e.target.value)} placeholder="Full name" />
                                    </FormField>
                                    <FormField label="Relationship" htmlFor="edit-ecrel">
                                        <Input id="edit-ecrel" value={form.ecRelationship ?? ''} onChange={e => set('ecRelationship', e.target.value)} placeholder="Spouse, Parent…" />
                                    </FormField>
                                    <FormField label="Phone" htmlFor="edit-ecphone">
                                        <Input id="edit-ecphone" value={form.ecPhone ?? ''} onChange={e => set('ecPhone', e.target.value)} placeholder="+251 9XX XXX XXX" />
                                    </FormField>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Employment ── */}
                    {activeTab === 'employment' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Employment Status" htmlFor="edit-empstatus">
                                <Select id="edit-empstatus" options={EMPLOYMENT_STATUS_OPTIONS} value={form.employmentStatus ?? 'ACTIVE'} onChange={e => set('employmentStatus', e.target.value)} />
                            </FormField>
                        </div>
                    )}

                    {/* ── Leave Balance (read-only) ── */}
                    {activeTab === 'leave' && (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500">Leave balances are system-managed and cannot be manually edited here.</p>
                            {emp?.leaveBalances && emp.leaveBalances.length > 0 ? (
                                <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                                    {emp.leaveBalances.map((lb, i) => (
                                        <div key={i} className="flex items-center justify-between px-4 py-3 bg-white">
                                            <span className="text-sm font-medium text-gray-700">
                                                {LEAVE_TYPE_LABELS[lb.leaveType] ?? lb.leaveType}
                                            </span>
                                            <div className="flex gap-4 text-xs text-gray-500">
                                                <span className="text-green-600 font-semibold">Balance: {lb.balance}</span>
                                                <span className="text-red-500">Used: {lb.used}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-gray-400 text-sm rounded-xl border border-dashed border-gray-200">
                                    No leave balance records found
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Academic ── */}
                    {activeTab === 'academic' && (
                        <div className="space-y-4">
                            <FormField label="Staff Type" htmlFor="edit-stafftype">
                                <Select
                                    id="edit-stafftype"
                                    options={[
                                        { value: 'REGULAR', label: 'Regular Staff' },
                                        { value: 'ACADEMIC', label: 'Academic Staff' },
                                    ]}
                                    value={form.staffType ?? 'REGULAR'}
                                    onChange={e => set('staffType', e.target.value)}
                                />
                            </FormField>

                            {form.staffType === 'ACADEMIC' && (
                                <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                                    <FormField label="Academic Rank" htmlFor="edit-rank">
                                        <Select
                                            id="edit-rank"
                                            options={ACADEMIC_RANK_OPTIONS}
                                            value={form.academicRank ?? ''}
                                            onChange={e => set('academicRank', e.target.value)}
                                        />
                                    </FormField>
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Leave Eligibility</p>
                                        {[
                                            { key: 'sabbaticalEligible', label: 'Eligible for Sabbatical Leave' },
                                            { key: 'researchLeaveEligible', label: 'Eligible for Research Leave' },
                                            { key: 'studyLeaveEligible', label: 'Eligible for Study Leave' },
                                        ].map(({ key, label }) => (
                                            <label key={key} className="flex items-center gap-3 p-2 rounded-md hover:bg-blue-100/50 cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={!!form[key]}
                                                    onChange={() => toggle(key)}
                                                    className="h-4 w-4 rounded border-gray-300 text-primary"
                                                />
                                                <span className="text-sm text-gray-700">{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <Button variant="secondary" onClick={onClose} disabled={updateMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => updateMutation.mutate()}
                            isLoading={updateMutation.isPending}
                            disabled={activeTab === 'leave'}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

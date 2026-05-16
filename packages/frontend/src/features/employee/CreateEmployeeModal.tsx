import { useState } from 'react';
import { toast } from 'react-toastify';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/shared/FormField';
import { employeesApi } from '../../api/employees';
import { campusApi } from '../../api/campuses';
import { departmentApi } from '../../api/departments';
import type { Department } from '../../types';
import {
    FiCheckCircle, FiCopy, FiUser, FiMapPin, FiBriefcase,
    FiUsers, FiAlertCircle, FiLoader,
} from 'react-icons/fi';

export interface CreateEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Pre-loaded departments (from parent). Modal fetches fresh copy if stale. */
    departments?: Department[];
}

interface GeneratedCredentials {
    employeeId: string;
    password?: string;
    name: string;
}

// ── Roles that an HR Officer / Admin can assign at creation time ──────────────
const ASSIGNABLE_ROLES = [
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'HR_OFFICER', label: 'HR Officer' },
    { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
    { value: 'RECRUITMENT_COMMITTEE', label: 'Recruitment Committee' },
];

export function CreateEmployeeModal({
    isOpen,
    onClose,
    departments: propDepts,
}: CreateEmployeeModalProps) {
    const queryClient = useQueryClient();
    const authUser = useAuthStore((s) => s.user);

    // ── Form state ─────────────────────────────────────────────────────────────
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [role, setRole] = useState('EMPLOYEE');
    const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const isUniversityScope = !authUser?.campusId;
    const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'SUPER_ADMIN';

    // ── Live data: calling user's campus ──────────────────────────────────────
    const { data: ownCampus, isLoading: campusLoading } = useQuery({
        queryKey: ['campus', 'mine'],
        queryFn: () => campusApi.getMine(),
        enabled: isOpen && !isUniversityScope,
        staleTime: 5 * 60_000,
    });

    // ── Live data: all campuses (SUPER_ADMIN only, for picker) ────────────────
    const { data: allCampuses } = useQuery({
        queryKey: ['campuses'],
        queryFn: async () => {
            const res = await campusApi.list();
            return res.data;
        },
        enabled: isOpen && isUniversityScope && isAdmin,
        staleTime: 5 * 60_000,
    });
    const [selectedCampusId, setSelectedCampusId] = useState('');

    // ── Live data: departments (prefer prop, refresh in background) ───────────
    const { data: freshDepts, isLoading: deptsLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const res = await departmentApi.list();
            return res.data;
        },
        enabled: isOpen,
        staleTime: 60_000,
    });

    const departments: Department[] = freshDepts ?? propDepts ?? [];

    // Campus context shown in the form
    const campusName = ownCampus?.name ?? authUser?.campus?.name ?? null;
    const campusCode = ownCampus?.code ?? null;
    const employeeIdPrefix = ownCampus?.employeeIdPrefix ?? null;

    // ── Create mutation ────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: async () => {
            const selectedDept = departments.find((d) => String(d.id) === departmentId);
            const payload: Record<string, unknown> = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                role,
                departmentId: departmentId ? Number(departmentId) : undefined,
                department: selectedDept?.name,
            };
            // SUPER_ADMIN must provide campusId explicitly
            if (isUniversityScope && selectedCampusId) {
                payload.campusId = Number(selectedCampusId);
            }
            return employeesApi.create(payload as Parameters<typeof employeesApi.create>[0]);
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            const data = (res as any).data;
            // Handle both envelope shapes: { data: { user, rawPassword } } and { user, rawPassword }
            const inner = data?.data ?? data;
            const empId =
                inner?.user?.employeeId ||
                inner?.user?.employee?.employeeId ||
                inner?.employeeId ||
                'Generated';
            const pwd = inner?.rawPassword;
            setGeneratedCredentials({ employeeId: empId, password: pwd, name });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'Failed to create employee';
            toast.error(msg);
        },
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const resetForm = () => {
        setName('');
        setEmail('');
        setDepartmentId('');
        setRole('EMPLOYEE');
        setSelectedCampusId('');
        setGeneratedCredentials(null);
        setCopied(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('Full name is required'); return; }
        if (!email.trim()) { toast.error('Work email is required'); return; }
        if (isUniversityScope && !selectedCampusId) {
            toast.error('Please select a campus for this employee');
            return;
        }
        createMutation.mutate();
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const selectedDept = departments.find((d) => String(d.id) === departmentId);

    // ── Success screen ─────────────────────────────────────────────────────────
    if (generatedCredentials) {
        return (
            <Modal isOpen={isOpen} onClose={handleClose} title="Employee Created" size="md">
                <div className="space-y-5">
                    <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
                        <FiCheckCircle className="mt-0.5 shrink-0 text-green-500" size={18} />
                        <div>
                            <p className="font-semibold text-green-800 text-sm">
                                Account created for {generatedCredentials.name}
                            </p>
                            <p className="text-xs text-green-700 mt-0.5">
                                Share these credentials securely.
                                {generatedCredentials.password &&
                                    ' The employee will be asked to change their password on first login.'}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                        <CredentialRow
                            label="Employee ID / Login"
                            value={generatedCredentials.employeeId}
                            copied={copied === 'id'}
                            onCopy={() => handleCopy(generatedCredentials.employeeId, 'id')}
                            mono
                        />
                        {generatedCredentials.password && (
                            <CredentialRow
                                label="Temporary Password"
                                value={generatedCredentials.password}
                                copied={copied === 'pwd'}
                                onCopy={() => handleCopy(generatedCredentials.password!, 'pwd')}
                                mono
                            />
                        )}
                    </div>

                    {!departmentId && (
                        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <FiAlertCircle size={13} className="mt-0.5 shrink-0" />
                            <span>
                                <strong>No department assigned.</strong> You can set it later from the employee's profile.
                            </span>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button variant="primary" onClick={handleClose} id="create-employee-done">
                            Done
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    // ── Creation form ──────────────────────────────────────────────────────────
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add New Employee" size="md">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* ── Campus context banner ──────────────────────────────────── */}
                {!isUniversityScope && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        {campusLoading ? (
                            <div className="flex items-center gap-2 text-sm text-blue-500">
                                <FiLoader size={13} className="animate-spin" />
                                Loading campus context…
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <FiMapPin size={15} className="text-blue-500 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                                        Campus (auto-assigned)
                                    </p>
                                    <p className="text-sm font-medium text-blue-900">
                                        {campusName ?? 'Your campus'}
                                        {campusCode && <span className="ml-1.5 text-blue-500 text-xs font-mono">· {campusCode}</span>}
                                    </p>
                                    {employeeIdPrefix && (
                                        <p className="text-xs text-blue-500 mt-0.5">
                                            Employee IDs use prefix <span className="font-mono font-bold">{employeeIdPrefix}…</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Campus picker (SUPER_ADMIN / UNIVERSITY scope only) ──────── */}
                {isUniversityScope && isAdmin && (
                    <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 space-y-3">
                        <div className="flex items-center gap-2">
                            <FiMapPin size={14} className="text-orange-500" />
                            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
                                Select Campus — Required
                            </span>
                        </div>
                        <select
                            id="emp-campus"
                            required
                            value={selectedCampusId}
                            onChange={(e) => setSelectedCampusId(e.target.value)}
                            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="">— Choose a campus —</option>
                            {(allCampuses ?? []).map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                    {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                        {allCampuses?.length === 0 && (
                            <p className="text-xs text-orange-600">No campuses found. Create a campus first.</p>
                        )}
                    </div>
                )}

                {/* ── Identity ───────────────────────────────────────────────── */}
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <FiUser size={13} className="text-primary" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Identity — Required
                        </span>
                    </div>

                    <FormField label="Full Name" htmlFor="emp-name" required>
                        <Input
                            id="emp-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Abebe Girma"
                            required
                            autoFocus
                        />
                    </FormField>

                    <FormField label="Work Email" htmlFor="emp-email" required>
                        <Input
                            id="emp-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="abebe.girma@university.edu.et"
                            required
                        />
                    </FormField>
                </div>

                {/* ── Placement ─────────────────────────────────────────────── */}
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FiBriefcase size={13} className="text-primary" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Placement — Optional
                            </span>
                        </div>
                        <span className="text-xs text-gray-400">(can be set later)</span>
                    </div>

                    <FormField label="Department" htmlFor="emp-dept">
                        <div className="space-y-1.5">
                            {deptsLoading ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg bg-white">
                                    <FiLoader size={12} className="animate-spin" />
                                    Loading departments…
                                </div>
                            ) : (
                                <select
                                    id="emp-dept"
                                    value={departmentId}
                                    onChange={(e) => setDepartmentId(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                                >
                                    <option value="">No department (assign later)</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={String(d.id)}>
                                            {d.name}
                                            {d._count?.employees != null
                                                ? ` · ${d._count.employees} employee${d._count.employees !== 1 ? 's' : ''}`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Department detail chip — shows head if a dept is selected */}
                            {selectedDept && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-gray-700">
                                    <FiUsers size={12} className="text-primary shrink-0" />
                                    <span>
                                        Head:{' '}
                                        <strong>
                                            {selectedDept.head
                                                ? `${selectedDept.head.name} (${selectedDept.head.employeeId})`
                                                : 'Not assigned'}
                                        </strong>
                                        {selectedDept._count?.employees != null && (
                                            <span className="ml-2 text-gray-500">
                                                · {selectedDept._count.employees} current member{selectedDept._count.employees !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}

                            {departments.length === 0 && !deptsLoading && (
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <FiAlertCircle size={11} />
                                    No departments exist yet. You can create departments first, or add the employee now and assign later.
                                </p>
                            )}
                        </div>
                    </FormField>

                    {/* Role — only admins can assign non-EMPLOYEE roles */}
                    {isAdmin && (
                        <FormField label="Role" htmlFor="emp-role">
                            <select
                                id="emp-role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                            >
                                {ASSIGNABLE_ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </FormField>
                    )}
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                    A unique Employee ID and temporary password will be auto-generated.
                    All other details (position, contract, salary) can be completed progressively after creation.
                </p>

                <div className="flex justify-end gap-2 pt-1">
                    <Button
                        id="create-employee-cancel"
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={createMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        id="create-employee-submit"
                        type="submit"
                        variant="primary"
                        isLoading={createMutation.isPending}
                    >
                        Create Employee
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Credential copy row ────────────────────────────────────────────────────────
function CredentialRow({
    label, value, copied, onCopy, mono = false,
}: {
    label: string;
    value: string;
    copied: boolean;
    onCopy: () => void;
    mono?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
            <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className={`mt-0.5 text-sm font-bold text-gray-900 select-all ${mono ? 'font-mono' : ''}`}>
                    {value}
                </p>
            </div>
            <button
                type="button"
                onClick={onCopy}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Copy to clipboard"
            >
                {copied
                    ? <FiCheckCircle size={13} className="text-green-500" />
                    : <FiCopy size={13} />
                }
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    );
}

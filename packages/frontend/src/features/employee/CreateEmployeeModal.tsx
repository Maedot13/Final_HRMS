import { useState } from 'react';
import { toast } from 'react-toastify';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { FormField } from '../../components/shared/FormField';
import { employeesApi } from '../../api/employees';
import { useAuthStore } from '../../store/useAuthStore';
import { FiCheckCircle, FiCopy, FiUser, FiShield } from 'react-icons/fi';
import { campusApi } from '../../api/campuses';

const SUPER_ADMIN_ROLE_OPTIONS: SelectOption[] = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'HEAD_HR', label: 'Head HR' },
];

const ADMIN_ROLE_OPTIONS: SelectOption[] = [
    { value: 'HR_OFFICER', label: 'HR Officer' },
];

export interface CreateEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    departments: { id: number; name: string }[];
}

interface GeneratedCredentials {
    employeeId: string;
    password?: string;
    name: string;
}

export function CreateEmployeeModal({
    isOpen,
    onClose,
    departments,
}: CreateEmployeeModalProps) {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const isAdmin = currentUser?.role === 'ADMIN';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>(isSuperAdmin ? 'ADMIN' : isAdmin ? 'HR_OFFICER' : 'EMPLOYEE');
    const [departmentId, setDepartmentId] = useState<string>('');
    const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [campusId, setCampusId] = useState<string>('');

    const { data: campusesRes } = useQuery({
        queryKey: ['campuses'],
        queryFn: () => campusApi.list(),
        enabled: isSuperAdmin && selectedRole === 'ADMIN',
    });
    const campuses = campusesRes?.data || [];
    const campusOptions: SelectOption[] = [
        { value: '', label: 'Select a campus...' },
        ...campuses.map(c => ({ value: String(c.id), label: c.name }))
    ];

    const safeDepartments = Array.isArray(departments) ? departments : [];

    const createMutation = useMutation({
        mutationFn: async () => {
            const selectedDept = safeDepartments.find((d) => String(d.id) === departmentId);
            return employeesApi.create({
                name,
                email,
                role: (isSuperAdmin || isAdmin) ? selectedRole : 'EMPLOYEE',
                departmentId: departmentId ? Number(departmentId) : undefined,
                department: selectedDept ? selectedDept.name : undefined,
                campusId: (isSuperAdmin && selectedRole === 'ADMIN' && campusId) ? Number(campusId) : undefined,
            } as any);
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            const data = (res as any).data;
            const empId =
                data?.user?.employeeId ||
                data?.user?.employee?.employeeId ||
                data?.employeeId ||
                'Generated';
            const pwd = data?.rawPassword;
            setGeneratedCredentials({ employeeId: empId, password: pwd, name });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'Failed to create employee';
            toast.error(msg);
        },
    });

    const handleClose = () => {
        setName('');
        setEmail('');
        setSelectedRole(isSuperAdmin ? 'ADMIN' : isAdmin ? 'HR_OFFICER' : 'EMPLOYEE');
        setDepartmentId('');
        setCampusId('');
        setGeneratedCredentials(null);
        setCopied(null);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            toast.error('Name and email are required to create an employee');
            return;
        }
        if (isSuperAdmin && selectedRole === 'ADMIN' && !campusId) {
            toast.error('Campus is required for Admin role');
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

    const deptOptions: SelectOption[] = [
        { value: '', label: 'No department (assign later)' },
        ...safeDepartments.map((d) => ({ value: String(d.id), label: d.name })),
    ];

    // ── Success screen ────────────────────────────────────────────────────────
    if (generatedCredentials) {
        return (
            <Modal isOpen={isOpen} onClose={handleClose} title="Employee Created" size="md">
                <div className="space-y-5">
                    {/* Success banner */}
                    <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
                        <FiCheckCircle className="mt-0.5 shrink-0 text-green-500" size={18} />
                        <div>
                            <p className="font-semibold text-green-800 text-sm">
                                Account created for {generatedCredentials.name}
                            </p>
                            <p className="text-xs text-green-700 mt-0.5">
                                Share these credentials securely.
                                {generatedCredentials.password &&
                                    ' The employee will be prompted to change their password on first login.'}
                            </p>
                        </div>
                    </div>

                    {/* Credentials */}
                    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                        <CredentialRow
                            label="Employee ID / Username"
                            value={generatedCredentials.employeeId}
                            copied={copied === 'id'}
                            onCopy={() => handleCopy(generatedCredentials.employeeId, 'id')}
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

                    {/* Dept reminder if none assigned */}
                    {!departmentId && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <strong>Note:</strong> No department was assigned. You can assign one later by editing the employee record.
                        </p>
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

    // ── Creation form ─────────────────────────────────────────────────────────
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={isSuperAdmin ? 'Create Admin / Head HR Account' : isAdmin ? 'Add New Employee / HR Officer' : 'Add New Employee'} size="md">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                {/* Identity */}
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <FiUser size={14} className="text-primary" />
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

                {/* Role selector — for SUPER_ADMIN and ADMIN */}
                {(isSuperAdmin || isAdmin) && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-3">
                            <FiShield size={14} className="text-primary" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Account Role — Required
                            </span>
                        </div>
                        <FormField label="Role" htmlFor="emp-role">
                            <Select
                                id="emp-role"
                                options={isSuperAdmin ? SUPER_ADMIN_ROLE_OPTIONS : ADMIN_ROLE_OPTIONS}
                                value={selectedRole}
                                onChange={(e) => {
                                    setSelectedRole(e.target.value);
                                    if (e.target.value !== 'ADMIN') setCampusId('');
                                }}
                            />
                        </FormField>

                        {isSuperAdmin && selectedRole === 'ADMIN' && (
                            <div className="pt-2">
                                <FormField label="Campus" htmlFor="emp-campus" required>
                                    <Select
                                        id="emp-campus"
                                        options={campusOptions}
                                        value={campusId}
                                        onChange={(e) => setCampusId(e.target.value)}
                                        required
                                    />
                                </FormField>
                            </div>
                        )}
                    </div>
                )}

                {/* Optional placement — only for HR Officer and below, not for Campus Admin */}
                {!isSuperAdmin && !isAdmin && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Department — Optional
                            </span>
                            <span className="text-xs text-gray-400">(can be assigned later)</span>
                        </div>

                        <FormField label="Department" htmlFor="emp-dept">
                            <Select
                                id="emp-dept"
                                options={deptOptions}
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                            />
                        </FormField>
                    </div>
                )}

                <p className="text-xs text-gray-400 leading-relaxed">
                    A system-generated Employee ID and temporary password will be created automatically.
                    All other profile details (position, contract, salary) can be completed after creation.
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

// ── Helper component ──────────────────────────────────────────────────────────
function CredentialRow({
    label,
    value,
    copied,
    onCopy,
    mono = false,
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
                {copied ? (
                    <FiCheckCircle size={13} className="text-green-500" />
                ) : (
                    <FiCopy size={13} />
                )}
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    );
}

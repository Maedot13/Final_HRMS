import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select, type SelectOption } from '../../components/ui/Select';
import { FormField } from '../../components/shared/FormField';
import { useAuthStore } from '../../store/useAuthStore';
import { facultyApi, type Faculty } from '../../api/faculties';
import { FiSearch, FiPlus, FiCheck } from 'react-icons/fi';

const ROLE_OPTIONS: SelectOption[] = [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'HEAD_HR', label: 'Head HR' },
    { value: 'HR_OFFICER', label: 'HR Officer' },
    { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
    { value: 'FINANCE_OFFICER', label: 'Finance Officer' },
    { value: 'RECRUITMENT_COMMITTEE', label: 'Recruitment Committee' },
    { value: 'EMPLOYEE', label: 'Employee' },
];

export type FacultyOpts = { facultyId?: number; newFacultyName?: string };

export interface RoleManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    currentRole: string;
    isActive: boolean;
    onUpdateRole: (role: string, facultyOpts?: FacultyOpts) => Promise<unknown>;
    onToggleStatus: (isActive: boolean) => Promise<unknown>;
    onResetPassword: () => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// FacultyCombobox
// ---------------------------------------------------------------------------
interface FacultyComboboxProps {
    faculties: Faculty[];
    isLoading: boolean;
    value: FacultyOpts | null;
    onChange: (val: FacultyOpts | null) => void;
}

function FacultyCombobox({ faculties, isLoading, value, onChange }: FacultyComboboxProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Derive display label for selected value
    const selectedLabel = value?.facultyId
        ? faculties.find((f) => f.id === value.facultyId)?.name ?? ''
        : value?.newFacultyName ?? '';

    // Keep text in sync when selection changes from outside
    useEffect(() => {
        setQuery(selectedLabel);
    }, [selectedLabel]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = query.trim()
        ? faculties.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
        : faculties;

    const queryTrimmed = query.trim();
    const exactMatch = faculties.some(
        (f) => f.name.toLowerCase() === queryTrimmed.toLowerCase()
    );
    const showCreateOption = queryTrimmed.length > 0 && !exactMatch;

    function handleSelect(f: Faculty) {
        setQuery(f.name);
        setOpen(false);
        onChange({ facultyId: f.id });
    }

    function handleCreate() {
        // Just closes the dropdown; newFacultyName is already set from typing
        setOpen(false);
        onChange({ newFacultyName: queryTrimmed });
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value;
        setQuery(val);
        setOpen(true);
        // Immediately treat typed text as a potential new faculty name.
        // Selecting an existing faculty from the dropdown will override this with facultyId.
        if (val.trim()) {
            onChange({ newFacultyName: val.trim() });
        } else {
            onChange(null);
        }
    }

    const isNew = !!value?.newFacultyName;

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <FiSearch
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                    id="faculty-combobox"
                    type="text"
                    autoComplete="off"
                    placeholder="Search or type a new faculty name…"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                {isNew && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                        New
                    </span>
                )}
                {value?.facultyId && (
                    <FiCheck
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
                    />
                )}
            </div>

            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {isLoading && (
                        <p className="px-3 py-2 text-sm text-gray-400">Loading faculties…</p>
                    )}

                    {!isLoading && filtered.length === 0 && !showCreateOption && (
                        <p className="px-3 py-2 text-sm text-gray-400">No faculties found.</p>
                    )}

                    {!isLoading &&
                        filtered.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                className="w-full text-left flex items-start gap-2 px-3 py-2 hover:bg-primary/5 transition-colors group"
                                onClick={() => handleSelect(f)}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-primary">
                                        {f.name}
                                    </p>
                                    {f.college && (
                                        <p className="text-xs text-gray-400 truncate">
                                            {f.college.name}
                                        </p>
                                    )}
                                </div>
                                {value?.facultyId === f.id && (
                                    <FiCheck size={14} className="mt-0.5 shrink-0 text-primary" />
                                )}
                            </button>
                        ))}

                    {showCreateOption && (
                        <button
                            type="button"
                            className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-amber-50 transition-colors border-t border-gray-100"
                            onClick={handleCreate}
                        >
                            <FiPlus size={14} className="shrink-0 text-amber-600" />
                            <span className="text-sm text-amber-700">
                                Create new: <strong>{queryTrimmed}</strong>
                            </span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// RoleManagerModal
// ---------------------------------------------------------------------------
export function RoleManagerModal({
    isOpen,
    onClose,
    userName,
    currentRole,
    isActive,
    onUpdateRole,
    onToggleStatus,
    onResetPassword,
}: RoleManagerModalProps) {
    const [role, setRole] = useState(currentRole);
    const [facultyOpts, setFacultyOpts] = useState<FacultyOpts | null>(null);
    const [roleLoading, setRoleLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);

    const currentUser = useAuthStore((state) => state.user);

    const allowedRoles =
        currentUser?.role === 'SUPER_ADMIN'
            ? ['SUPER_ADMIN', 'ADMIN', 'HEAD_HR']
            : ['ADMIN', 'HR_OFFICER', 'DEPARTMENT_HEAD', 'FINANCE_OFFICER', 'RECRUITMENT_COMMITTEE', 'EMPLOYEE'];

    const roleOptions = ROLE_OPTIONS.filter((opt) => allowedRoles.includes(opt.value));

    const isCommittee = role === 'RECRUITMENT_COMMITTEE';

    // Fetch campus faculties only when committee role is selected and user is ADMIN
    const { data: campusFaculties = [], isLoading: facultiesLoading } = useQuery({
        queryKey: ['faculties', 'campus'],
        queryFn: () => facultyApi.listByCampus(),
        enabled: isCommittee && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'),
        staleTime: 60_000,
    });

    // Reset faculty selection when role changes away from committee
    useEffect(() => {
        if (!isCommittee) setFacultyOpts(null);
    }, [isCommittee]);

    const handleRoleSubmit = async () => {
        if (role === currentRole && !facultyOpts) return;

        if (isCommittee && !facultyOpts?.facultyId && !facultyOpts?.newFacultyName) {
            toast.warning('Please select or enter a faculty for this committee member.');
            return;
        }

        setRoleLoading(true);
        try {
            await onUpdateRole(role, isCommittee ? (facultyOpts ?? undefined) : undefined);
            toast.success('Role updated successfully');
            onClose();
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(msg ?? 'Failed to update role');
        } finally {
            setRoleLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        setStatusLoading(true);
        try {
            await onToggleStatus(!isActive);
            toast.success(`Account ${isActive ? 'deactivated' : 'activated'} successfully`);
            onClose();
        } catch {
            toast.error('Failed to update account status');
        } finally {
            setStatusLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setPwdLoading(true);
        try {
            await onResetPassword();
            toast.success('Temporary password sent via email');
            onClose();
        } catch {
            toast.error('Failed to reset password');
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage ${userName}`} size="md">
            <div className="space-y-6">
                {/* ── Role ── */}
                <div>
                    <FormField label="Role" htmlFor="role-select">
                        <Select
                            id="role-select"
                            options={roleOptions}
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        />
                    </FormField>

                    {/* Faculty picker — only visible for Recruitment Committee */}
                    {isCommittee && (
                        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                                Faculty Assignment
                                <span className="ml-1 font-normal normal-case text-amber-600">
                                    (required for Recruitment Committee)
                                </span>
                            </p>
                            <FacultyCombobox
                                faculties={campusFaculties}
                                isLoading={facultiesLoading}
                                value={facultyOpts}
                                onChange={setFacultyOpts}
                            />
                            {facultyOpts?.newFacultyName && (
                                <p className="text-xs text-amber-700">
                                    <strong>"{facultyOpts.newFacultyName}"</strong> will be created
                                    as a new faculty and saved to the system.
                                </p>
                            )}
                            {facultyOpts?.facultyId && (
                                <p className="text-xs text-green-700">
                                    Existing faculty selected — no new record will be created.
                                </p>
                            )}
                        </div>
                    )}

                    <Button
                        size="sm"
                        className="mt-3"
                        onClick={handleRoleSubmit}
                        disabled={
                            (role === currentRole && !isCommittee) ||
                            roleLoading
                        }
                        isLoading={roleLoading}
                    >
                        Update role
                    </Button>
                </div>

                {/* ── Status ── */}
                <div className="border-t border-[#E5E7EB] pt-4">
                    <p className="text-sm font-medium text-text-primary mb-2">Status</p>
                    <p className="text-sm text-text-secondary mb-2">
                        Account is currently <strong>{isActive ? 'Active' : 'Inactive'}</strong>.
                    </p>
                    <Button
                        variant={isActive ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={handleToggleStatus}
                        isLoading={statusLoading}
                    >
                        {isActive ? 'Deactivate account' : 'Activate account'}
                    </Button>
                </div>

                {/* ── Password ── */}
                <div className="border-t border-[#E5E7EB] pt-4">
                    <p className="text-sm font-medium text-text-primary mb-2">Password</p>
                    <p className="text-sm text-text-secondary mb-2">
                        Reset password and send a temporary password via email.
                    </p>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleResetPassword}
                        isLoading={pwdLoading}
                    >
                        Reset password
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

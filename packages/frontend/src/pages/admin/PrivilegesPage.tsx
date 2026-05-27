import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { privilegesApi, type PrivilegedUser } from '../../api/privileges';
import { usersApi } from '../../api/users';
import { toast } from 'react-toastify';
import { Modal } from '../../components/ui/Modal';
import type { SpecialPrivilege } from '../../types';
import { FiSearch, FiUser, FiShield, FiX, FiUserPlus, FiCopy, FiCheckCircle } from 'react-icons/fi';
import { useAuthStore } from '../../store/useAuthStore';
import { employeesApi } from '../../api/employees';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/shared/FormField';

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIAL_PRIVILEGES: { value: SpecialPrivilege; label: string; description: string }[] = [
    { value: 'DEAN',                label: 'Dean',                description: 'Can approve sabbatical leaves and read college-scoped employee data.' },
    { value: 'DIRECTOR',            label: 'Director',            description: 'Director-level access for designated units.' },
    { value: 'UNIVERSITY_PRESIDENT',label: 'University President', description: 'Can approve without-pay and research leaves system-wide.' },
    { value: 'VICE_PRESIDENT',      label: 'Vice President',       description: 'Academic VP role — approves research and sabbatical leave chains.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function privilegeLabel(p: SpecialPrivilege): string {
    return SPECIAL_PRIVILEGES.find(x => x.value === p)?.label ?? p.replace(/_/g, ' ');
}

function PrivilegeBadge({ privilege }: { privilege: SpecialPrivilege }) {
    return (
        <Badge variant="info" className="capitalize">
            {privilegeLabel(privilege)}
        </Badge>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PrivilegesPage() {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);
    const isOnlyHeadHR = currentUser?.isHeadHR && currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN';

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);

    // User search state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Privilege selection state
    const [isHeadHR, setIsHeadHR] = useState(false);
    const [selectedPrivileges, setSelectedPrivileges] = useState<SpecialPrivilege[]>([]);

    // Create AVP state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createEmail, setCreateEmail] = useState('');
    const [createdCredentials, setCreatedCredentials] = useState<{name: string, email: string, employeeId: string, password?: string} | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    // ── Queries ──────────────────────────────────────────────────────────────

    const { data: privilegedUsers = [], isLoading } = useQuery({
        queryKey: ['privilegedUsers'],
        queryFn: async () => {
            const res = await privilegesApi.list();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    // Search employees-only users by Employee ID or name
    const { data: searchResults = [], isFetching: isSearching } = useQuery({
        queryKey: ['userSearch', searchQuery],
        queryFn: async () => {
            if (!searchQuery.trim()) return [];
            const res = await usersApi.listPaginated({
                search: searchQuery.trim(),
                role: 'EMPLOYEE',
                limit: 20,
            });
            return res.data?.data || [];
        },
        enabled: isModalOpen && searchQuery.trim().length >= 1,
    });

    const selectedUser = useMemo(
        () => searchResults.find((u: any) => u.id === selectedUserId) || null,
        [searchResults, selectedUserId]
    );

    // ── Mutations ────────────────────────────────────────────────────────────

    const assignMutation = useMutation({
        mutationFn: (variables: any) => {
            if (isOnlyHeadHR) {
                return privilegesApi.assignAVP({ employeeId: variables.employeeId });
            }
            return privilegesApi.assign({
                userId: variables.userId,
                isHeadHR: variables.isHeadHR,
                specialPrivileges: variables.specialPrivileges
            });
        },
        onSuccess: () => {
            toast.success('Privileges saved successfully.');
            queryClient.invalidateQueries({ queryKey: ['privilegedUsers'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to save privileges.');
        },
    });

    const revokeMutation = useMutation({
        mutationFn: (variables: { userId: number; employeeId?: string }) => {
            if (isOnlyHeadHR && variables.employeeId) {
                return privilegesApi.revokeAVP(variables.employeeId);
            }
            return privilegesApi.revoke(variables.userId);
        },
        onSuccess: () => {
            toast.success('Privileges revoked.');
            queryClient.invalidateQueries({ queryKey: ['privilegedUsers'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to revoke privileges.');
        },
    });

    const createAvpMutation = useMutation({
        mutationFn: () => employeesApi.create({
            name: createName,
            email: createEmail,
            role: 'VICE_PRESIDENT'
        }),
        onSuccess: (res: any) => {
            toast.success('AVP created successfully.');
            queryClient.invalidateQueries({ queryKey: ['privilegedUsers'] });
            
            const data = res.data;
            const empId = data?.user?.employeeId || data?.employeeId || 'Generated';
            setCreatedCredentials({
                name: createName,
                email: createEmail,
                employeeId: empId,
                password: data?.rawPassword
            });
            setCreateName('');
            setCreateEmail('');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create AVP.');
        }
    });

    // ── Handlers ─────────────────────────────────────────────────────────────

    const closeModal = () => {
        setIsModalOpen(false);
        setSearchQuery('');
        setSelectedUserId(null);
        setShowDropdown(false);
        setIsHeadHR(false);
        setSelectedPrivileges([]);
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        setCreatedCredentials(null);
        setCreateName('');
        setCreateEmail('');
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const handleUserSelect = (user: any) => {
        setSelectedUserId(user.id);
        setSearchQuery(user.employeeId || '');
        setShowDropdown(false);
    };

    const clearUserSelection = () => {
        setSelectedUserId(null);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const togglePrivilege = (privilege: SpecialPrivilege) => {
        setSelectedPrivileges(prev =>
            prev.includes(privilege)
                ? prev.filter(p => p !== privilege)
                : [...prev, privilege]
        );
    };

    const handleAssign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) return toast.error('Please select an employee first.');
        if (!isHeadHR && selectedPrivileges.length === 0 && !isOnlyHeadHR) {
            return toast.error('Select at least one privilege to assign.');
        }
        assignMutation.mutate({
            userId: selectedUserId,
            employeeId: (selectedUser as any)?.employeeId,
            isHeadHR,
            specialPrivileges: isOnlyHeadHR ? ['VICE_PRESIDENT'] : selectedPrivileges,
        });
    };

    // ── Table columns ────────────────────────────────────────────────────────

    const columns: Column<PrivilegedUser>[] = [
        {
            key: 'employee',
            header: 'Employee',
            render: (r) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-text-primary">
                        {r.employee?.name || '—'}
                    </span>
                    <span className="text-xs text-text-secondary font-mono">
                        {r.employee?.employeeId}
                    </span>
                </div>
            ),
        },
        {
            key: 'email',
            header: 'Email',
            render: (r) => (
                <span className="text-sm text-text-secondary">{r.email}</span>
            ),
        },
        {
            key: 'campus',
            header: 'Campus',
            render: (r) => (
                <span className="text-sm text-text-secondary">{r.campus?.name || '—'}</span>
            ),
        },
        {
            key: 'privileges',
            header: 'Assigned Privileges',
            render: (r) => (
                <div className="flex flex-wrap gap-1.5">
                    {r.isHeadHR && (
                        <Badge variant="error">Head HR</Badge>
                    )}
                    {r.specialPrivileges?.map(p => (
                        <PrivilegeBadge key={p} privilege={p} />
                    ))}
                    {!r.isHeadHR && (!r.specialPrivileges || r.specialPrivileges.length === 0) && (
                        <span className="text-xs text-text-secondary italic">Standard</span>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (r) => {
                // If Head HR, they can only revoke if the user is an AVP
                if (isOnlyHeadHR && (!r.specialPrivileges || !r.specialPrivileges.includes('VICE_PRESIDENT'))) {
                    return null;
                }
                return (
                <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                        if (window.confirm(`Revoke ${isOnlyHeadHR ? 'AVP position' : 'all privileges'} from ${r.employee?.name ?? r.email}?`)) {
                            revokeMutation.mutate({ userId: r.id, employeeId: r.employee?.employeeId });
                        }
                    }}
                    disabled={revokeMutation.isPending}
                >
                    Revoke
                </Button>
                );
            },
        },
    ];

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">
            {/* Page header */}
            <Card>
                <CardHeader
                    title={isOnlyHeadHR ? "Academic Vice President Management" : "Privilege Management"}
                    subtitle={isOnlyHeadHR ? "Assign or revoke the Academic Vice President (AVP) role." : "Assign elevated privileges to employees. Privileges are additive — they extend, never replace, the base role."}
                    action={
                        <div className="flex gap-2">
                            {isOnlyHeadHR && (
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsCreateModalOpen(true)}
                                >
                                    <FiUserPlus className="w-4 h-4 mr-1.5" />
                                    Create AVP
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <FiShield className="w-4 h-4 mr-1.5" />
                                {isOnlyHeadHR ? "Assign AVP" : "Assign Privileges"}
                            </Button>
                        </div>
                    }
                />
            </Card>

            {/* Privileged users table */}
            <DataTable
                columns={columns}
                data={privilegedUsers}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage="No privileged users found for your campus scope."
            />

            {/* ── Assign modal ─────────────────────────────────────────────── */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title="Assign Privileges"
                size="md"
            >
                <form onSubmit={handleAssign} className="space-y-5">

                    {/* ── Step 1: Employee search ─────────────────────────── */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-text-primary">
                            Search Employee by ID or Name
                        </label>
                        <p className="text-xs text-text-secondary">
                            Only employees (base role: Employee) can receive special privileges.
                        </p>

                        <div className="relative">
                            {/* Input row */}
                            <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary bg-white transition">
                                <FiSearch className="w-4 h-4 text-text-secondary shrink-0" />
                                <input
                                    type="text"
                                    className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
                                    placeholder="Type employee ID (e.g. MAIN-26-0001) or name…"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setSelectedUserId(null);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    autoComplete="off"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={clearUserSelection}
                                        className="text-gray-400 hover:text-gray-600 transition"
                                    >
                                        <FiX className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown results */}
                            {showDropdown && searchQuery.trim().length >= 1 && (
                                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                                    {isSearching ? (
                                        <div className="px-4 py-3 text-sm text-text-secondary">Searching…</div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-text-secondary italic">
                                            No employees found matching "{searchQuery}".
                                        </div>
                                    ) : (
                                        searchResults.map((u: any) => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition flex items-center gap-3 border-b border-gray-100 last:border-0"
                                                onClick={() => handleUserSelect(u)}
                                            >
                                                <FiUser className="w-4 h-4 text-text-secondary shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-text-primary">
                                                        {u.employee?.name || u.email}
                                                    </p>
                                                    <p className="text-xs font-mono text-text-secondary">
                                                        {u.employeeId}
                                                        {u.employee?.department ? ` · ${u.employee.department}` : ''}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected user preview */}
                        {selectedUserId && selectedUser && (
                            <div className="mt-2 flex items-center gap-3 rounded-md border border-primary/30 bg-primary-light px-3 py-2.5">
                                <FiUser className="w-5 h-5 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-primary truncate">
                                        {(selectedUser as any).employee?.name || (selectedUser as any).email}
                                    </p>
                                    <p className="text-xs font-mono text-primary/70">
                                        {(selectedUser as any).employeeId}
                                        {(selectedUser as any).employee?.department
                                            ? ` · ${(selectedUser as any).employee.department}`
                                            : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearUserSelection}
                                    className="text-primary/60 hover:text-primary transition"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Step 2: Privileges (only shown after user selected) ─ */}
                    {selectedUserId && (
                        <div className="space-y-3 pt-1 border-t border-gray-100">
                            <p className="text-sm font-medium text-text-primary pt-2">
                                {isOnlyHeadHR ? "Assign AVP Role" : "Assign Privileges"}
                            </p>

                            {isOnlyHeadHR ? (
                                <div className="rounded-md border border-primary/30 bg-primary-light px-4 py-3">
                                    <p className="text-sm font-semibold text-primary">Academic Vice President (AVP)</p>
                                    <p className="text-xs text-primary/80 mt-0.5">
                                        This will grant the selected employee the AVP role to oversee Deans and academic units.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Head HR toggle — separated visually */}
                                    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isHeadHR}
                                                onChange={() => setIsHeadHR(!isHeadHR)}
                                                className="mt-0.5 w-4 h-4 accent-amber-600"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-amber-800">Head HR</p>
                                                <p className="text-xs text-amber-700 mt-0.5">
                                                    Grants final clearance approval authority across all campuses.
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Special additive privileges */}
                                    <div className="space-y-2">
                                        {SPECIAL_PRIVILEGES.map(({ value, label, description }) => (
                                            <label
                                                key={value}
                                                className={`flex items-start gap-3 cursor-pointer rounded-md border px-4 py-3 transition ${
                                                    selectedPrivileges.includes(value)
                                                        ? 'border-primary/40 bg-primary-light'
                                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPrivileges.includes(value)}
                                                    onChange={() => togglePrivilege(value)}
                                                    className="mt-0.5 w-4 h-4 accent-primary"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-text-primary">{label}</p>
                                                    <p className="text-xs text-text-secondary mt-0.5">{description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── Actions ─────────────────────────────────────────── */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <Button type="button" variant="ghost" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={
                                assignMutation.isPending ||
                                !selectedUserId ||
                                (!isHeadHR && selectedPrivileges.length === 0)
                            }
                        >
                            {assignMutation.isPending ? 'Saving…' : 'Save Privileges'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ── Create AVP modal ─────────────────────────────────────────────── */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={closeCreateModal}
                title="Create Academic Vice President"
                size="md"
            >
                {createdCredentials ? (
                    <div className="space-y-5">
                        <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
                            <FiCheckCircle className="mt-0.5 shrink-0 text-green-500" size={18} />
                            <div>
                                <p className="font-semibold text-green-800 text-sm">
                                    Account created for {createdCredentials.name}
                                </p>
                                <p className="text-xs text-green-700 mt-0.5">
                                    Share these credentials securely. They will be prompted to change their password on first login.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Employee ID / Username</p>
                                    <p className="mt-0.5 text-sm font-bold text-gray-900 select-all">{createdCredentials.employeeId}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(createdCredentials.employeeId, 'id')}
                                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-primary transition-colors"
                                >
                                    {copied === 'id' ? <FiCheckCircle size={13} className="text-green-500" /> : <FiCopy size={13} />}
                                    {copied === 'id' ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            {createdCredentials.password && (
                                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Temporary Password</p>
                                        <p className="mt-0.5 text-sm font-bold text-gray-900 select-all font-mono">{createdCredentials.password}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(createdCredentials.password!, 'pwd')}
                                        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-primary transition-colors"
                                    >
                                        {copied === 'pwd' ? <FiCheckCircle size={13} className="text-green-500" /> : <FiCopy size={13} />}
                                        {copied === 'pwd' ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button variant="primary" onClick={closeCreateModal}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); createAvpMutation.mutate(); }} className="space-y-5" noValidate>
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-4">
                            <FormField label="Full Name" htmlFor="create-avp-name" required>
                                <Input
                                    id="create-avp-name"
                                    value={createName}
                                    onChange={(e) => setCreateName(e.target.value)}
                                    placeholder="e.g. Abebe Girma"
                                    required
                                    autoFocus
                                />
                            </FormField>
                            <FormField label="Work Email" htmlFor="create-avp-email" required>
                                <Input
                                    id="create-avp-email"
                                    type="email"
                                    value={createEmail}
                                    onChange={(e) => setCreateEmail(e.target.value)}
                                    placeholder="abebe@university.edu.et"
                                    required
                                />
                            </FormField>
                        </div>
                        <p className="text-xs text-gray-400">
                            A system-generated Employee ID and temporary password will be created automatically. The employee will have the base role of Employee with AVP privileges system-wide.
                        </p>
                        <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
                            <Button type="button" variant="ghost" onClick={closeCreateModal} disabled={createAvpMutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" isLoading={createAvpMutation.isPending} disabled={!createName.trim() || !createEmail.trim()}>
                                Create AVP
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}

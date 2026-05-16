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
import { FiSearch, FiUser, FiShield, FiX } from 'react-icons/fi';

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

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);

    // User search state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Privilege selection state
    const [isHeadHR, setIsHeadHR] = useState(false);
    const [selectedPrivileges, setSelectedPrivileges] = useState<SpecialPrivilege[]>([]);

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
        mutationFn: privilegesApi.assign,
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
        mutationFn: privilegesApi.revoke,
        onSuccess: () => {
            toast.success('All privileges revoked.');
            queryClient.invalidateQueries({ queryKey: ['privilegedUsers'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to revoke privileges.');
        },
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
        if (!isHeadHR && selectedPrivileges.length === 0) {
            return toast.error('Select at least one privilege to assign.');
        }
        assignMutation.mutate({
            userId: selectedUserId,
            isHeadHR,
            specialPrivileges: selectedPrivileges,
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
            render: (r) => (
                <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                        if (window.confirm(`Revoke all privileges from ${r.employee?.name ?? r.email}?`)) {
                            revokeMutation.mutate(r.id);
                        }
                    }}
                    disabled={revokeMutation.isPending}
                >
                    Revoke
                </Button>
            ),
        },
    ];

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">
            {/* Page header */}
            <Card>
                <CardHeader
                    title="Privilege Management"
                    subtitle="Assign elevated privileges to employees. Privileges are additive — they extend, never replace, the base role."
                    action={
                        <Button
                            variant="primary"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <FiShield className="w-4 h-4 mr-1.5" />
                            Assign Privileges
                        </Button>
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
                                Assign Privileges
                            </p>

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
        </div>
    );
}

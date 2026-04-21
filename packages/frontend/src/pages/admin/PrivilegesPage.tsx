import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { privilegesApi, type PrivilegedUser } from '../../api/privileges';
import { usersApi } from '../../api/users';
import { toast } from 'react-toastify';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../store/useAuthStore';
import type { SpecialPrivilege } from '../../types';

export default function PrivilegesPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    const [isHeadHR, setIsHeadHR] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [selectedPrivileges, setSelectedPrivileges] = useState<SpecialPrivilege[]>([]);
    const { user } = useAuthStore();

    const { data: privilegedUsers = [], isLoading } = useQuery({
        queryKey: ['privilegedUsers'],
        queryFn: async () => {
            const res = await privilegesApi.list();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const { data: allUsers = [] } = useQuery({
        queryKey: ['allUsersForPrivilege'],
        queryFn: async () => {
            const res = await usersApi.listPaginated({ limit: 1000 }); // Getting a flat list for a quick dropdown
            return res.data?.data || [];
        },
        enabled: isModalOpen,
    });

    const assignMutation = useMutation({
        mutationFn: privilegesApi.assign,
        onSuccess: () => {
            toast.success('Privileges updated');
            queryClient.invalidateQueries({ queryKey: ['privilegedUsers'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update privileges');
        }
    });

    const revokeMutation = useMutation({
        mutationFn: privilegesApi.revoke,
        onSuccess: () => {
            toast.success('Privileges revoked');
            queryClient.invalidateQueries({ queryKey: ['privilegedUsers'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to revoke privileges');
        }
    });

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedUserId('');
        setIsHeadHR(false);
        setIsSuperAdmin(false);
        setSelectedPrivileges([]);
    };

    const handleAssign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) return toast.error('Select a user');
        assignMutation.mutate({ 
            userId: Number(selectedUserId), 
            role: isSuperAdmin ? 'SUPER_ADMIN' : undefined,
            isHeadHR,
            specialPrivileges: selectedPrivileges
        });
    };

    const togglePrivilege = (privilege: SpecialPrivilege) => {
        setSelectedPrivileges(prev => 
            prev.includes(privilege) 
                ? prev.filter(p => p !== privilege)
                : [...prev, privilege]
        );
    };

    const columns: Column<PrivilegedUser>[] = [
        {
            key: 'employee.name',
            header: 'Name',
            render: (r) => r.employee?.name || 'Unknown',
        },
        {
            key: 'email',
            header: 'Email / ID',
            render: (r) => (
                <div className="flex flex-col">
                    <span className="text-sm">{r.email}</span>
                    <span className="text-xs text-gray-500">{r.employee?.employeeId}</span>
                </div>
            ),
        },
        {
            key: 'campus',
            header: 'Campus',
            render: (r) => r.campus?.name || '—',
        },
        {
            key: 'role',
            header: 'Details',
            render: (r) => (
                <div className="flex flex-wrap gap-1">
                    {r.role === 'SUPER_ADMIN' && <span className="px-2 py-1 text-xs rounded-full font-medium bg-purple-100 text-purple-800">System Super Admin</span>}
                    {r.isHeadHR && <span className="px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-800">Head HR</span>}
                    {r.specialPrivileges?.map(p => (
                        <span key={p} className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                            {p.replace('_', ' ')}
                        </span>
                    ))}
                    {!r.isHeadHR && r.role !== 'SUPER_ADMIN' && (!r.specialPrivileges || r.specialPrivileges.length === 0) && (
                        <span className="text-gray-400 italic text-xs">Standard</span>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r) => {
                if (r.id === user?.id) return <span className="text-xs text-gray-500 italic">You</span>;
                return (
                    <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => {
                            if (window.confirm(`Are you sure you want to revoke all special properties from ${r.employee?.name}?`)) {
                                revokeMutation.mutate(r.id);
                            }
                        }}
                    >
                        Revoke All
                    </Button>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Privilege Management"
                    subtitle="Assign elevated privileges (Additive to base roles)"
                    action={
                        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                            Assign Privileges
                        </Button>
                    }
                />
            </Card>

            <DataTable
                columns={columns}
                data={privilegedUsers}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage="No privileged users found in your scope."
            />

            <Modal isOpen={isModalOpen} onClose={closeModal} title="Assign Privileges">
                <form onSubmit={handleAssign} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Select User</label>
                        <select
                            className="w-full px-3 py-2 border rounded-md"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(Number(e.target.value) || '')}
                            required
                        >
                            <option value="">-- Choose a user --</option>
                            {allUsers
                                .map((u: any) => (
                                    <option key={u.id} value={u.id}>
                                        {u.employee?.name} ({u.employeeId}) - Base Role: {u.role}
                                    </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Special Additive Privileges</label>
                        <div className="flex flex-col gap-2 border p-3 rounded-md">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isHeadHR} onChange={() => setIsHeadHR(!isHeadHR)} className="w-4 h-4" />
                                <span className="text-sm">Head HR (isHeadHR)</span>
                            </label>
                            
                            {(['DEAN', 'DIRECTOR', 'UNIVERSITY_PRESIDENT', 'VICE_PRESIDENT'] as SpecialPrivilege[]).map(privilege => (
                                <label key={privilege} className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedPrivileges.includes(privilege)} 
                                        onChange={() => togglePrivilege(privilege)} 
                                        className="w-4 h-4" 
                                    />
                                    <span className="text-sm">{privilege.replace('_', ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {user?.role === 'SUPER_ADMIN' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">System Role Override</label>
                            <div className="border p-3 rounded-md bg-red-50">
                                <label className="flex items-center gap-2 cursor-pointer text-red-800">
                                    <input type="checkbox" checked={isSuperAdmin} onChange={() => setIsSuperAdmin(!isSuperAdmin)} className="w-4 h-4 border-red-300" />
                                    <span className="text-sm font-medium">Grant SUPER_ADMIN</span>
                                </label>
                                <p className="text-xs text-red-600 mt-1 ml-6">Careful! This grants full root access across all campuses.</p>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button 
                            type="submit" 
                            variant="primary" 
                            disabled={assignMutation.isPending || !selectedUserId}
                        >
                            Save Privileges
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

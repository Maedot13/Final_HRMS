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

export default function PrivilegesPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
    const [selectedRole, setSelectedRole] = useState<'HEAD_HR' | 'SUPER_ADMIN'>('HEAD_HR');
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
            toast.success('Privilege assigned');
            queryClient.invalidateQueries({ queryKey: ['privilegedUsers'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to assign privilege');
        }
    });

    const revokeMutation = useMutation({
        mutationFn: privilegesApi.revoke,
        onSuccess: () => {
            toast.success('Privilege revoked');
            queryClient.invalidateQueries({ queryKey: ['privilegedUsers'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to revoke privilege');
        }
    });

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedUserId('');
        setSelectedRole('HEAD_HR');
    };

    const handleAssign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) return toast.error('Select a user');
        assignMutation.mutate({ userId: Number(selectedUserId), role: selectedRole });
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
            header: 'Role',
            render: (r) => (
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    r.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                    {r.role.replace('_', ' ')}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r) => {
                // Prevent revoking oneself to avoid accidental lockouts
                if (r.id === user?.id) return <span className="text-xs text-gray-500 italic">You</span>;
                return (
                    <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => {
                            if (window.confirm(`Are you sure you want to revoke ${r.role} from ${r.employee?.name}?`)) {
                                revokeMutation.mutate(r.id);
                            }
                        }}
                    >
                        Revoke
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
                    subtitle="Assign elevated roles like Head HR or Super Admin"
                    action={
                        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                            Assign Privilege
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

            <Modal isOpen={isModalOpen} onClose={closeModal} title="Assign Privilege">
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
                                .filter((u: any) => u.role !== 'SUPER_ADMIN' && u.role !== 'HEAD_HR')
                                .map((u: any) => (
                                    <option key={u.id} value={u.id}>
                                        {u.employee?.name} ({u.employeeId})
                                    </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Role to Assign</label>
                        <select
                            className="w-full px-3 py-2 border rounded-md"
                            value={selectedRole}
                            onChange={(e: any) => setSelectedRole(e.target.value)}
                        >
                            <option value="HEAD_HR">Head HR (Campus Final Approver)</option>
                            {user?.role === 'SUPER_ADMIN' && (
                                <option value="SUPER_ADMIN">System Super Admin</option>
                            )}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            This will override their current role and grant them elevated system access.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button 
                            type="submit" 
                            variant="primary" 
                            disabled={assignMutation.isPending || !selectedUserId}
                        >
                            Assign Role
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

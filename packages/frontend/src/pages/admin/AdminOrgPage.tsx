import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { departmentApi } from '../../api/departments';
import { usersApi } from '../../api/users';
import { toast } from 'react-toastify';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

// Basic admin org page to manage departments within the campus
export default function AdminOrgPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', headEmployeeId: '' });

    const { data: departments = [], isLoading: isDeptsLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const res = await departmentApi.list();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employeesListForDept'],
        queryFn: async () => {
            // Using users API to list available users
            const res = await usersApi.listPaginated({ limit: 500 });
            return res.data?.data || [];
        },
    });

    const createMutation = useMutation({
        mutationFn: departmentApi.create,
        onSuccess: () => {
            toast.success('Department created');
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create department');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => departmentApi.update(id, data),
        onSuccess: () => {
            toast.success('Department updated');
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update department');
        }
    });

    const assignHeadMutation = useMutation({
        mutationFn: ({ id, headEmployeeId }: { id: number, headEmployeeId: string }) => 
            departmentApi.assignHead(id, headEmployeeId),
        onSuccess: () => {
            toast.success('Department head assigned');
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to assign department head');
        }
    });

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingDept(null);
        setFormData({ name: '', headEmployeeId: '' });
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (editingDept) {
            // Parallel update name and head if changed
            if (formData.name && formData.name !== editingDept.name) {
                updateMutation.mutate({ id: editingDept.id, data: { name: formData.name } });
            }
            if (formData.headEmployeeId && formData.headEmployeeId !== String(editingDept.headEmployeeId)) {
                assignHeadMutation.mutate({ id: editingDept.id, headEmployeeId: formData.headEmployeeId });
            }
            if (!updateMutation.isPending && !assignHeadMutation.isPending) {
                closeModal();
            }
        } else {
            createMutation.mutate({ 
                name: formData.name
            });
        }
    };

    const columns: Column<any>[] = [
        {
            key: 'name',
            header: 'Department Name',
            render: (r) => r.name,
        },
        {
            key: 'headEmployee',
            header: 'Department Head',
            render: (r) => r.headEmployee ? `${r.headEmployee.name} (${r.headEmployee.employeeId})` : <span className="text-gray-400">Not assigned</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (r) => (
                <span className={`px-2 py-1 text-xs rounded-full ${r.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {r.isActive ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
                <div className="flex gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                            setEditingDept(r);
                            setFormData({ 
                                name: r.name, 
                                headEmployeeId: r.headEmployeeId ? String(r.headEmployeeId) : '' 
                            });
                            setIsModalOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Organization Structure"
                    subtitle="Manage departments and assign department heads"
                    action={
                        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                            Add Department
                        </Button>
                    }
                />
            </Card>

            <DataTable
                columns={columns}
                data={departments}
                isLoading={isDeptsLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage="No departments found."
            />

            <Modal 
                isOpen={isModalOpen} 
                onClose={closeModal} 
                title={editingDept ? "Edit Department" : "Add Department"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Department Name</label>
                        <Input 
                            required 
                            placeholder="e.g. Computer Science"
                            value={formData.name}
                            onChange={(e: any) => setFormData(p => ({ ...p, name: e.target.value }))}
                        />
                    </div>
                    
                    {editingDept && (
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Assign Department Head</label>
                            <select
                                className="w-full px-3 py-2 border rounded-md"
                                value={formData.headEmployeeId}
                                onChange={(e) => setFormData(p => ({ ...p, headEmployeeId: e.target.value }))}
                            >
                                <option value="">-- No Department Head --</option>
                                {employees.map((u: any) => (
                                    <option key={u.id} value={u.employee?.id}>
                                        {u.employee?.name} ({u.employeeId})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Selecting an employee here will automatically promote them to the DEPARTMENT_HEAD role.
                            </p>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button 
                            type="submit" 
                            variant="primary" 
                            disabled={createMutation.isPending || updateMutation.isPending || assignHeadMutation.isPending}
                        >
                            Save
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

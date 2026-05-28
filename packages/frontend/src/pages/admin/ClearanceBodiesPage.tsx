import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { clearanceApi, type ClearanceUnit } from '../../api/clearance';
import { toast } from 'react-toastify';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export default function ClearanceBodiesPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<ClearanceUnit | null>(null);
    const [formData, setFormData] = useState({ name: '', fullName: '', description: '', priorityOrder: 0, loginId: '', loginPassword: '' });

    const { data: units = [], isLoading } = useQuery({
        queryKey: ['clearanceUnits'],
        queryFn: async () => {
            const res = await clearanceApi.listUnits();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const createMutation = useMutation({
        mutationFn: clearanceApi.createUnit,
        onSuccess: () => {
            toast.success('Clearance body created');
            queryClient.invalidateQueries({ queryKey: ['clearanceUnits'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create body');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => clearanceApi.updateUnit(id, data),
        onSuccess: () => {
            toast.success('Clearance body updated');
            queryClient.invalidateQueries({ queryKey: ['clearanceUnits'] });
            closeModal();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update body');
        }
    });
    
    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: number, isActive: boolean }) => clearanceApi.updateUnit(id, { isActive }),
        onSuccess: () => {
            toast.success('Status updated');
            queryClient.invalidateQueries({ queryKey: ['clearanceUnits'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to toggle status');
        }
    });



    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUnit(null);
        setFormData({ name: '', fullName: '', description: '', priorityOrder: 0, loginId: '', loginPassword: '' });
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUnit) {
            updateMutation.mutate({ id: editingUnit.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const columns: Column<ClearanceUnit>[] = [
        {
            key: 'fullName',
            header: 'Full Name',
            render: (r: any) => r.fullName || '—',
        },
        {
            key: 'name',
            header: 'Unit Code',
            render: (r) => r.name,
        },
        {
            key: 'description',
            header: 'Description',
            render: (r) => r.description || '—',
        },
        {
            key: 'priorityOrder',
            header: 'Step (Seq)',
            render: (r: any) => (
                <span className="font-mono text-sm">
                    {r.displayOrder ?? r.priorityOrder ?? 0}
                    {/* show raw value as subscript hint when duplicates exist */}
                    {r.displayOrder !== undefined && r.displayOrder !== (r.priorityOrder ?? 0) && (
                        <span className="text-[10px] text-gray-400 ml-1">(raw: {r.priorityOrder})</span>
                    )}
                </span>
            ),
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
            key: 'type',
            header: 'Type',
            render: (r) => r.isSystemGenerated ? 'System' : 'Custom',
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
                            setEditingUnit(r);
                            const loginId = (r as any).users && (r as any).users.length > 0 ? (r as any).users[0].employeeId : '';
                            setFormData({ 
                                name: r.name, 
                                fullName: (r as any).fullName || '', 
                                description: r.description || '', 
                                priorityOrder: (r as any).priorityOrder || 0, 
                                loginId, 
                                loginPassword: '' 
                            });
                            setIsModalOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={r.isSystemGenerated}
                        onClick={() => toggleStatusMutation.mutate({ id: r.id, isActive: !r.isActive })}
                    >
                        {r.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Clearance Bodies"
                    subtitle="Configure departments and units involved in employee clearance"
                    action={
                        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                            Add New Unit
                        </Button>
                    }
                />
            </Card>

            <DataTable
                columns={columns}
                data={units}
                isLoading={isLoading}
                keyExtractor={(r) => String(r.id)}
                emptyMessage="No clearance units configured."
            />

            <Modal 
                isOpen={isModalOpen} 
                onClose={closeModal} 
                title={editingUnit ? "Edit Clearance Unit" : "Add Clearance Unit"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Unit Code / System Name</label>
                        <Input 
                            required 
                            placeholder="e.g. IT"
                            value={formData.name}
                            onChange={(e: any) => setFormData(p => ({ ...p, name: e.target.value }))}
                            disabled={editingUnit?.isSystemGenerated}
                        />
                        {editingUnit?.isSystemGenerated && (
                            <p className="text-xs text-gray-500">System units cannot be renamed.</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Full Name <span className="text-xs text-gray-400">(displayed on profile)</span></label>
                        <Input 
                            placeholder="e.g. Information Technology Department"
                            value={formData.fullName}
                            onChange={(e: any) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Description (Optional)</label>
                        <textarea
                            className="w-full px-3 py-2 border rounded-md"
                            rows={3}
                            placeholder="Unit responsibilities during clearance"
                            value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Priority Order (Sequential)</label>
                        <Input 
                            type="number"
                            placeholder="e.g. 1"
                            value={formData.priorityOrder}
                            onChange={(e: any) => setFormData(p => ({ ...p, priorityOrder: parseInt(e.target.value) || 0 }))}
                        />
                        <p className="text-xs text-gray-400 mt-0.5">
                            Units with the same value run in <strong>parallel</strong> (same step). The displayed Step number is always normalized 1–N automatically.
                        </p>
                    </div>

                    <div className="p-3 bg-gray-50 border rounded-md space-y-4">
                        <h4 className="text-sm font-semibold text-gray-800">Clearance Body Account</h4>
                        <p className="text-xs text-gray-500">
                            {editingUnit ? "Update the login ID/Username for this clearance body." : "Accounts are strictly required so that bodies can log into the dashboard securely."}
                        </p>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700">Login ID / Username</label>
                            <Input 
                                required
                                placeholder="e.g. IT-01"
                                value={formData.loginId}
                                onChange={(e: any) => setFormData(p => ({ ...p, loginId: e.target.value }))}
                            />
                        </div>
                        {!editingUnit && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-700">Login Password</label>
                                <Input 
                                    required
                                    type="password"
                                    placeholder="Secure password"
                                    value={formData.loginPassword}
                                    onChange={(e: any) => setFormData(p => ({ ...p, loginPassword: e.target.value }))}
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button 
                            type="submit" 
                            variant="primary" 
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            Save
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

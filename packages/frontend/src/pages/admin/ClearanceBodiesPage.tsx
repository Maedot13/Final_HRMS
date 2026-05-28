import { useState, useMemo } from 'react';
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
    const [formData, setFormData] = useState({ name: '', fullName: '', description: '', priorityOrder: 1, loginId: '', loginPassword: '' });

    const { data: units = [], isLoading } = useQuery({
        queryKey: ['clearanceUnits'],
        queryFn: async () => {
            const res = await clearanceApi.listUnits();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    // Compute the next available priority order for new units
    const nextAvailableOrder = useMemo(() => {
        if (units.length === 0) return 1;
        const maxOrder = Math.max(...units.map((u: any) => u.priorityOrder || 0));
        return maxOrder + 1;
    }, [units]);

    // Max valid priority order value (for new unit = total + 1, for edit = total)
    const maxValidOrder = useMemo(() => {
        const activeCount = units.filter((u: any) => u.isActive).length;
        return editingUnit ? activeCount : activeCount + 1;
    }, [units, editingUnit]);

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
        setFormData({ name: '', fullName: '', description: '', priorityOrder: 1, loginId: '', loginPassword: '' });
    };

    const openCreateModal = () => {
        setEditingUnit(null);
        setFormData({ name: '', fullName: '', description: '', priorityOrder: nextAvailableOrder, loginId: '', loginPassword: '' });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        // Client-side validation: priority must be >= 1
        if (!Number.isFinite(formData.priorityOrder) || formData.priorityOrder < 1) {
            toast.error('Priority order must be a positive number starting from 1');
            return;
        }

        if (editingUnit) {
            updateMutation.mutate({ id: editingUnit.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const columns: Column<ClearanceUnit>[] = [
        {
            key: 'priorityOrder',
            header: 'Order',
            render: (r: any) => (
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {r.priorityOrder || '—'}
                </span>
            ),
        },
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
                                priorityOrder: (r as any).priorityOrder || 1, 
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
                        <Button variant="primary" onClick={openCreateModal}>
                            Add New Unit
                        </Button>
                    }
                />
            </Card>

            {/* Info banner explaining priority ordering */}
            <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                <span className="mt-0.5 shrink-0">ℹ️</span>
                <span>
                    <strong>Sequential Approval Order:</strong> Clearance units are approved in strict priority order.
                    A unit with order 2 cannot approve until order 1 is complete, and so on.
                    Orders must start from 1 with no gaps. The system auto-reorders when units are added or moved.
                </span>
            </div>

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
                            required
                            min={1}
                            max={maxValidOrder}
                            placeholder="e.g. 1"
                            value={formData.priorityOrder}
                            onChange={(e: any) => {
                                const val = parseInt(e.target.value);
                                setFormData(p => ({ ...p, priorityOrder: Number.isNaN(val) ? 1 : Math.max(1, val) }));
                            }}
                        />
                        <p className="text-xs text-gray-500">
                            Must be between 1 and {maxValidOrder}. Other units will shift automatically to maintain sequence.
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

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
    const [formData, setFormData] = useState({ name: '', description: '' });

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
        setFormData({ name: '', description: '' });
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
            key: 'name',
            header: 'Unit Name',
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
                            setFormData({ name: r.name, description: r.description || '' });
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
                        <label className="text-sm font-medium text-gray-700">Unit Name</label>
                        <Input 
                            required 
                            placeholder="e.g. IT Department"
                            value={formData.name}
                            onChange={(e: any) => setFormData(p => ({ ...p, name: e.target.value }))}
                            disabled={editingUnit?.isSystemGenerated}
                        />
                        {editingUnit?.isSystemGenerated && (
                            <p className="text-xs text-gray-500">System units cannot be renamed.</p>
                        )}
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

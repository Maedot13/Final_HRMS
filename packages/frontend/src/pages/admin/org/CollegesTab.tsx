import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DataTable, type Column } from '../../../components/shared/DataTable';
import { collegeApi } from '../../../api/colleges';
import { toast } from 'react-toastify';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';

export function CollegesTab() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeanModalOpen, setIsDeanModalOpen] = useState(false);
    const [editingCollege, setEditingCollege] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [deanData, setDeanData] = useState({ employeeId: '' });

    const { data: colleges = [], isLoading } = useQuery({
        queryKey: ['colleges'],
        queryFn: async () => {
            const res = await collegeApi.list();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const createMutation = useMutation({
        mutationFn: collegeApi.create,
        onSuccess: () => {
            toast.success('College created');
            queryClient.invalidateQueries({ queryKey: ['colleges'] });
            closeModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create college')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => collegeApi.update(id, data),
        onSuccess: () => {
            toast.success('College updated');
            queryClient.invalidateQueries({ queryKey: ['colleges'] });
            closeModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update college')
    });

    const assignDeanMutation = useMutation({
        mutationFn: ({ id, employeeId }: { id: number, employeeId: string | null }) => collegeApi.assignDean(id, employeeId),
        onSuccess: () => {
            toast.success('Dean assigned successfully');
            queryClient.invalidateQueries({ queryKey: ['colleges'] });
            closeDeanModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to assign dean')
    });

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCollege(null);
        setFormData({ name: '', description: '' });
    };

    const closeDeanModal = () => {
        setIsDeanModalOpen(false);
        setEditingCollege(null);
        setDeanData({ employeeId: '' });
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCollege) {
            updateMutation.mutate({ id: editingCollege.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleAssignDean = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCollege) {
            assignDeanMutation.mutate({ 
                id: editingCollege.id, 
                employeeId: deanData.employeeId || null 
            });
        }
    };

    const columns: Column<any>[] = [
        { key: 'name', header: 'College Name', render: (r) => r.name },
        { key: 'description', header: 'Description', render: (r) => r.description || '-' },
        { 
            key: 'dean', 
            header: 'Dean', 
            render: (r) => r.dean ? `${r.dean.name} (${r.dean.employeeId})` : <span className="text-gray-400">Not assigned</span> 
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                        setEditingCollege(r);
                        setFormData({ name: r.name, description: r.description || '' });
                        setIsModalOpen(true);
                    }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                        setEditingCollege(r);
                        setDeanData({ employeeId: r.dean?.employeeId || '' });
                        setIsDeanModalOpen(true);
                    }}>Assign Dean</Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Colleges"
                    subtitle="Manage Colleges and Assign Deans"
                    action={<Button variant="primary" onClick={() => setIsModalOpen(true)}>Add College</Button>}
                />
            </Card>

            <DataTable columns={columns} data={colleges} isLoading={isLoading} keyExtractor={(r) => String(r.id)} emptyMessage="No colleges found." />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCollege ? "Edit College" : "Add College"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">College Name</label>
                        <Input required value={formData.name} onChange={(e: any) => setFormData(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Description</label>
                        <Input value={formData.description} onChange={(e: any) => setFormData(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={createMutation.isPending || updateMutation.isPending}>Save</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeanModalOpen} onClose={closeDeanModal} title={`Assign Dean - ${editingCollege?.name}`}>
                <form onSubmit={handleAssignDean} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Dean Employee ID</label>
                        <Input placeholder="e.g. BDU00001" value={deanData.employeeId} onChange={(e: any) => setDeanData(p => ({ ...p, employeeId: e.target.value }))} />
                        <p className="text-xs text-gray-500 mt-1">Leave blank to unassign.</p>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={closeDeanModal}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={assignDeanMutation.isPending}>Assign</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

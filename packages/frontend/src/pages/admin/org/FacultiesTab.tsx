import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DataTable, type Column } from '../../../components/shared/DataTable';
import { facultyApi } from '../../../api/faculties';
import { collegeApi } from '../../../api/colleges';
import { toast } from 'react-toastify';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';

export function FacultiesTab() {
    const queryClient = useQueryClient();
    const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeanModalOpen, setIsDeanModalOpen] = useState(false);
    const [editingFaculty, setEditingFaculty] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [deanData, setDeanData] = useState({ employeeId: '' });

    const { data: colleges = [] } = useQuery({
        queryKey: ['colleges'],
        queryFn: async () => {
            const res = await collegeApi.list();
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const activeCollegeId = selectedCollegeId || (colleges.length > 0 ? colleges[0].id : null);

    const { data: faculties = [], isLoading } = useQuery({
        queryKey: ['faculties', activeCollegeId],
        queryFn: async () => {
            if (!activeCollegeId) return [];
            const res = await facultyApi.list(activeCollegeId);
            return Array.isArray(res.data) ? res.data : [];
        },
        enabled: !!activeCollegeId,
    });

    const createMutation = useMutation({
        mutationFn: facultyApi.create,
        onSuccess: () => {
            toast.success('Faculty created');
            queryClient.invalidateQueries({ queryKey: ['faculties'] });
            closeModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create faculty')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => facultyApi.update(id, data),
        onSuccess: () => {
            toast.success('Faculty updated');
            queryClient.invalidateQueries({ queryKey: ['faculties'] });
            closeModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update faculty')
    });

    const assignDeanMutation = useMutation({
        mutationFn: ({ id, employeeId }: { id: number, employeeId: string | null }) => facultyApi.assignDean(id, employeeId),
        onSuccess: () => {
            toast.success('Dean assigned successfully');
            queryClient.invalidateQueries({ queryKey: ['faculties'] });
            closeDeanModal();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to assign dean')
    });

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingFaculty(null);
        setFormData({ name: '', description: '' });
    };

    const closeDeanModal = () => {
        setIsDeanModalOpen(false);
        setEditingFaculty(null);
        setDeanData({ employeeId: '' });
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCollegeId) return;

        if (editingFaculty) {
            updateMutation.mutate({ id: editingFaculty.id, data: formData });
        } else {
            createMutation.mutate({ collegeId: activeCollegeId, ...formData });
        }
    };

    const handleAssignDean = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingFaculty) {
            assignDeanMutation.mutate({ 
                id: editingFaculty.id, 
                employeeId: deanData.employeeId || null 
            });
        }
    };

    const columns: Column<any>[] = [
        { key: 'name', header: 'Faculty Name', render: (r) => r.name },
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
                        setEditingFaculty(r);
                        setFormData({ name: r.name, description: r.description || '' });
                        setIsModalOpen(true);
                    }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                        setEditingFaculty(r);
                        setDeanData({ employeeId: r.dean?.employeeId || '' });
                        setIsDeanModalOpen(true);
                    }}>Assign Dean</Button>
                </div>
            )
        }
    ];

    if (colleges.length === 0) {
        return <div className="text-gray-500 p-4">Please create a College first before managing Faculties.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Select College:</label>
                <select 
                    className="border rounded px-3 py-1.5"
                    value={activeCollegeId || ''}
                    onChange={e => setSelectedCollegeId(parseInt(e.target.value))}
                >
                    {colleges.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <Card>
                <CardHeader
                    title="Faculties"
                    subtitle="Manage Faculties and Assign Deans"
                    action={<Button variant="primary" onClick={() => setIsModalOpen(true)}>Add Faculty</Button>}
                />
            </Card>

            <DataTable columns={columns} data={faculties} isLoading={isLoading} keyExtractor={(r) => String(r.id)} emptyMessage="No faculties found in this college." />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingFaculty ? "Edit Faculty" : "Add Faculty"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Faculty Name</label>
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

            <Modal isOpen={isDeanModalOpen} onClose={closeDeanModal} title={`Assign Dean - ${editingFaculty?.name}`}>
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

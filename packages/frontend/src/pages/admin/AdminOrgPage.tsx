import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/shared/DataTable';
import { departmentApi } from '../../api/departments';

import { toast } from 'react-toastify';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

import { CollegesTab } from './org/CollegesTab';
import { FacultiesTab } from './org/FacultiesTab';

function DepartmentsTab() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', headEmployeeId: '', facultyId: '' });



    const { data: departments = [], isLoading: isDeptsLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const res = await departmentApi.list();
            return Array.isArray(res.data) ? res.data : [];
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
        mutationFn: ({ id, employeeId }: { id: number, employeeId: string }) => departmentApi.assignHead(id, employeeId),
        onSuccess: () => {
            toast.success('Department Head assigned');
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to assign head')
    });

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingDept(null);
        setFormData({ name: '', headEmployeeId: '', facultyId: '' });
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (editingDept) {
            if (formData.name && formData.name !== editingDept.name) {
                updateMutation.mutate({ id: editingDept.id, data: { name: formData.name } });
            }
        } else {
            createMutation.mutate({ 
                name: formData.name
                // facultyId: formData.facultyId ? parseInt(formData.facultyId) : undefined
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
                                headEmployeeId: r.headEmployeeId ? String(r.headEmployeeId) : '',
                                facultyId: r.facultyId ? String(r.facultyId) : ''
                            });
                            setIsModalOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                            const empId = prompt("Enter Head Employee ID to assign (e.g. BDU00001):");
                            if (empId) {
                                assignHeadMutation.mutate({ id: r.id, employeeId: empId });
                            }
                        }}
                    >
                        Assign Head
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Departments"
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

export default function AdminOrgPage() {
    const [activeTab, setActiveTab] = useState<'colleges' | 'faculties' | 'departments'>('colleges');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Organization Hierarchy</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage the structure of your campus (Colleges → Faculties → Departments)
                </p>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {['colleges', 'faculties', 'departments'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`${
                                activeTab === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div>
                {activeTab === 'colleges' && <CollegesTab />}
                {activeTab === 'faculties' && <FacultiesTab />}
                {activeTab === 'departments' && <DepartmentsTab />}
            </div>
        </div>
    );
}

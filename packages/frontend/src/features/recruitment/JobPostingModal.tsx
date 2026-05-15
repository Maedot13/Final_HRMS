import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { recruitmentApi } from '../../api/recruitment';
import { departmentApi } from '../../api/departments';
import { toast } from 'react-toastify';

interface JobPostingModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

export function JobPostingModal({ isOpen, onClose, initialData }: JobPostingModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        position: initialData?.position || '',
        departmentId: initialData?.departmentId?.toString() || '',
        description: initialData?.description || '',
        requirements: initialData?.requirements || '',
        deadline: initialData?.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '',
        vacancies: initialData?.vacancies || 1,
    });

    const mutation = useMutation({
        mutationFn: (data: any) => 
            initialData 
                ? recruitmentApi.updateJob(initialData.id, data)
                : recruitmentApi.createJob(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recruitmentJobs'] });
            toast.success(initialData ? 'Job posting updated successfully' : 'Job posting created successfully');
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || (initialData ? 'Failed to update job posting' : 'Failed to create job posting'));
        },
    });

    const { data: departmentsResponse } = useQuery({
        queryKey: ['departments'],
        queryFn: () => departmentApi.list()
    });
    const departments = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            ...formData,
            departmentId: parseInt(formData.departmentId),
            vacancies: parseInt(formData.vacancies.toString())
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Job Posting" : "Create Job Posting"} size="lg">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4 mx-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            <strong>Validation Rules:</strong>
                        </p>
                        <ul className="list-disc list-inside text-xs text-blue-600 mt-1">
                            <li>Title: 3-100 characters</li>
                            <li>Position & Department: Min 2 characters</li>
                            <li>Description & Requirements: Min 10 characters</li>
                            <li>Deadline: Must be today or in the future</li>
                        </ul>
                    </div>
                </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4 px-4 pb-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Job Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />
                    <Input
                        label="Position/Grade"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Department</label>
                    <select
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                        value={formData.departmentId}
                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                        required
                    >
                        <option value="">Select a department</option>
                        {departments.map((dept: any) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                    />
                    <p className="text-[10px] text-gray-400">Minimum 10 characters required</p>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Requirements</label>
                    <textarea
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        rows={3}
                        value={formData.requirements}
                        onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                        required
                    />
                    <p className="text-[10px] text-gray-400">Minimum 10 characters required</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Application Deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        required
                        min={new Date().toISOString().split('T')[0]}
                    />
                    <Input
                        label="Number of Vacancies"
                        type="number"
                        min="1"
                        value={formData.vacancies}
                        onChange={(e) => setFormData({ ...formData, vacancies: parseInt(e.target.value) || 1 })}
                        required
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={mutation.isPending}>
                        {initialData ? "Save Changes" : "Post Job"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

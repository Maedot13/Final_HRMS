import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { recruitmentApi } from '../../api/recruitment';
import { toast } from 'react-toastify';

interface JobPostingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function JobPostingModal({ isOpen, onClose }: JobPostingModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        title: '',
        position: '',
        department: '',
        description: '',
        requirements: '',
        deadline: '',
    });

    const mutation = useMutation({
        mutationFn: (data: any) => recruitmentApi.createJob(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recruitmentJobs'] });
            toast.success('Job posting created successfully');
            onClose();
            setFormData({
                title: '',
                position: '',
                department: '',
                description: '',
                requirements: '',
                deadline: '',
            });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create job posting');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Job Posting" size="lg">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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
                <Input
                    label="Department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                />
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                    />
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
                </div>
                <Input
                    label="Application Deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                />
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={mutation.isPending}>
                        Post Job
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

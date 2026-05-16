import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { recruitmentApi } from '../../api/recruitment';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../store/useAuthStore';

interface JobApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: number | null;
    jobTitle: string;
}

export function JobApplicationModal({ isOpen, onClose, jobId, jobTitle }: JobApplicationModalProps) {
    const queryClient = useQueryClient();
    const user = useAuthStore(state => state.user);
    const [reasonForApplying, setReasonForApplying] = useState('');
    const [cvFile, setCvFile] = useState<File | null>(null);

    const mutation = useMutation({
        mutationFn: (data: FormData) => recruitmentApi.apply(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recruitmentJobs'] });
            toast.success('Job application submitted successfully');
            onClose();
            setReasonForApplying('');
            setCvFile(null);
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message || 'Failed to submit application';
            toast.error(msg);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobId) return;

        const formData = new FormData();
        formData.append('jobPostingId', jobId.toString());
        formData.append('reasonForApplying', reasonForApplying);
        if (cvFile) {
            formData.append('cv', cvFile);
        }

        mutation.mutate(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Apply for ${jobTitle}`}>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                
                <div className="bg-gray-50 border rounded-md p-3 mb-4 text-sm">
                    <h4 className="font-semibold text-gray-700 mb-2">Auto-Filled Employee Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <div><span className="font-medium">Name:</span> {user?.name || 'N/A'}</div>
                        <div><span className="font-medium">ID:</span> {user?.employeeId || 'N/A'}</div>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Reason for Applying</label>
                    <textarea
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                        rows={4}
                        value={reasonForApplying}
                        onChange={(e) => setReasonForApplying(e.target.value)}
                        required
                        placeholder="Why are you applying for this position?"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Upload CV (PDF/DOCX)</label>
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={mutation.isPending}>
                        Submit Application
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

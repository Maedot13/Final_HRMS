import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { clearanceApi } from '../../api/clearance';
import { toast } from 'react-toastify';

interface ClearanceRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ClearanceRequestModal({ isOpen, onClose }: ClearanceRequestModalProps) {
    const queryClient = useQueryClient();
    const [reason, setReason] = useState('');
    const [lastWorkingDay, setLastWorkingDay] = useState('');

    const mutation = useMutation({
        mutationFn: (data: { reason: string; lastWorkingDay: string }) =>
            clearanceApi.initiate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clearanceRequests'] });
            toast.success('Clearance process initiated successfully');
            onClose();
            setReason('');
            setLastWorkingDay('');
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message || 'Failed to initiate clearance';
            toast.error(msg);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ reason, lastWorkingDay });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Initiate Clearance">
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <Input
                    label="Reason for Clearance"
                    placeholder="e.g., Resignation, Retirement, Transfer"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                />
                <Input
                    label="Last Working Day"
                    type="date"
                    value={lastWorkingDay}
                    onChange={(e) => setLastWorkingDay(e.target.value)}
                    required
                />
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={mutation.isPending}>
                        Initiate
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { clearanceApi } from '../../api/clearance';
import { toast } from 'react-toastify';
import { FiUser, FiSearch } from 'react-icons/fi';
import apiClient from '../../api/client';

interface ClearanceRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ClearanceRequestModal({ isOpen, onClose }: ClearanceRequestModalProps) {
    const queryClient = useQueryClient();
    const [targetEmployeeId, setTargetEmployeeId] = useState('');
    const [reason, setReason] = useState('');
    const [lastWorkingDay, setLastWorkingDay] = useState('');
    const [lookupResult, setLookupResult] = useState<{ name: string; campus?: string; employeeId: string } | null>(null);
    const [looking, setLooking] = useState(false);

    const handleLookup = async () => {
        if (!targetEmployeeId.trim()) return;
        setLooking(true);
        setLookupResult(null);
        try {
            const res = await apiClient.get('/employees', { params: { employeeId: targetEmployeeId.trim() } });
            const employees = Array.isArray(res.data?.data) ? res.data.data
                : Array.isArray(res.data) ? res.data : [];
            const match = employees.find((e: any) =>
                e.employeeId?.toLowerCase() === targetEmployeeId.trim().toLowerCase()
            );
            if (match) {
                setLookupResult({
                    name: match.name || `${match.firstName || ''} ${match.lastName || ''}`.trim(),
                    campus: match.campus?.name,
                    employeeId: match.employeeId,
                });
            } else {
                toast.error(`No employee found with ID "${targetEmployeeId}"`);
            }
        } catch {
            toast.error('Could not look up employee');
        } finally {
            setLooking(false);
        }
    };

    const mutation = useMutation({
        mutationFn: (data: { targetEmployeeId: string; reason: string; lastWorkingDay: string }) =>
            clearanceApi.initiate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clearanceRequests'] });
            toast.success('Clearance process initiated successfully');
            handleClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to initiate clearance');
        },
    });

    const handleClose = () => {
        setTargetEmployeeId('');
        setReason('');
        setLastWorkingDay('');
        setLookupResult(null);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lookupResult) {
            toast.error('Please verify the employee ID first');
            return;
        }
        if (!reason.trim() || reason.trim().length < 10) {
            toast.error('Reason must be at least 10 characters');
            return;
        }
        if (!lastWorkingDay) {
            toast.error('Last working day is required');
            return;
        }
        mutation.mutate({ targetEmployeeId: lookupResult.employeeId, reason, lastWorkingDay });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Initiate Employee Clearance">
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">

                {/* Employee Search */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                        Employee ID <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g. EMP0001"
                            value={targetEmployeeId}
                            onChange={(e) => {
                                setTargetEmployeeId(e.target.value);
                                setLookupResult(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
                            required
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleLookup}
                            isLoading={looking}
                            className="shrink-0"
                        >
                            <FiSearch className="w-4 h-4 mr-1" />
                            Verify
                        </Button>
                    </div>

                    {/* Verified employee info */}
                    {lookupResult && (
                        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                            <div className="p-1.5 rounded-full bg-green-100">
                                <FiUser className="w-4 h-4 text-green-700" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-green-900">{lookupResult.name}</p>
                                <p className="text-xs text-green-600">
                                    {lookupResult.employeeId}
                                    {lookupResult.campus ? ` · ${lookupResult.campus}` : ''}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reason */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                        Reason for Clearance <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="e.g., Resignation, Retirement, Transfer (min. 10 characters)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                    />
                </div>

                {/* Last Working Day */}
                <Input
                    label="Last Working Day"
                    type="date"
                    value={lastWorkingDay}
                    onChange={(e) => setLastWorkingDay(e.target.value)}
                    required
                />

                {/* Info note */}
                <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                    This will send clearance checks to <strong>all active clearance bodies</strong> across every campus.
                    Campus HR officers will approve after their bodies sign off. Head HR provides final approval.
                </div>

                <div className="flex justify-end gap-3 pt-1">
                    <Button type="button" variant="ghost" onClick={handleClose} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={mutation.isPending}
                        disabled={!lookupResult}
                    >
                        Initiate Clearance
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

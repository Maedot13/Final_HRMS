import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi, type LeaveRequestPayload } from '../../api/leave';

const leaveSchema = yup.object({
    leaveType: yup
        .string()
        .oneOf(['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID'])
        .required('Leave type is required'),
    startDate: yup.string().required('Start date is required'),
    endDate: yup
        .string()
        .required('End date is required')
        .test('is-after-start', 'End date must be after start date', function (value) {
            const { startDate } = this.parent;
            if (!startDate || !value) return true;
            return new Date(value) >= new Date(startDate);
        }),
    reason: yup.string().required('Reason is required').min(10, 'Please provide more details'),
}).required();

interface LeaveRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LeaveRequestModal({ isOpen, onClose }: LeaveRequestModalProps) {
    const queryClient = useQueryClient();
    const [apiError, setApiError] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(leaveSchema) as any,
        defaultValues: {
            leaveType: 'ANNUAL',
            startDate: '',
            endDate: '',
            reason: '',
        },
    });

    const mutation = useMutation({
        mutationFn: (data: LeaveRequestPayload) => leaveApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
            reset();
            onClose();
        },
        onError: (error: any) => {
            setApiError(error.response?.data?.message || 'Failed to submit leave request');
        },
    });

    const onSubmit = (data: any) => {
        setApiError(null);
        mutation.mutate(data);
    };

    const handleClose = () => {
        reset();
        setApiError(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Request Time Off"
            size="md"
            footer={
                <>
                    <Button variant="ghost" onClick={handleClose} disabled={mutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit(onSubmit)}
                        isLoading={mutation.isPending}
                    >
                        Submit Request
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {apiError && (
                    <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
                        {apiError}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Leave Type</label>
                    <Controller
                        name="leaveType"
                        control={control}
                        render={({ field }) => (
                            <>
                                <select
                                    {...field}
                                    className={`w-full rounded-md border ${errors.leaveType ? 'border-red-500' : 'border-gray-300'} bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
                                >
                                    <option value="ANNUAL">Annual Leave</option>
                                    <option value="SICK">Sick Leave</option>
                                    <option value="MATERNITY">Maternity Leave</option>
                                    <option value="PATERNITY">Paternity Leave</option>
                                    <option value="UNPAID">Unpaid Leave</option>
                                </select>
                                {errors.leaveType && (
                                    <p className="mt-1 text-xs text-red-500">{errors.leaveType.message as string}</p>
                                )}
                            </>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Start Date</label>
                        <Controller
                            name="startDate"
                            control={control}
                            render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="date"
                                        error={errors.startDate?.message as string}
                                        className="w-full"
                                    />
                            )}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">End Date</label>
                        <Controller
                            name="endDate"
                            control={control}
                            render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="date"
                                        error={errors.endDate?.message as string}
                                        className="w-full"
                                    />
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Reason</label>
                    <Controller
                        name="reason"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <textarea
                                    {...field}
                                    rows={3}
                                    placeholder="Please provide details for this request..."
                                    className={`w-full rounded-md border ${errors.reason ? 'border-red-500' : 'border-gray-300'} bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
                                />
                                {errors.reason && (
                                    <p className="mt-1 text-xs text-red-500">{errors.reason.message as string}</p>
                                )}
                            </div>
                        )}
                    />
                </div>
            </form>
        </Modal>
    );
}

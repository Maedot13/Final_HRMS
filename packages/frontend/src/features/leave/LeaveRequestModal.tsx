import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../../store/useAuthStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveApi, type LeaveTypeName } from '../../api/leave';
import { toast } from 'react-toastify';
import {
    FiCalendar,
    FiUpload,
    FiInfo,
    FiAlertTriangle,
    FiX,
} from 'react-icons/fi';

// ─── Leave type configuration ─────────────────────────────────────────────────

interface LeaveConfig {
    label: string;
    requiresDoc: boolean;
    docHint?: string;
    eligibility: string;
    maxDays?: number;
    routesTo: string;
    color: string;
}

const LEAVE_CONFIG: Record<LeaveTypeName, LeaveConfig> = {
    ANNUAL: {
        label: 'Annual Leave',
        requiresDoc: false,
        eligibility: 'All staff',
        maxDays: 30,
        routesTo: 'Department Head → HR Officer',
        color: 'bg-blue-50 border-blue-200 text-blue-800',
    },
    MATERNITY: {
        label: 'Maternity Leave',
        requiresDoc: true,
        docHint: 'Medical certificate confirming pregnancy / expected due date',
        eligibility: 'Female staff (pregnant)',
        maxDays: 120,
        routesTo: 'Department Head → HR Officer',
        color: 'bg-pink-50 border-pink-200 text-pink-800',
    },
    PATERNITY: {
        label: 'Paternity Leave',
        requiresDoc: true,
        docHint: "Medical certificate confirming partner's delivery",
        eligibility: 'Male staff (partner delivered)',
        maxDays: 10,
        routesTo: 'Department Head → HR Officer',
        color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    },
    SICK: {
        label: 'Sick Leave',
        requiresDoc: true,
        docHint: 'Medical certificate from a licensed physician',
        eligibility: 'All staff',
        maxDays: 240,
        routesTo: 'Department Head → HR Officer',
        color: 'bg-orange-50 border-orange-200 text-orange-800',
    },
    PERSONAL: {
        label: 'Personal Leave (Marriage / Bereavement)',
        requiresDoc: false,
        eligibility: 'All staff',
        maxDays: 3,
        routesTo: 'Department Head → HR Officer',
        color: 'bg-purple-50 border-purple-200 text-purple-800',
    },
    STUDY: {
        label: 'Study Leave',
        requiresDoc: true,
        docHint: 'Evidence / acceptance letter for study opportunity',
        eligibility: 'Academic staff',
        maxDays: 730,
        routesTo: 'Department Head → HR Officer',
        color: 'bg-green-50 border-green-200 text-green-800',
    },
    RESEARCH: {
        label: 'Research Leave',
        requiresDoc: true,
        docHint: 'Research programme or approved study plan document',
        eligibility: 'Full-time academic staff (Assistant Professor+)',
        maxDays: 180,
        routesTo: 'Department Head → Dean → Academic VP → HR Officer',
        color: 'bg-teal-50 border-teal-200 text-teal-800',
    },
    SABBATICAL: {
        label: 'Sabbatical Leave',
        requiresDoc: true,
        docHint: 'Study / research plan document',
        eligibility: 'Full-time academic staff (Asst. Prof+), 6+ continuous years service',
        maxDays: 365,
        routesTo: 'Department Head → Dean → Academic VP → HR Officer',
        color: 'bg-amber-50 border-amber-200 text-amber-800',
    },
    UNPAID: {
        label: 'Unpaid Leave',
        requiresDoc: false,
        eligibility: 'All staff',
        routesTo: 'Department Head → Dean → Academic VP → HR Officer',
        color: 'bg-gray-50 border-gray-200 text-gray-700',
    },
};

type FormValues = {
    leaveType: LeaveTypeName;
    startDate: string;
    endDate: string;
    reason: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calculateDays = (start: string, end: string): number => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

interface LeaveRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LeaveRequestModal({ isOpen, onClose }: LeaveRequestModalProps) {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const [apiError, setApiError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate years of service
    const employee = user?.employee;
    const hireDate = employee?.hireDate ? new Date(employee.hireDate) : new Date();
    const yearsOfService = (Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const isAcademic = (position: string = '') => {
        const pos = position.toLowerCase();
        return pos.includes('professor') || pos.includes('lecturer') || pos.includes('instructor') || pos.includes('dean') || pos.includes('research') || pos.includes('academic');
    };

    const isEligible = (type: LeaveTypeName) => {
        if (!employee) return false;
        
        // Use the new staffType if available; fallback to position checking
        const isAcademicStaff = employee.staffType === 'ACADEMIC' || 
                                (!employee.staffType && isAcademic(employee.position));
        
        switch (type) {
            case 'SABBATICAL':
                return isAcademicStaff && yearsOfService >= 6;
            case 'RESEARCH':
            case 'STUDY':
                return isAcademicStaff;
            case 'MATERNITY':
                return employee.gender === 'FEMALE' || !employee.gender; // fallback to true if gender not set
            case 'PATERNITY':
                return employee.gender === 'MALE' || !employee.gender;
            default:
                return true;
        }
    };

    const availableLeaveTypes = (Object.keys(LEAVE_CONFIG) as LeaveTypeName[]).filter(isEligible);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            leaveType: 'ANNUAL',
            startDate: '',
            endDate: '',
            reason: '',
        },
    });

    const selectedType = watch('leaveType');
    const config = LEAVE_CONFIG[selectedType];

    const { data: balanceData } = useQuery({
        queryKey: ['leaveBalance'],
        queryFn: async () => {
            const res = await leaveApi.getMyBalance();
            return res.data?.data || null;
        },
    });

    const mutation = useMutation({
        mutationFn: (values: FormValues) => {
            if (file) {
                const fd = new FormData();
                fd.append('leaveType', values.leaveType);
                fd.append('startDate', values.startDate);
                fd.append('endDate', values.endDate);
                fd.append('reason', values.reason);
                fd.append('attachment', file);
                return leaveApi.createWithFile(fd);
            }
            return leaveApi.create(values);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
            toast.success('Leave request submitted. Your department head will review it.');
            handleClose();
        },
        onError: (error: any) => {
            setApiError(
                error.response?.data?.message || 'Failed to submit leave request'
            );
        },
    });

    const onSubmit = (data: FormValues) => {
        setApiError(null);
        
        const sDate = new Date(data.startDate);
        const eDate = new Date(data.endDate);
        if (eDate < sDate) {
            setApiError('End date must be after start date');
            return;
        }

        const requestedDays = calculateDays(data.startDate, data.endDate);

        if (config.maxDays && requestedDays > config.maxDays) {
            setApiError(`${config.label} cannot exceed ${config.maxDays} days. You requested ${requestedDays} days.`);
            return;
        }

        if (balanceData) {
            const balanceMap: Record<string, string> = {
                ANNUAL: 'annualBalance',
                SICK: 'sickBalance',
                PERSONAL: 'personalBalance',
            };
            const field = balanceMap[data.leaveType];
            if (field) {
                const available = balanceData[field] as number;
                if (available < requestedDays) {
                    setApiError(`Insufficient ${config.label.toLowerCase()} balance. Available: ${available} days, Requested: ${requestedDays} days.`);
                    return;
                }
            }
        }

        if (config.requiresDoc && !file) {
            setApiError(`A supporting document is required for ${config.label}. Please attach a file.`);
            return;
        }
        mutation.mutate(data);
    };

    const handleClose = () => {
        reset();
        setFile(null);
        setApiError(null);
        onClose();
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Request Leave"
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

                {/* API Error */}
                {apiError && (
                    <div className="flex items-start gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                        <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        {apiError}
                    </div>
                )}

                {/* Leave Type */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Leave Type</label>
                    <Controller
                        name="leaveType"
                        control={control}
                        render={({ field }) => (
                            <select
                                {...field}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {availableLeaveTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {LEAVE_CONFIG[type].label}
                                    </option>
                                ))}
                            </select>
                        )}
                    />
                </div>

                {/* Leave info banner */}
                <div className={`rounded-lg border px-3 py-2.5 text-xs space-y-1 ${config.color}`}>
                    <div className="flex items-center gap-1.5 font-semibold">
                        <FiInfo className="w-3.5 h-3.5" />
                        {config.label}
                    </div>
                    <div><span className="font-medium">Eligibility:</span> {config.eligibility}</div>
                    {config.maxDays && (
                        <div><span className="font-medium">Max duration:</span> {config.maxDays} days</div>
                    )}
                    {balanceData && ['ANNUAL', 'SICK', 'PERSONAL'].includes(selectedType) && (
                        <div>
                            <span className="font-medium">Available balance: </span> 
                            {balanceData[{
                                ANNUAL: 'annualBalance',
                                SICK: 'sickBalance',
                                PERSONAL: 'personalBalance'
                            }[selectedType as string] as keyof typeof balanceData] || 0} days
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <FiCalendar className="w-3 h-3" />
                        <span className="font-medium">Approval route:</span> {config.routesTo}
                    </div>
                    {config.requiresDoc && (
                        <div className="flex items-center gap-1 text-amber-700 font-medium mt-1">
                            <FiUpload className="w-3 h-3" />
                            Document required: {config.docHint}
                        </div>
                    )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Start Date</label>
                        <Controller
                            name="startDate"
                            control={control}
                            rules={{ required: 'Start date is required' }}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    type="date"
                                    error={errors.startDate?.message}
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
                            rules={{ required: 'End date is required' }}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    type="date"
                                    error={errors.endDate?.message}
                                    className="w-full"
                                />
                            )}
                        />
                    </div>
                </div>

                {/* Reason */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Reason</label>
                    <Controller
                        name="reason"
                        control={control}
                        rules={{ required: 'Reason is required', minLength: { value: 5, message: 'Please provide more detail' } }}
                        render={({ field }) => (
                            <div>
                                <textarea
                                    {...field}
                                    rows={3}
                                    placeholder="Briefly explain the reason for this leave request…"
                                    className={`w-full rounded-lg border ${errors.reason ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'} px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none`}
                                />
                                {errors.reason && (
                                    <p className="mt-1 text-xs text-red-500">{errors.reason.message}</p>
                                )}
                            </div>
                        )}
                    />
                </div>

                {/* Document Upload */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                        Supporting Document
                        {config.requiresDoc && <span className="text-red-500 ml-1">*</span>}
                        {!config.requiresDoc && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
                    </label>

                    {!file ? (
                        <label className={`flex items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                            ${config.requiresDoc
                                ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                            }`}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                            <FiUpload className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                                Click to upload PDF, image, or Word doc
                            </span>
                        </label>
                    ) : (
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 min-w-0">
                                <FiUpload className="w-4 h-4 text-green-600 shrink-0" />
                                <span className="text-sm text-green-800 truncate">{file.name}</span>
                                <span className="text-xs text-green-600 shrink-0">
                                    ({(file.size / 1024).toFixed(0)} KB)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={removeFile}
                                className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
}

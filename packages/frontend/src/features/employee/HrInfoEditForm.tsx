import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '../../utils/validation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { FormField } from '../../components/shared/FormField';
import type { EmployeeDetail, ApiError, Department } from '../../types';
import { getFieldErrors } from '../../utils/apiError';

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    position: z.string().optional(),
    departmentId: z.string().optional(),
    officeLocation: z.string().optional(),
    hireDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface HrInfoEditFormProps {
    employee: EmployeeDetail;
    departments: Department[];
    onSubmit: (data: Partial<EmployeeDetail>) => Promise<void>;
    onCancel: () => void;
    apiError?: ApiError | null;
    isSubmitting?: boolean;
}

export function HrInfoEditForm({
    employee,
    departments,
    onSubmit,
    onCancel,
    apiError,
    isSubmitting = false,
}: HrInfoEditFormProps) {
    const fieldErrors = apiError ? getFieldErrors(apiError.details) : {};

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: employee.name,
            position: employee.position ?? '',
            departmentId: employee.departmentId ? String(employee.departmentId) : '',
            officeLocation: employee.officeLocation ?? '',
            hireDate: employee.hireDate
                ? new Date(employee.hireDate).toISOString().split('T')[0]
                : '',
        },
    });

    const getError = (field: string) =>
        (errors as Record<string, { message?: string }>)[field]?.message ?? fieldErrors[field];

    const onFormSubmit = async (values: FormValues) => {
        await onSubmit({
            name: values.name,
            position: values.position || undefined,
            departmentId: values.departmentId ? parseInt(values.departmentId, 10) : undefined,
            officeLocation: values.officeLocation || undefined,
            hireDate: values.hireDate || undefined,
        });
    };

    const deptOptions: SelectOption[] = [
        { value: '', label: 'None / Legacy' },
        ...departments.map((d) => ({ value: String(d.id), label: d.name })),
    ];

    return (
        <Card>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4" noValidate>
                {apiError && !Object.keys(fieldErrors).length && (
                    <div className="rounded-md bg-danger/10 border border-danger/40 px-3 py-2 text-sm text-danger">
                        {apiError.message}
                    </div>
                )}

                <FormField
                    label="Full Name"
                    htmlFor="hr-name"
                    error={getError('name') ? { message: getError('name')! } : undefined}
                >
                    <Input id="hr-name" {...register('name')} />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                    label="Position"
                    htmlFor="hr-position"
                    error={getError('position') ? { message: getError('position')! } : undefined}
                >
                    <Input id="hr-position" placeholder="e.g. Lecturer, Admin Officer" {...register('position')} />
                </FormField>

                    <FormField
                        label="Department"
                        htmlFor="hr-dept"
                        error={getError('departmentId') ? { message: getError('departmentId')! } : undefined}
                    >
                        <Select id="hr-dept" options={deptOptions} {...register('departmentId')} />
                    </FormField>
                </div>

                <FormField
                    label="Office Location"
                    htmlFor="hr-location"
                    error={getError('officeLocation') ? { message: getError('officeLocation')! } : undefined}
                >
                    <Input id="hr-location" placeholder="e.g. Building A, Room 204" {...register('officeLocation')} />
                </FormField>

                <FormField
                    label="Hire Date"
                    htmlFor="hr-hiredate"
                    error={getError('hireDate') ? { message: getError('hireDate')! } : undefined}
                >
                    <Input id="hr-hiredate" type="date" {...register('hireDate')} />
                </FormField>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Save HR Info
                    </Button>
                </div>
            </form>
        </Card>
    );
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '../../utils/validation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { FormField } from '../../components/shared/FormField';
import type { EmployeeDetail, ApiError } from '../../types';
import { getFieldErrors } from '../../utils/apiError';

const schema = z.object({
    employmentStatus: z.string().optional(),
    employmentType: z.string().optional(),
    contractStartDate: z.string().optional(),
    contractEndDate: z.string().optional(),
    grossSalary: z.string().optional(),
    salaryType: z.string().optional(),
    payGrade: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface ContractEditFormProps {
    employee: EmployeeDetail;
    onSubmit: (data: Partial<EmployeeDetail>) => Promise<void>;
    onCancel: () => void;
    apiError?: ApiError | null;
    isSubmitting?: boolean;
}

const statusOptions: SelectOption[] = [
    { value: '', label: 'Select status...' },
    { value: 'PROBATION', label: 'Probation' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'TERMINATED', label: 'Terminated' },
    { value: 'RESIGNED', label: 'Resigned' },
];

const typeOptions: SelectOption[] = [
    { value: '', label: 'Select type...' },
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'CONTRACT', label: 'Contract' },
];

const salaryTypeOptions: SelectOption[] = [
    { value: '', label: 'Select type...' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'HOURLY', label: 'Hourly' },
    { value: 'YEARLY', label: 'Yearly' },
];

export function ContractEditForm({
    employee,
    onSubmit,
    onCancel,
    apiError,
    isSubmitting = false,
}: ContractEditFormProps) {
    const fieldErrors = apiError ? getFieldErrors(apiError.details) : {};

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            employmentStatus: employee.employmentStatus ?? '',
            employmentType: employee.employmentType ?? '',
            contractStartDate: employee.contractStartDate
                ? new Date(employee.contractStartDate).toISOString().split('T')[0]
                : '',
            contractEndDate: employee.contractEndDate
                ? new Date(employee.contractEndDate).toISOString().split('T')[0]
                : '',
            grossSalary: employee.grossSalary ? String(employee.grossSalary) : '',
            salaryType: employee.salaryType ?? '',
            payGrade: employee.payGrade ?? '',
        },
    });

    const getError = (field: string) =>
        (errors as Record<string, { message?: string }>)[field]?.message ?? fieldErrors[field];

    const onFormSubmit = async (values: FormValues) => {
        await onSubmit({
            employmentStatus: values.employmentStatus || undefined,
            employmentType: values.employmentType || undefined,
            contractStartDate: values.contractStartDate || undefined,
            contractEndDate: values.contractEndDate || undefined,
            grossSalary: values.grossSalary ? Number(values.grossSalary) : undefined,
            salaryType: values.salaryType || undefined,
            payGrade: values.payGrade || undefined,
        });
    };

    return (
        <Card>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4" noValidate>
                {apiError && !Object.keys(fieldErrors).length && (
                    <div className="rounded-md bg-danger/10 border border-danger/40 px-3 py-2 text-sm text-danger">
                        {apiError.message}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        label="Employment Status"
                        htmlFor="contract-status"
                        error={getError('employmentStatus') ? { message: getError('employmentStatus')! } : undefined}
                    >
                        <Select id="contract-status" options={statusOptions} {...register('employmentStatus')} />
                    </FormField>

                    <FormField
                        label="Employment Type"
                        htmlFor="contract-type"
                        error={getError('employmentType') ? { message: getError('employmentType')! } : undefined}
                    >
                        <Select id="contract-type" options={typeOptions} {...register('employmentType')} />
                    </FormField>

                    <FormField
                        label="Contract Start Date"
                        htmlFor="contract-start"
                        error={getError('contractStartDate') ? { message: getError('contractStartDate')! } : undefined}
                    >
                        <Input id="contract-start" type="date" {...register('contractStartDate')} />
                    </FormField>

                    <FormField
                        label="Contract End Date"
                        htmlFor="contract-end"
                        error={getError('contractEndDate') ? { message: getError('contractEndDate')! } : undefined}
                    >
                        <Input id="contract-end" type="date" {...register('contractEndDate')} />
                    </FormField>

                    <FormField
                        label="Gross Salary"
                        htmlFor="contract-salary"
                        error={getError('grossSalary') ? { message: getError('grossSalary')! } : undefined}
                    >
                        <Input id="contract-salary" type="number" min="0" step="0.01" {...register('grossSalary')} />
                    </FormField>

                    <FormField
                        label="Salary Type"
                        htmlFor="contract-salary-type"
                        error={getError('salaryType') ? { message: getError('salaryType')! } : undefined}
                    >
                        <Select id="contract-salary-type" options={salaryTypeOptions} {...register('salaryType')} />
                    </FormField>

                    <FormField
                        label="Pay Grade"
                        htmlFor="contract-paygrade"
                        error={getError('payGrade') ? { message: getError('payGrade')! } : undefined}
                    >
                        <Input id="contract-paygrade" {...register('payGrade')} />
                    </FormField>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Save Contract Details
                    </Button>
                </div>
            </form>
        </Card>
    );
}

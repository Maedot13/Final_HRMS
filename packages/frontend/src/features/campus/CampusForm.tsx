import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '../../utils/validation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/shared/FormField';
import type { ApiError } from '../../types';
import { getFieldErrors } from '../../utils/apiError';

const createCampusSchema = z.object({
    code: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/i, 'Code: letters, numbers, hyphens, underscores only'),
    name: z.string().min(3, 'Name must be at least 3 characters').max(100),
    description: z.string().max(500).optional().or(z.literal('')),
    employeeIdPrefix: z.string().min(1).max(10).regex(/^[A-Z]+$/i, 'Prefix: uppercase letters only'),
    employeeNumericLength: z.number().min(3).max(6),
    initialAdminEmployeeId: z.string().min(3, 'Admin employee ID required').max(50),
    initialAdminEmail: z.string().email('Valid email required'),
    initialAdminName: z.string().min(2).max(100),
    initialAdminPassword: z.string().min(8).optional().or(z.literal('')),
});

type CreateCampusValues = z.infer<typeof createCampusSchema>;

export interface CampusFormProps {
    onSubmit: (data: {
        code: string;
        name: string;
        description?: string;
        employeeIdPrefix: string;
        employeeNumericLength: number;
        initialAdmin: { employeeId: string; email: string; name: string; password?: string };
    }) => Promise<void>;
    onCancel: () => void;
    apiError?: ApiError | null;
}

export function CampusForm({ onSubmit, onCancel, apiError }: CampusFormProps) {
    const fieldErrors = apiError ? getFieldErrors(apiError.details) : {};

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateCampusValues>({
        resolver: zodResolver(createCampusSchema),
        defaultValues: {
            code: '',
            name: '',
            description: '',
            employeeIdPrefix: 'EMP',
            employeeNumericLength: 4,
            initialAdminEmployeeId: '',
            initialAdminEmail: '',
            initialAdminName: '',
            initialAdminPassword: '',
        },
    });

    const fieldMap: Record<string, string> = {
        initialAdminEmployeeId: 'initialAdmin.employeeId',
        initialAdminEmail: 'initialAdmin.email',
        initialAdminName: 'initialAdmin.name',
        initialAdminPassword: 'initialAdmin.password',
    };
    const getError = (field: string) =>
        (errors as Record<string, { message?: string }>)[field]?.message ??
        fieldErrors[field] ??
        fieldErrors[fieldMap[field]];

    const onFormSubmit = async (values: CreateCampusValues) => {
        await onSubmit({
            code: values.code,
            name: values.name,
            description: values.description || undefined,
            employeeIdPrefix: values.employeeIdPrefix.toUpperCase(),
            employeeNumericLength: values.employeeNumericLength,
            initialAdmin: {
                employeeId: values.initialAdminEmployeeId,
                email: values.initialAdminEmail,
                name: values.initialAdminName,
                password: values.initialAdminPassword || undefined,
            },
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
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Campus code" htmlFor="code" required error={getError('code') ? { message: getError('code')! } : undefined}>
                        <Input id="code" placeholder="e.g. MAIN" {...register('code')} />
                    </FormField>
                    <FormField label="Name" htmlFor="name" required error={{ message: getError('name') } as { message?: string }}>
                        <Input id="name" placeholder="Main Campus" {...register('name')} />
                    </FormField>
                </div>
                <FormField label="Description" htmlFor="description" error={getError('description') ? { message: getError('description')!} : undefined}>
                    <Input id="description" placeholder="Optional" {...register('description')} />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Employee ID prefix" htmlFor="employeeIdPrefix" required error={getError('employeeIdPrefix') ? { message: getError('employeeIdPrefix')!} : undefined}>
                        <Input id="employeeIdPrefix" placeholder="EMP" {...register('employeeIdPrefix')} />
                    </FormField>
                    <FormField label="Employee ID numeric length" htmlFor="employeeNumericLength" required error={getError('employeeNumericLength') ? { message: getError('employeeNumericLength')!} : undefined}>
                        <Input id="employeeNumericLength" type="number" min={3} max={6} {...register('employeeNumericLength', { valueAsNumber: true })} />
                    </FormField>
                </div>
                <hr className="border-[#E5E7EB]" />
                <h4 className="text-sm font-medium text-text-primary">Initial campus admin</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Employee ID" htmlFor="initialAdminEmployeeId" required error={getError('initialAdminEmployeeId') ? { message: getError('initialAdminEmployeeId')!} : undefined}>
                        <Input id="initialAdminEmployeeId" placeholder="e.g. MAIN-00001" {...register('initialAdminEmployeeId')} />
                    </FormField>
                    <FormField label="Email" htmlFor="initialAdminEmail" required error={getError('initialAdminEmail') ? { message: getError('initialAdminEmail')!} : undefined}>
                        <Input id="initialAdminEmail" type="email" placeholder="admin@campus.edu" {...register('initialAdminEmail')} />
                    </FormField>
                </div>
                <FormField label="Full name" htmlFor="initialAdminName" required error={getError('initialAdminName') ? { message: getError('initialAdminName')!} : undefined}>
                    <Input id="initialAdminName" placeholder="Campus Admin" {...register('initialAdminName')} />
                </FormField>
                <FormField label="Temporary password (optional)" htmlFor="initialAdminPassword" hint="Auto-generated if empty" error={getError('initialAdminPassword') ? { message: getError('initialAdminPassword')!} : undefined}>
                    <Input id="initialAdminPassword" type="password" autoComplete="new-password" placeholder="Leave empty to auto-generate" {...register('initialAdminPassword')} />
                </FormField>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Create campus
                    </Button>
                </div>
            </form>
        </Card>
    );
}

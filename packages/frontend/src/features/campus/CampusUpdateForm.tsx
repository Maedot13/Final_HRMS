import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '../../utils/validation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/shared/FormField';
import type { ApiError } from '../../types';
import { getFieldErrors } from '../../utils/apiError';

const updateSchema = z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
});

type UpdateValues = z.infer<typeof updateSchema>;

export interface CampusUpdateFormProps {
    initialValues: { name: string; description?: string | null; isActive: boolean };
    onSubmit: (data: { name?: string; description?: string | null; isActive?: boolean }) => Promise<void>;
    onCancel: () => void;
    apiError?: ApiError | null;
}

export function CampusUpdateForm({ initialValues, onSubmit, onCancel, apiError }: CampusUpdateFormProps) {
    const fieldErrors = apiError ? getFieldErrors(apiError.details) : {};

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<UpdateValues>({
        resolver: zodResolver(updateSchema),
        defaultValues: {
            name: initialValues.name,
            description: initialValues.description ?? '',
            isActive: initialValues.isActive,
        },
    });

    const getError = (field: string) => (errors as Record<string, { message?: string }>)[field]?.message ?? fieldErrors[field];

    const onFormSubmit = async (values: UpdateValues) => {
        await onSubmit({
            name: values.name,
            description: values.description === '' ? null : values.description ?? undefined,
            isActive: values.isActive,
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
                <FormField label="Name" htmlFor="name" error={getError('name') ? { message: getError('name')!} : undefined}>
                    <Input id="name" {...register('name')} />
                </FormField>
                <FormField label="Description" htmlFor="description" error={getError('description') ? { message: getError('description')!} : undefined}>
                    <Input id="description" {...register('description')} />
                </FormField>
                <div className="flex items-center gap-2">
                    <input
                        id="isActive"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        {...register('isActive')}
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-text-primary">
                        Active
                    </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Update campus
                    </Button>
                </div>
            </form>
        </Card>
    );
}

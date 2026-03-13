import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '../../utils/validation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/shared/FormField';
import { UserSearchSelect } from '../../components/shared/UserSearchSelect';
import type { ApiError } from '../../types';
import { getFieldErrors } from '../../utils/apiError';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  headEmployeeId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface DepartmentFormProps {
  campusId: number | string | undefined;
  initialValues?: { name: string; headEmployeeId?: string };
  onSubmit: (data: { name: string; headEmployeeId?: string }) => Promise<void>;
  onCancel: () => void;
  apiError?: ApiError | null;
  submitLabel?: string;
}

export function DepartmentForm({
  campusId,
  initialValues,
  onSubmit,
  onCancel,
  apiError,
  submitLabel = 'Create department',
}: DepartmentFormProps) {
  const fieldErrors = apiError ? getFieldErrors(apiError.details) : {};

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      headEmployeeId: initialValues?.headEmployeeId ?? '',
    },
  });

  const headEmployeeId = watch('headEmployeeId');

  const getError = (field: string) =>
    (errors as Record<string, { message?: string }>)[field]?.message ?? fieldErrors[field];

  const onFormSubmit = async (values: FormValues) => {
    await onSubmit({
      name: values.name,
      headEmployeeId: values.headEmployeeId || undefined,
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
        <FormField label="Name" htmlFor="name" required error={getError('name') ? { message: getError('name')!} : undefined}>
          <Input id="name" placeholder="e.g. Engineering" {...register('name')} />
        </FormField>
        <UserSearchSelect
          campusId={campusId}
          value={headEmployeeId ?? ''}
          onChange={(v) => setValue('headEmployeeId', v)}
          error={getError('headEmployeeId')}
          placeholder="Optional – assign later"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}

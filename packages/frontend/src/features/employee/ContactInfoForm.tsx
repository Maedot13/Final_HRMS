import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '../../utils/validation';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/shared/FormField';
import type { ContactInfo, ApiError } from '../../types';
import { getFieldErrors } from '../../utils/apiError';

const schema = z.object({
    phone: z.string().optional(),
    address: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactRelationship: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function parseContactInfo(info: ContactInfo | null | undefined): FormValues {
    if (!info)
        return {
            phone: '',
            address: '',
            emergencyContactName: '',
            emergencyContactRelationship: '',
            emergencyContactPhone: '',
        };
    const ec =
        typeof info.emergencyContact === 'object' && info.emergencyContact !== null
            ? info.emergencyContact
            : null;
    const obj = ec as { name?: string; relationship?: string; phone?: string } | null;
    return {
        phone: info.phone ?? '',
        address: info.address ?? '',
        emergencyContactName: obj?.name ?? '',
        emergencyContactRelationship: obj?.relationship ?? '',
        emergencyContactPhone: obj?.phone ?? '',
    };
}

export interface ContactInfoFormProps {
    initialContactInfo?: ContactInfo | null;
    onSubmit: (data: ContactInfo) => Promise<void>;
    onCancel: () => void;
    apiError?: ApiError | null;
    isSubmitting?: boolean;
}

export function ContactInfoForm({
    initialContactInfo,
    onSubmit,
    onCancel,
    apiError,
    isSubmitting = false,
}: ContactInfoFormProps) {
    const fieldErrors = apiError ? getFieldErrors(apiError.details) : {};
    const initial = parseContactInfo(initialContactInfo);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: initial,
    });

    const getError = (field: string) =>
        (errors as Record<string, { message?: string }>)[field]?.message ?? fieldErrors[field];

    const onFormSubmit = async (values: FormValues) => {
        const contactInfo: ContactInfo = {
            phone: values.phone || undefined,
            address: values.address || undefined,
        };
        if (values.emergencyContactName || values.emergencyContactRelationship || values.emergencyContactPhone) {
            contactInfo.emergencyContact = {
                name: values.emergencyContactName ?? '',
                relationship: values.emergencyContactRelationship ?? '',
                phone: values.emergencyContactPhone ?? '',
            };
        }
        await onSubmit(contactInfo);
    };

    return (
        <Card>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4" noValidate>
                {apiError && !Object.keys(fieldErrors).length && (
                    <div className="rounded-md bg-danger/10 border border-danger/40 px-3 py-2 text-sm text-danger">
                        {apiError.message}
                    </div>
                )}
                <FormField
                    label="Phone"
                    htmlFor="contact-phone"
                    error={getError('phone') ? { message: getError('phone')! } : undefined}
                >
                    <Input id="contact-phone" placeholder="+251 9XX XXX XXX" {...register('phone')} />
                </FormField>
                <FormField
                    label="Address"
                    htmlFor="contact-address"
                    error={getError('address') ? { message: getError('address')! } : undefined}
                >
                    <Input id="contact-address" placeholder="Street, city, country" {...register('address')} />
                </FormField>
                <div className="border-t border-[#E5E7EB] pt-4">
                    <p className="text-sm font-medium text-text-primary mb-2">Emergency contact</p>
                    <div className="space-y-3">
                        <FormField label="Name" htmlFor="ec-name">
                            <Input id="ec-name" placeholder="Contact name" {...register('emergencyContactName')} />
                        </FormField>
                        <FormField label="Relationship" htmlFor="ec-relationship">
                            <Input id="ec-relationship" placeholder="e.g. Spouse, Parent" {...register('emergencyContactRelationship')} />
                        </FormField>
                        <FormField label="Phone" htmlFor="ec-phone">
                            <Input id="ec-phone" placeholder="+251 9XX XXX XXX" {...register('emergencyContactPhone')} />
                        </FormField>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Save changes
                    </Button>
                </div>
            </form>
        </Card>
    );
}

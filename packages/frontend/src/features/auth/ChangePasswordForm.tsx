import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { z, passwordSchema } from '../../utils/validation';
import apiClient from '../../api/client';
import type { ApiError } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/shared/FormField';
import { useAuthStore } from '../../store/useAuthStore';

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, 'Please confirm your new password'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);
    const storeUser = useAuthStore((state) => state.user);
    const updateUser = useAuthStore((state) => state.updateUser);
    const logout = useAuthStore((state) => state.logout);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (values: ChangePasswordValues) => {
        setFormError(null);
        setSuccessMessage(null);

        try {
            const res = await apiClient.post<{ token: string; refreshToken: string }>('/auth/change-password', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });

            setSuccessMessage('Password changed successfully. You can now continue to the dashboard.');

            // ✅ Update the store with fresh tokens (mustChangePassword: false is now baked in the new JWT)
            const data = (res as any).data?.data ?? (res as any).data;
            if (data?.token && data?.refreshToken && storeUser) {
                setAuth(
                    { ...storeUser, mustChangePassword: false },
                    data.token,
                    data.refreshToken
                );
            } else {
                // Fallback: just patch the user object in the store
                updateUser({ mustChangePassword: false });
            }

            reset({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });

            setTimeout(() => {
                navigate('/', { replace: true });
            }, 800);
        } catch (error: unknown) {
            const err = error as { response?: { data?: ApiError } };
            const apiError = err.response?.data;
            if (apiError?.message) {
                setFormError(apiError.message);
            } else {
                setFormError('Unable to change password. Please verify your current password and try again.');
            }
        }
    };

    return (
        <Card>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                {formError && (
                    <div className="rounded-md bg-danger/10 border border-danger/40 px-3 py-2 text-sm text-danger">
                        {formError}
                    </div>
                )}
                {successMessage && (
                    <div className="rounded-md bg-primary/10 border border-primary/40 px-3 py-2 text-sm text-primary">
                        {successMessage}
                    </div>
                )}
                <FormField
                    label="Current password"
                    htmlFor="currentPassword"
                    required
                    error={errors.currentPassword}
                >
                    <Input
                        id="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        {...register('currentPassword')}
                    />
                </FormField>
                <FormField
                    label="New password"
                    htmlFor="newPassword"
                    required
                    error={errors.newPassword}
                >
                    <Input
                        id="newPassword"
                        type="password"
                        autoComplete="new-password"
                        {...register('newPassword')}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        Must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.
                    </p>
                </FormField>
                <FormField
                    label="Confirm new password"
                    htmlFor="confirmPassword"
                    required
                    error={errors.confirmPassword}
                >
                    <Input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        {...register('confirmPassword')}
                    />
                </FormField>
                <Button type="submit" fullWidth isLoading={isSubmitting}>
                    Change password
                </Button>
                <button
                    type="button"
                    onClick={() => { logout(); navigate('/login', { replace: true }); }}
                    className="w-full text-center text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 mt-1"
                >
                    Back to login
                </button>
            </form>
        </Card>
    );
}


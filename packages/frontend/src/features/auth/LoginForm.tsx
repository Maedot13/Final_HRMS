import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from '../../utils/validation';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import type { ApiError, User } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/shared/FormField';

const loginSchema = z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

interface LocationState {
    from?: { pathname: string };
}

export function LoginForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as LocationState | null)?.from?.pathname || '/';
    const setAuth = useAuthStore((state) => state.setAuth);
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            employeeId: '',
            password: '',
        },
    });

    const onSubmit = async (values: LoginFormValues) => {
        setFormError(null);
        try {
            const response = await apiClient.post<LoginResponse>('/auth/login', values);
            const { accessToken, refreshToken, user } = response.data;

            setAuth(user, accessToken, refreshToken);

            if (user.mustChangePassword) {
                navigate('/force-password-change', { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        } catch (error: any) {
            const apiError = error.response?.data as ApiError | undefined;
            if (apiError?.message) {
                setFormError(apiError.message);
            } else {
                setFormError('Unable to sign in. Please check your credentials and try again.');
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
                <FormField label="Employee ID" htmlFor="employeeId" required error={errors.employeeId}>
                    <Input
                        id="employeeId"
                        autoComplete="username"
                        placeholder="e.g. UNI-000123"
                        {...register('employeeId')}
                    />
                </FormField>
                <FormField label="Password" htmlFor="password" required error={errors.password}>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        {...register('password')}
                    />
                </FormField>
                <Button type="submit" fullWidth isLoading={isSubmitting}>
                    Sign in
                </Button>
            </form>
        </Card>
    );
}


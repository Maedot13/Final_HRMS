import { type ReactNode } from 'react';
import { type FieldError } from 'react-hook-form';

interface FormFieldProps {
    label?: string;
    error?: FieldError;
    hint?: string;
    htmlFor?: string;
    required?: boolean;
    children: ReactNode;
}

/**
 * Wrapper for form fields that shows label, error message, and hint.
 * Integrates with React Hook Form's FieldError.
 */
export function FormField({
    label,
    error,
    hint,
    htmlFor,
    required,
    children,
}: FormFieldProps) {
    const errorMessage = error?.message as string | undefined;

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={htmlFor}
                    className="mb-1 block text-sm font-medium text-text-primary"
                >
                    {label}
                    {required && <span className="text-danger ml-0.5">*</span>}
                </label>
            )}
            {children}
            {errorMessage && (
                <p className="mt-1 text-sm text-danger" role="alert">
                    {errorMessage}
                </p>
            )}
            {hint && !errorMessage && (
                <p className="mt-1 text-xs text-text-secondary">{hint}</p>
            )}
        </div>
    );
}

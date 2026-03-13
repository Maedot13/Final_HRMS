import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftAddon?: React.ReactNode;
    rightAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            hint,
            leftAddon,
            rightAddon,
            id,
            className = '',
            disabled,
            ...props
        },
        ref
    ) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
        const hasAddons = Boolean(leftAddon || rightAddon);

        const inputClasses = [
            'block w-full px-4 py-2 text-sm placeholder:text-text-secondary/70',
            'focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
            hasAddons
                ? 'border-0 rounded-none bg-transparent focus:ring-0'
                : `rounded-input border ${error ? 'border-danger focus:ring-2 focus:ring-danger/50 focus:border-danger' : 'border-[#E5E7EB] focus:ring-2 focus:ring-primary/50 focus:border-primary'}`,
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const inputEl = (
            <input
                ref={ref}
                id={inputId}
                disabled={disabled}
                className={inputClasses}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={
                    [error && `${inputId}-error`, hint && `${inputId}-hint`]
                        .filter(Boolean)
                        .join(' ') || undefined
                }
                {...props}
            />
        );

        const wrappedInput = hasAddons ? (
            <div
                className={`flex rounded-input overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 ${
                    error ? 'border border-danger focus-within:ring-danger/50' : 'border border-[#E5E7EB]'
                }`}
            >
                {leftAddon && (
                    <div className="flex items-center bg-gray-50 px-3 text-text-secondary shrink-0">
                        {leftAddon}
                    </div>
                )}
                <div className="flex-1 min-w-0">{inputEl}</div>
                {rightAddon && (
                    <div className="flex items-center bg-gray-50 px-3 text-text-secondary shrink-0">
                        {rightAddon}
                    </div>
                )}
            </div>
        ) : (
            inputEl
        );

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="mb-1 block text-sm font-medium text-text-primary"
                    >
                        {label}
                    </label>
                )}
                {wrappedInput}
                {error && (
                    <p id={`${inputId}-error`} className="mt-1 text-sm text-danger" role="alert">
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p id={`${inputId}-hint`} className="mt-1 text-xs text-text-secondary">
                        {hint}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

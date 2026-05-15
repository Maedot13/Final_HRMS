import { forwardRef, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            error,
            hint,
            options,
            placeholder = 'Select...',
            id,
            className = '',
            disabled,
            ...props
        },
        ref
    ) => {
        const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="mb-1 block text-sm font-medium text-text-primary"
                    >
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={selectId}
                    disabled={disabled}
                    className={`
                        block w-full rounded-input border border-[#E5E7EB] px-4 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                        disabled:cursor-not-allowed disabled:opacity-60
                        ${error ? 'border-danger focus:ring-danger/50 focus:border-danger' : ''}
                        ${className}
                    `}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={
                        [error && `${selectId}-error`, hint && `${selectId}-hint`]
                            .filter(Boolean)
                            .join(' ') || undefined
                    }
                    {...props}
                >
                    <option value="">{placeholder}</option>
                    {(Array.isArray(options) ? options : []).map((opt) => (
                        <option
                            key={opt.value}
                            value={opt.value}
                            disabled={opt.disabled}
                        >
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p id={`${selectId}-error`} className="mt-1 text-sm text-danger" role="alert">
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p id={`${selectId}-hint`} className="mt-1 text-xs text-text-secondary">
                        {hint}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';

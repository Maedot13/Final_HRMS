import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'info' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        'bg-primary text-white hover:bg-primary/90 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50',
    secondary:
        'bg-gray-100 text-text-primary hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50',
    danger:
        'bg-danger text-white hover:bg-danger/90 focus:ring-2 focus:ring-danger/50 focus:ring-offset-2 disabled:opacity-50',
    info: 'bg-info text-white hover:bg-info/90 focus:ring-2 focus:ring-info/50 focus:ring-offset-2 disabled:opacity-50',
    ghost:
        'bg-transparent text-text-primary hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            fullWidth = false,
            disabled,
            type = 'button',
            className = '',
            children,
            ...props
        },
        ref
    ) => {
        const base =
            'inline-flex items-center justify-center font-medium rounded-button transition-colors duration-150';
        const classes = [
            base,
            variantStyles[variant],
            sizeStyles[size],
            fullWidth ? 'w-full' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                ref={ref}
                type={type}
                className={classes}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                ) : (
                    leftIcon
                )}
                {isLoading ? null : children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';

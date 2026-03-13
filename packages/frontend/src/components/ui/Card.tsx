import { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
};

export function Card({
    padding = 'md',
    className = '',
    children,
    ...props
}: CardProps) {
    const base =
        'rounded-card bg-surface shadow-card border border-[#E5E7EB] overflow-hidden';
    const classes = [base, paddingStyles[padding], className].filter(Boolean).join(' ');

    return (
        <div className={classes} {...props}>
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
    return (
        <div className={`flex items-start justify-between gap-4 ${className}`}>
            <div>
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                {subtitle && (
                    <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

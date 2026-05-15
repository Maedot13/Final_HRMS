import { type HTMLAttributes } from 'react';

/** StatusBadge variant for workflow states (PENDING, APPROVED, REJECTED) */
export type StatusVariant = 'pending' | 'approved' | 'rejected' | 'info';

/** General Badge variant for semantic styling */
export type BadgeVariant = StatusVariant | 'neutral' | 'warning' | 'purple' | 'success' | 'error';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
    pending: 'bg-danger-light text-danger border-danger/30',
    approved: 'bg-primary-light text-primary border-primary/30',
    rejected: 'bg-danger-light text-danger border-danger/30',
    info: 'bg-info-light text-info border-info/30',
    neutral: 'bg-gray-100 text-text-secondary border-gray-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    purple: 'bg-purple-light text-purple border-purple/30',
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
};



export function Badge({
    variant = 'neutral',
    className = '',
    children,
    ...props
}: BadgeProps) {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-medium border';
    const classes = [base, variantStyles[variant], className].filter(Boolean).join(' ');

    return (
        <span className={classes} {...props}>
            {children}
        </span>
    );
}

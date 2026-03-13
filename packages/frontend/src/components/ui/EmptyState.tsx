import { type ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
    /** Optional icon (e.g. react-icons component) */
    icon?: ReactNode;
    /** Primary message */
    title: string;
    /** Secondary description */
    description?: string;
    /** Optional primary action */
    actionLabel?: string;
    /** Called when primary action is clicked */
    onAction?: () => void;
    /** Optional secondary action label */
    secondaryActionLabel?: string;
    /** Called when secondary action is clicked */
    onSecondaryAction?: () => void;
    /** Extra class for the container */
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    className = '',
}: EmptyStateProps) {
    const hasActions = Boolean(actionLabel && onAction) || Boolean(secondaryActionLabel && onSecondaryAction);

    return (
        <div
            className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
        >
            {icon && (
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-text-secondary">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {description && (
                <p className="mt-2 max-w-sm text-sm text-text-secondary">{description}</p>
            )}
            {hasActions && (
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {actionLabel && onAction && (
                        <Button variant="primary" onClick={onAction}>
                            {actionLabel}
                        </Button>
                    )}
                    {secondaryActionLabel && onSecondaryAction && (
                        <Button variant="secondary" onClick={onSecondaryAction}>
                            {secondaryActionLabel}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

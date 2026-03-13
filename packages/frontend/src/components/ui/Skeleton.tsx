import { type HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    /** Optional: fixed width (e.g. "200px", "50%") */
    width?: string | number;
    /** Optional: fixed height (e.g. "20px", "2rem") */
    height?: string | number;
    /** Optional: circular skeleton (for avatars) */
    circle?: boolean;
}

export function Skeleton({
    width,
    height,
    circle = false,
    className = '',
    style,
    ...props
}: SkeletonProps) {
    const base = 'animate-pulse bg-gray-200 rounded';
    const shape = circle ? 'rounded-full' : 'rounded';
    const classes = [base, shape, className].filter(Boolean).join(' ');
    const computedStyle: React.CSSProperties = {
        ...(width !== undefined && { width: typeof width === 'number' ? `${width}px` : width }),
        ...(height !== undefined && { height: typeof height === 'number' ? `${height}px` : height }),
        ...style,
    };

    return <div className={classes} style={computedStyle} aria-hidden {...props} />;
}

import type { ReactNode } from 'react';

interface AuthLayoutProps {
    title?: string;
    subtitle?: string;
    children: ReactNode;
}

export function AuthLayout({ title = 'HR Management System', subtitle, children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
                    {subtitle && (
                        <p className="mt-2 text-sm text-text-secondary">
                            {subtitle}
                        </p>
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}


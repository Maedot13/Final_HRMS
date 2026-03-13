import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    /** Optional footer (e.g. action buttons) */
    footer?: React.ReactNode;
    /** Close on overlay click */
    closeOnOverlayClick?: boolean;
    /** Close on Escape key */
    closeOnEscape?: boolean;
    /** Max width: sm, md, lg, xl, full */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    /** Accessible description for screen readers */
    ariaLabelledby?: string;
    ariaDescribedby?: string;
}

const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
};

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    size = 'md',
    ariaLabelledby,
    ariaDescribedby,
}: ModalProps) {
    const handleEscape = useCallback(
        (e: KeyboardEvent) => {
            if (closeOnEscape && e.key === 'Escape') onClose();
        },
        [closeOnEscape, onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    const content = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledby}
            aria-describedby={ariaDescribedby}
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />
            {/* Panel */}
            <div
                className={`relative w-full ${sizeStyles[size]} rounded-card bg-surface shadow-dropdown overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="border-b border-[#E5E7EB] px-6 py-4">
                        <h2 id={ariaLabelledby} className="text-lg font-semibold text-text-primary">
                            {title}
                        </h2>
                    </div>
                )}
                <div className="px-6 py-4">{children}</div>
                {footer && (
                    <div className="border-t border-[#E5E7EB] px-6 py-4 bg-gray-50 flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}

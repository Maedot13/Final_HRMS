import type { ApiError } from '../types';

/**
 * Extracts user-friendly field errors from VALIDATION_ERROR response details.
 * Supports Zod flatten format: { fieldErrors: { path: string[] } } and
 * nested structures like { path: { _errors: string[] } }.
 */
export function getFieldErrors(details: ApiError['details']): Record<string, string> {
    if (!details || typeof details !== 'object') return {};

    const raw = details as { fieldErrors?: Record<string, string[] | { _errors?: string[] }> };
    const fieldErrors = raw.fieldErrors;
    if (!fieldErrors || typeof fieldErrors !== 'object') return {};

    const result: Record<string, string> = {};
    for (const [path, val] of Object.entries(fieldErrors)) {
        const messages = Array.isArray(val) ? val : (val && typeof val === 'object' && '_errors' in val ? (val as { _errors?: string[] })._errors : null);
        if (Array.isArray(messages) && messages.length > 0) {
            result[path] = messages[0];
        }
    }
    return result;
}

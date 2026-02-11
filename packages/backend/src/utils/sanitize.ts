/**
 * Sanitizes user input to prevent XSS and injection attacks
 * Strips HTML tags and trims whitespace
 */
export const sanitizeInput = (input: string): string => {
    if (!input) return '';

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
};

/**
 * Sanitizes an object's string properties
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
    const sanitized = { ...obj };

    for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = sanitizeInput(sanitized[key]) as any;
        }
    }

    return sanitized;
};

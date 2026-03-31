/**
 * Application-wide constants
 */

export const LEAVE_BALANCES = {
    ANNUAL: 20 as number,
    SICK: 15 as number,
    MATERNITY: 90 as number,
    PATERNITY: 5 as number,
};

export const PAYROLL_CONSTANTS = {
    STANDARD_MONTH_DAYS: 30 as number,
    MINIMUM_FULL_MONTH_DAYS: 28 as number,
};

export const SABBATICAL_RULES = {
    MINIMUM_SERVICE_YEARS: 7 as number,
    COOLDOWN_YEARS: 7 as number,
    MAX_DURATION_MONTHS: 12 as number,
};

export const PAGINATION = {
    DEFAULT_LIMIT: 20 as number,
    MAX_LIMIT: 100 as number,
};

export const RATE_LIMITS = {
    GLOBAL: {
        WINDOW_MS: 15 * 60 * 1000 as number,
        MAX_REQUESTS: 5000 as number, // Increased for test phase
    },
    AUTH: {
        WINDOW_MS: 15 * 60 * 1000 as number,
        // 5 in test, 50 in development (frequent logins during testing), 20 in production
        MAX_REQUESTS: process.env.NODE_ENV === 'test' ? 5 : (process.env.NODE_ENV === 'production' ? 20 : 50) as number,
    },
};

/**
 * Application-wide constants
 */

export const LEAVE_BALANCES = {
    ANNUAL: 20 as number,      // Starting; +1 per year of service up to 30
    SICK: 180 as number,       // 6 months full pay
    MATERNITY: 120 as number,  // 30 prenatal + 90 postnatal
    PATERNITY: 10 as number,   // 10 working days
    PERSONAL: 3 as number,     // 3 working days (marriage/bereavement)
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
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 1000, // Increased for dev
    },
    AUTH: {
        WINDOW_MS: 60 * 60 * 1000, // 1 hour
        MAX_REQUESTS: 300, // Prevent brute force
    },
};

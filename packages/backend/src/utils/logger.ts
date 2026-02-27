import winston from 'winston';

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'info'; // Use info in prod to capture regular logs
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Format for development console (colors, simple)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => {
            const reqId = info.requestId ? `[ReqID: ${info.requestId}] ` : '';
            return `${info.timestamp} ${info.level}: ${reqId}${info.message}`;
        }
    )
);

// Format for production/JSON logging (DataDog, Elastic, CloudWatch)
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // Outputs pure structured JSON
);

const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';

const transports = [
    new winston.transports.Console({
        format: isDevelopment ? consoleFormat : jsonFormat
    }),
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: jsonFormat // Always JSON in files
    }),
    new winston.transports.File({
        filename: 'logs/all.log',
        format: jsonFormat
    }),
];

export const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
});

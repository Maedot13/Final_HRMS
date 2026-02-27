import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import requestId from 'express-request-id';
import swaggerUi from 'swagger-ui-express';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';

// Config & Utils
import { RATE_LIMITS } from './config/constants';
import { swaggerSpec } from './config/swagger';
import { logger } from './utils/logger';
import { sendError, ErrorCode, AppError } from './utils/errorHandler';

// Middleware
import { authenticate, blockIfPasswordChangeRequired } from './middleware/auth.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import leaveRoutes from './routes/leave.routes';
import sabbaticalRoutes from './routes/sabbatical.routes';
import clearanceRoutes from './routes/clearance.routes';
import payrollRoutes from './routes/payroll.routes';
import recruitmentRoutes from './routes/recruitment.routes';
import notificationRoutes from './routes/notification.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/userManagement.routes';
import auditRoutes from './routes/audit.routes';
import campusRoutes from './routes/campus.routes';

// Workers
import './workers/notification.worker';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(requestId()); // Add request ID to all requests
app.use(morgan('dev'));

// Rate Limiting
const globalLimiter = rateLimit({
    windowMs: RATE_LIMITS.GLOBAL.WINDOW_MS,
    limit: RATE_LIMITS.GLOBAL.MAX_REQUESTS,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: RATE_LIMITS.AUTH.WINDOW_MS,
    limit: RATE_LIMITS.AUTH.MAX_REQUESTS,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again later.',
            timestamp: new Date().toISOString()
        }
    }
});

app.use(globalLimiter);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Static Files
app.use('/uploads', express.static('uploads'));

// Health Check
app.get('/health', async (req, res) => {
    const health: any = {
        status: 'OK',
        message: 'Backend is running',
        timestamp: new Date().toISOString(),
        services: {
            database: 'unknown',
            redis: 'unknown'
        }
    };

    try {
        // Check database connection
        const { prisma } = await import('./lib/prisma');
        await prisma.$queryRaw`SELECT 1`;
        health.services.database = 'connected';
    } catch (error) {
        health.services.database = 'disconnected';
        health.status = 'DEGRADED';
    }

    try {
        // Check Redis connection
        const { redis } = await import('./lib/redis');
        await redis.ping();
        health.services.redis = 'connected';
    } catch (error) {
        health.services.redis = 'disconnected';
        health.status = 'DEGRADED';
    }

    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
});

// CSRF Protection
const csrfProtection = csrf({ cookie: true });

// Endpoint to get CSRF token
app.get('/api/v1/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Apply CSRF protection to state-changing routes except in test environment
if (process.env.NODE_ENV !== 'test') {
    app.use('/api/v1/leave', csrfProtection);
    app.use('/api/v1/sabbatical', csrfProtection);
    app.use('/api/v1/clearance', csrfProtection);
    app.use('/api/v1/users', csrfProtection);
}

// Apply stricter rate limiting to auth routes
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/refresh', authLimiter);

// Auth Routes (Public or special auth)
app.use('/api/v1/auth', authRoutes);

// Protected Domain Routes
app.use('/api/v1/employees', authenticate, blockIfPasswordChangeRequired, employeeRoutes);
app.use('/api/v1/leave', authenticate, blockIfPasswordChangeRequired, leaveRoutes);
app.use('/api/v1/sabbatical', authenticate, blockIfPasswordChangeRequired, sabbaticalRoutes);
app.use('/api/v1/clearance', authenticate, blockIfPasswordChangeRequired, clearanceRoutes);
app.use('/api/v1/payroll', authenticate, blockIfPasswordChangeRequired, payrollRoutes);
app.use('/api/v1/recruitment', authenticate, blockIfPasswordChangeRequired, recruitmentRoutes);
app.use('/api/v1/notifications', authenticate, blockIfPasswordChangeRequired, notificationRoutes);
app.use('/api/v1/reports', authenticate, blockIfPasswordChangeRequired, reportRoutes);
app.use('/api/v1/users', authenticate, blockIfPasswordChangeRequired, userRoutes);
app.use('/api/v1/audit-logs', authenticate, blockIfPasswordChangeRequired, auditRoutes);
app.use('/api/v1/campuses', authenticate, blockIfPasswordChangeRequired, campusRoutes);

// Initialize Event Listeners
// (Worker initialized via import above)

// Error Handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`[Error] ${req.method} ${req.url}: ${err.message}`, {
        stack: err.stack,
        // @ts-ignore - injected by express-request-id
        requestId: req.id
    });

    // Handle AppError (Trusted errors)
    if (err instanceof AppError) {
        return sendError(res, err.statusCode, err.code, err.message, err.details, req);
    }

    // Prisma Unique Constraint Error
    if (err.code === 'P2002') {
        const target = err.meta?.target || 'field';
        return sendError(
            res,
            409,
            ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
            `Unique constraint failed on ${target}`,
            null,
            req
        );
    }

    // Prisma Records Not Found
    if (err.code === 'P2025') {
        return sendError(
            res,
            404,
            ErrorCode.NOT_FOUND,
            err.meta?.cause || 'Record not found',
            null,
            req
        );
    }

    // Unknown Errors
    return sendError(
        res,
        500,
        ErrorCode.INTERNAL_ERROR,
        process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        process.env.NODE_ENV === 'production' ? null : err.stack,
        req
    );
});

export default app;


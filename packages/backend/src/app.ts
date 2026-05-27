import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'crypto';
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
import privilegeRoutes from './routes/privilege.routes';
import campusRoutes from './routes/campus.routes';
import departmentRoutes from './routes/department.routes';
import collegeRoutes from './routes/college.routes';
import facultyRoutes from './routes/faculty.routes';
import appraisalRoutes from './routes/appraisal.routes';
import financeRoutes from './routes/finance.routes';
// import attendanceRoutes from './routes/attendance.routes';

// Workers
// import './workers/notification.worker';

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
// ✅ FIXED app.ts
app.use(cors({
    origin: function (origin, callback) {
        const allowed = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim());
        if (!origin || allowed.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use((req: any, _res, next) => { req.id = randomUUID(); next(); }); // Inject request ID
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
const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
});

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
    app.use('/api/v1/evaluations', csrfProtection);
    // app.use('/api/v1/attendance', csrfProtection);
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
app.use('/api/v1/activity-logs', authenticate, blockIfPasswordChangeRequired, auditRoutes); // alias based on spec
app.use('/api/v1/privileges', authenticate, blockIfPasswordChangeRequired, privilegeRoutes);
app.use('/api/v1/campuses', authenticate, blockIfPasswordChangeRequired, campusRoutes);
app.use('/api/v1/colleges', authenticate, blockIfPasswordChangeRequired, collegeRoutes);
app.use('/api/v1/faculties', authenticate, blockIfPasswordChangeRequired, facultyRoutes);
app.use('/api/v1/departments', authenticate, blockIfPasswordChangeRequired, departmentRoutes);
app.use('/api/v1/evaluations', authenticate, blockIfPasswordChangeRequired, appraisalRoutes);
app.use('/api/v1/finance', authenticate, blockIfPasswordChangeRequired, financeRoutes);
// app.use('/api/v1/attendance', authenticate, blockIfPasswordChangeRequired, attendanceRoutes);

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

    // Prisma Connection/Schema Errors
    if (
        err.name === 'PrismaClientInitializationError' ||
        err.code === 'P1001' ||
        err.message?.includes('not exist in the current database') ||
        err.message?.includes('ETIMEDOUT')
    ) {
        return sendError(
            res,
            503,
            ErrorCode.INTERNAL_ERROR,
            'System maintenance: The database is temporarily unreachable or undergoing updates. Please try again later.',
            null,
            req
        );
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

// Render Keep-Alive Ping (prevents free tier sleep)
// Render sleeps after 15 minutes of inactivity. Pinging every 12 minutes keeps it awake.
if (process.env.NODE_ENV !== 'test') {
    const PING_INTERVAL = 12 * 60 * 1000; // 12 minutes
    setInterval(() => {
        const backendUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
        const url = `${backendUrl}/health`;

        logger.info(`[Keep-Alive] Sending ping to ${url}`);

        const client = url.startsWith('https') ? require('https') : require('http');
        client.get(url, (res: any) => {
            if (res.statusCode === 200) {
                logger.info(`[Keep-Alive] Ping successful`);
            } else {
                logger.warn(`[Keep-Alive] Ping returned status ${res.statusCode}`);
            }
        }).on('error', (err: any) => {
            logger.error(`[Keep-Alive] Ping failed: ${err.message}`);
        });
    }, PING_INTERVAL);
}

export default app;


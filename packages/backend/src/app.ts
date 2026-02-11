import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { RATE_LIMITS } from './config/constants';
import requestId from 'express-request-id';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
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
    skipSuccessfulRequests: true,
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

// Routes
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import leaveRoutes from './routes/leave.routes';
import sabbaticalRoutes from './routes/sabbatical.routes';
import clearanceRoutes from './routes/clearance.routes';
import payrollRoutes from './routes/payroll.routes';

// Apply stricter rate limiting to auth routes
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/refresh', authLimiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/sabbatical', sabbaticalRoutes);
app.use('/api/v1/clearance', clearanceRoutes);
app.use('/api/v1/payroll', payrollRoutes);

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Error] ${req.method} ${req.url}:`, err);

    // Prisma Unique Constraint Error
    if (err.code === 'P2002') {
        const target = err.meta?.target || 'field';
        return res.status(400).json({
            message: `Unique constraint failed on ${target}`,
            code: 'UNIQUE_CONSTRAINT_VIOLATION'
        });
    }

    // Prisma Records Not Found
    if (err.code === 'P2025') {
        return res.status(404).json({
            message: err.meta?.cause || 'Record not found',
            code: 'NOT_FOUND'
        });
    }

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({
        message,
        code: err.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
});

export default app;

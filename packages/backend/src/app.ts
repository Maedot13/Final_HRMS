import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
app.use(limiter);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

// Routes
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import leaveRoutes from './routes/leave.routes';
import sabbaticalRoutes from './routes/sabbatical.routes';
import clearanceRoutes from './routes/clearance.routes';
import payrollRoutes from './routes/payroll.routes';

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

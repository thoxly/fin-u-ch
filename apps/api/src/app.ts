import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import promBundle from 'express-prom-bundle';
import { errorHandler } from './middlewares/error';
import { requestIdMiddleware } from './middlewares/request-id';
import { generalApiRateLimit } from './middlewares/rate-limit.middleware';
import logger from './config/logger';
import { swaggerSpec } from './config/swagger';
import prisma from './config/db';
import redis from './config/redis';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import companiesRoutes from './modules/companies/companies.routes';
import articlesRoutes from './modules/catalogs/articles/articles.routes';
import accountsRoutes from './modules/catalogs/accounts/accounts.routes';
import departmentsRoutes from './modules/catalogs/departments/departments.routes';
import counterpartiesRoutes from './modules/catalogs/counterparties/counterparties.routes';
import dealsRoutes from './modules/catalogs/deals/deals.routes';
import operationsRoutes from './modules/operations/operations.routes';
import plansRoutes from './modules/plans/plans.routes';
import budgetsRoutes from './modules/budgets/budgets.routes';
import reportsRoutes from './modules/reports/reports.routes';
import rolesRoutes from './modules/roles/roles.routes';
import auditLogRoutes from './modules/audit/audit.routes';
import demoRoutes from './modules/demo/demo.routes';
import importsRoutes from './modules/imports/imports.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import supportRoutes from './modules/support/support.routes';

const app: Application = express();

// Prometheus metrics middleware (must be before other middleware)
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project: 'fin-u-ch' },
  promClient: {
    collectDefaultMetrics: {},
  },
  metricsPath: '/api/metrics',
});

app.use(metricsMiddleware);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware (must be before request logging)
app.use(requestIdMiddleware);

// General API rate limiting (applied to all API routes)
app.use('/api', generalApiRateLimit);

// Request logging
app.use((req, res, next) => {
  const requestId = (req as any).requestId || 'unknown';
  logger.info(`${req.method} ${req.path}`, { requestId });
  next();
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check with service status
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
    logger.warn('Database health check failed:', error);
  }

  // Check Redis connection
  try {
    const result = await redis.ping();
    if (result === 'PONG') {
      health.services.redis = 'connected';
    } else {
      health.services.redis = 'disconnected';
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.redis = 'disconnected';
    health.status = 'degraded';
    logger.warn('Redis health check failed:', error);
  }

  // Return appropriate status code
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/counterparties', counterpartiesRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/imports', importsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/support', supportRoutes);

// Error handling
app.use(errorHandler);

export default app;
// Force deploy

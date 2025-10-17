import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/error';
import logger from './config/logger';
import { swaggerSpec } from './config/swagger';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import companiesRoutes from './modules/companies/companies.routes';
import articlesRoutes from './modules/catalogs/articles/articles.routes';
import accountsRoutes from './modules/catalogs/accounts/accounts.routes';
import departmentsRoutes from './modules/catalogs/departments/departments.routes';
import counterpartiesRoutes from './modules/catalogs/counterparties/counterparties.routes';
import dealsRoutes from './modules/catalogs/deals/deals.routes';
import salariesRoutes from './modules/catalogs/salaries/salaries.routes';
import operationsRoutes from './modules/operations/operations.routes';
import plansRoutes from './modules/plans/plans.routes';
import reportsRoutes from './modules/reports/reports.routes';
import demoRoutes from './modules/demo/demo.routes';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
app.use('/api/salaries', salariesRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/demo', demoRoutes);

// Error handling
app.use(errorHandler);

export default app;

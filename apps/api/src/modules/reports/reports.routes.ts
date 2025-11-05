import { Router } from 'express';
import dashboardRoutes from './dashboard/dashboard.routes';
import cashflowRoutes from './cashflow/cashflow.routes';
import bddsRoutes from './bdds/bdds.routes';
import planfactRoutes from './planfact/planfact.routes';
import cacheRoutes from './cache/cache.routes';

const router: Router = Router();

router.use('/dashboard', dashboardRoutes);
router.use('/cashflow', cashflowRoutes);
router.use('/bdds', bddsRoutes);
router.use('/planfact', planfactRoutes);
router.use('/cache', cacheRoutes);

export default router;

import { Router } from 'express';
import dashboardRoutes from './dashboard/dashboard.routes';
import cashflowRoutes from './cashflow/cashflow.routes';
import bddsRoutes from './bdds/bdds.routes';
import planfactRoutes from './planfact/planfact.routes';
import ddsRoutes from './dds/dds.routes';

const router: Router = Router();

router.use('/dashboard', dashboardRoutes);
router.use('/cashflow', cashflowRoutes);
router.use('/bdds', bddsRoutes);
router.use('/planfact', planfactRoutes);
router.use('/dds', ddsRoutes);

export default router;

import { Router } from 'express';
import { DataVisualizationController } from '../controllers/dataVisualizationController';
import { adminOnly } from '../middleware/admin';
import { authenticate } from '../middleware/auth';

const router = Router();
const dataVisualizationController = new DataVisualizationController();

// All routes require admin authentication
router.use(authenticate);
router.use(adminOnly);

// Dashboard statistics
router.get('/dashboard-stats', dataVisualizationController.getDashboardStats.bind(dataVisualizationController));

export default router;

import { Router } from 'express';
import { AIModelController } from '../controllers/aiModelController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';

const router = Router();

// Public routes
router.get('/active', AIModelController.getActiveModels);

// Admin routes
router.get('/', authenticate, adminOnly, AIModelController.getAllModels);
router.get('/:id', authenticate, adminOnly, AIModelController.getModelById);
router.post('/', authenticate, adminOnly, AIModelController.createModel);
router.put('/:id', authenticate, adminOnly, AIModelController.updateModel);
router.delete('/:id', authenticate, adminOnly, AIModelController.deleteModel);
router.patch('/:id/toggle-status', authenticate, adminOnly, AIModelController.toggleModelStatus);
router.patch('/:id/set-default', authenticate, adminOnly, AIModelController.setDefaultModel);

export default router;

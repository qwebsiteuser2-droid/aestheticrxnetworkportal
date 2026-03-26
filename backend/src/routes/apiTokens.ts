import { Router } from 'express';
import { APITokenController } from '../controllers/apiTokenController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';

const router = Router();

// Admin routes
router.get('/', authenticate, adminOnly, APITokenController.getAllTokens);
router.get('/:id', authenticate, adminOnly, APITokenController.getTokenById);
router.post('/', authenticate, adminOnly, APITokenController.createToken);
router.put('/:id', authenticate, adminOnly, APITokenController.updateToken);
router.delete('/:id', authenticate, adminOnly, APITokenController.deleteToken);
router.patch('/:id/toggle-status', authenticate, adminOnly, APITokenController.toggleTokenStatus);
router.patch('/:id/set-default', authenticate, adminOnly, APITokenController.setDefaultToken);
router.post('/:id/validate', authenticate, adminOnly, APITokenController.validateToken);

export default router;

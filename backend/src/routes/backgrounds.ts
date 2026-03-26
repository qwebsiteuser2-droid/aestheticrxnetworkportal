import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import {
  getAllBackgrounds,
  getActiveBackground,
  createBackground,
  updateBackground,
  deleteBackground,
  activateBackground,
  deactivateBackground,
  uploadBackgroundImage
} from '../controllers/backgroundController';

const router = Router();

// Public endpoint to get active background
router.get('/active', getActiveBackground);

// Admin endpoints
router.get('/admin', authenticate, adminOnly, getAllBackgrounds);
router.post('/admin', authenticate, adminOnly, createBackground);
router.put('/admin/:id', authenticate, adminOnly, updateBackground);
router.delete('/admin/:id', authenticate, adminOnly, deleteBackground);
router.post('/admin/:id/activate', authenticate, adminOnly, activateBackground);
router.post('/admin/:id/deactivate', authenticate, adminOnly, deactivateBackground);
router.post('/upload', authenticate, adminOnly, uploadBackgroundImage);

export default router;

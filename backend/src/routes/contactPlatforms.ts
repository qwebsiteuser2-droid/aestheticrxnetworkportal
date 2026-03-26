import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { 
  getAllContactPlatforms, 
  getAdminContactPlatforms, 
  createContactPlatform, 
  updateContactPlatform, 
  deleteContactPlatform 
} from '../controllers/contactPlatformController';

const router = Router();

// Public endpoint to get active contact platforms
router.get('/', getAllContactPlatforms);

// Admin endpoints
router.get('/admin', authenticate, adminOnly, getAdminContactPlatforms);
router.post('/admin', authenticate, adminOnly, createContactPlatform);
router.put('/admin/:id', authenticate, adminOnly, updateContactPlatform);
router.delete('/admin/:id', authenticate, adminOnly, deleteContactPlatform);

export default router;

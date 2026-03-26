import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { getContactInfo, updateContactInfo, getContactInfoForAdmin } from '../controllers/contactInfoController';

const router = Router();

// Public route
router.get('/', getContactInfo);

// Admin routes
router.get('/admin', authenticate, adminOnly, getContactInfoForAdmin);
router.put('/admin', authenticate, adminOnly, updateContactInfo);

export default router;

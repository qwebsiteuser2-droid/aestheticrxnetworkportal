import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import {
  getAllBadges,
  getUserBadges,
  createBadge,
  updateBadge,
  deleteBadge
} from '../controllers/badgeController';

const router = Router();

// Get badges for a specific user (public - for profile display)
router.get('/user/:userId', getUserBadges);

// All admin routes require authentication and admin access
router.use(authenticate);
router.use(adminOnly);

// Get all badges
router.get('/', getAllBadges);

// Create a new badge
router.post('/', createBadge);

// Update a badge
router.put('/:id', updateBadge);

// Delete a badge
router.delete('/:id', deleteBadge);

export default router;


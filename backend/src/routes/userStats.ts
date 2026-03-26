import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getUserStats, updateUserProfile } from '../controllers/userStatsController';

const router = Router();

// Get user statistics (public - no auth required for viewing)
router.get('/:id', getUserStats);

// Update user profile (requires authentication - only admins or profile owner can update)
router.put('/:id', authenticate, updateUserProfile);

export default router;

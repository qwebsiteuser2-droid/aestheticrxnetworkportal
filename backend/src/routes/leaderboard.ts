import { Router } from 'express';
import { getLeaderboard, getUserLeaderboardPosition, getLeaderboardSettings } from '../controllers/leaderboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public leaderboard route
router.get('/', getLeaderboard);

// Authenticated user position route
router.get('/position', authenticate, getUserLeaderboardPosition);

// Admin leaderboard settings route
router.get('/settings', authenticate, getLeaderboardSettings);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';
import { sendMessages, getUsersWithTierProgress } from '../controllers/messageController';

const router = Router();

// Send messages to users (admin only)
router.post('/send-messages', authenticate, adminOnly, sendMessages);

// Get users with tier progress information (admin only)
router.get('/users-with-progress', authenticate, adminOnly, getUsersWithTierProgress);

export default router;

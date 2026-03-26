import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user's notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.put('/read-all', markAllAsRead);

// Mark specific notification as read
router.put('/:id/read', markAsRead);

export default router;


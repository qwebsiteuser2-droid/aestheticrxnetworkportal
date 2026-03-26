import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  acceptConversation,
} from '../controllers/conversationController';

const router = Router();

// All conversation routes require authentication
router.use(authenticate);

// Conversation routes
router.post('/', createConversation);
router.get('/', getConversations);
router.get('/unread-count', getUnreadCount);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);
router.put('/:id/read', markAsRead);
router.put('/:id/accept', acceptConversation); // Doctor accepts appointment request

export default router;


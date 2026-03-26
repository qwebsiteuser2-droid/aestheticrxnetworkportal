import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { sendContactMessage, getAllContactMessages } from '../controllers/contactController';

const router = Router();

// User routes
router.post('/', authenticate, sendContactMessage);

// Admin routes
router.get('/', authenticate, adminOnly, getAllContactMessages);

export default router;

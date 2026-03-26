import { Router } from 'express';
import { showUnsubscribePage, processUnsubscribe, processResubscribe } from '../controllers/unsubscribeController';

const router = Router();

// GET /api/unsubscribe/:userId/:token - Show unsubscribe page
router.get('/:userId/:token', showUnsubscribePage);

// POST /api/unsubscribe/:userId/:token - Process unsubscribe
router.post('/:userId/:token', processUnsubscribe);

// POST /api/unsubscribe/resubscribe/:userId/:token - Process resubscribe
router.post('/resubscribe/:userId/:token', processResubscribe);

export default router;


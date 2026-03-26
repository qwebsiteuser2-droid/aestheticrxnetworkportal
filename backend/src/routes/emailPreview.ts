import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';
import { generateEmailPreview, sendTestEmail } from '../controllers/emailPreviewController';

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.post('/email-preview', generateEmailPreview);
router.post('/send-test-email', sendTestEmail);

export default router;

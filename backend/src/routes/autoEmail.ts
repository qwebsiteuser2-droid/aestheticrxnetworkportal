import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { setupAutoEmail, getAutoEmailConfig, checkAndSendAutoEmails } from '../controllers/autoEmailController';

const router = Router();

// Setup automatic email configuration
router.post('/setup-auto-email', authenticate, adminOnly, setupAutoEmail);

// Get automatic email configuration
router.get('/auto-email-config', authenticate, adminOnly, getAutoEmailConfig);

// Manual trigger for auto emails (for testing)
router.post('/trigger-auto-emails', authenticate, adminOnly, async (req, res) => {
  try {
    await checkAndSendAutoEmails();
    res.json({ message: 'Auto email check completed' });
  } catch (error: unknown) {
    console.error('Error triggering auto emails:', error);
    res.status(500).json({ message: 'Failed to trigger auto emails' });
  }
});

export default router;

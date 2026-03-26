import { Router } from 'express';
import { AIResearchController } from '../controllers/aiResearchController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Generate research content using AI
router.post('/generate', authenticate, AIResearchController.generateResearchContent);

// Generate streaming research content using AI
router.post('/generate-stream', authenticate, AIResearchController.generateStreamingContent);

// Get quota status for current user
router.get('/quota-status', authenticate, AIResearchController.getQuotaStatus);

// Reset quota (admin only)
router.post('/reset-quota', authenticate, AIResearchController.resetQuota);

// Get research suggestions (public)
router.get('/suggestions', AIResearchController.getResearchSuggestions);

export default router;

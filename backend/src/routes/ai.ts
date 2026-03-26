import express from 'express';
import { generateAIContent } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// AI content generation endpoint
router.post('/generate', authenticate, generateAIContent);

export default router;

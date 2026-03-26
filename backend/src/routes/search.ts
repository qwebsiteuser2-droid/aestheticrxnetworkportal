import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { search } from '../controllers/searchController';

const router = Router();

// Search endpoint
router.get('/', authenticate, search);

export default router;

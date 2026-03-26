import { Router } from 'express';
import {
  getResearchPapers,
  getTopResearchPapers,
  getUserResearchPapers,
  getResearchPaperById,
  getUserResearchPaperById,
  createResearchPaper,
  trackResearchPaperView,
  upvoteResearchPaper,
  removeUpvote,
  getResearchPaperAnalytics,
  reportResearchPaper,
  downloadResearchPaperPDF
} from '../controllers/researchController';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/admin';
import multer from 'multer';

// Configure multer for PDF uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

const router = Router();

// Public routes (no authentication required)
router.get('/', getResearchPapers);
router.get('/top', getTopResearchPapers);

// Protected routes (authentication required)
router.get('/my', authenticate, getUserResearchPapers);
router.get('/my/:id', authenticate, getUserResearchPaperById); // Allow users to view their own papers (including pending)

// Public routes with parameters (must come after specific routes)
router.get('/:id', getResearchPaperById);
router.get('/:id/download', downloadResearchPaperPDF);
router.post('/', authenticate, upload.single('pdf'), createResearchPaper);
router.post('/:id/upvote', authenticate, upvoteResearchPaper);
router.delete('/:id/upvote', authenticate, removeUpvote);
router.post('/:id/report', authenticate, reportResearchPaper);

// View tracking (no authentication required)
router.post('/:id/view', trackResearchPaperView);

// Admin routes
router.get('/:id/analytics', authenticate, adminOnly, getResearchPaperAnalytics);

export default router;
